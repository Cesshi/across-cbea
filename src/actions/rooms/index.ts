'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export type CreateRoomInput = {
  name: string;
  type: string;
  capacity: number;
  floor?: string | null;
  is_active?: boolean;
};

export type UpdateRoomInput = Partial<CreateRoomInput>;

export async function getRooms(query?: string) {
  return prisma.room.findMany({
    where: query
      ? {
          OR: [
            { name: { contains: query, mode: 'insensitive' } },
            { type: { contains: query, mode: 'insensitive' } },
            { floor: { contains: query, mode: 'insensitive' } },
          ],
        }
      : undefined,
    orderBy: [{ floor: 'asc' }, { name: 'asc' }],
  });
}

export async function getRoom(id: string) {
  return prisma.room.findUnique({ where: { id } });
}

export async function getRoomByName(name: string) {
  return prisma.room.findUnique({ where: { name } });
}

export async function createRoom(data: CreateRoomInput) {
  const room = await prisma.room.create({ data });
  revalidatePath('/rooms');
  return room;
}

export async function updateRoom(id: string, data: UpdateRoomInput) {
  const existing = await prisma.room.findUnique({ where: { id }, select: { name: true } });
  if (!existing) throw new Error('Room not found');

  const room = await prisma.room.update({ where: { id }, data });

  // Cascade name change to all reservations that reference this room
  if (data.name && data.name !== existing.name) {
    await prisma.reservation.updateMany({
      where: { room: existing.name },
      data: { room: data.name },
    });
  }

  revalidatePath('/rooms');
  revalidatePath('/reservations');
  revalidatePath('/schedule');
  return room;
}

export async function deleteRoom(id: string) {
  const room = await prisma.room.findUnique({ where: { id }, select: { name: true } });
  if (!room) throw new Error('Room not found');

  // Cascade delete reservations for this room
  await prisma.reservation.deleteMany({ where: { room: room.name } });
  await prisma.room.delete({ where: { id } });

  revalidatePath('/rooms');
  revalidatePath('/reservations');
  revalidatePath('/schedule');
}

export async function toggleRoomStatus(id: string, current: boolean) {
  const room = await prisma.room.update({
    where: { id },
    data: { is_active: !current },
  });
  revalidatePath('/rooms');
  return room;
}
