'use server';

import { prisma } from '@/lib/prisma';
import { DAY_PATTERN_MAP } from '@/lib/constants';
import type { DayPattern } from '@/lib/constants';
import { revalidatePath } from 'next/cache';

export type CreateReservationInput = {
  prof: string;
  subj: string;
  group: string;
  email?: string | null;
  room: string;
  day: string;
  time_slot: string;
  notes?: string | null;
  status?: string;
};

export type UpdateReservationInput = Partial<CreateReservationInput>;

export type ConflictResult = {
  room: string;
  day: string;
  time_slot: string;
  existing: { prof: string; subj: string; group: string };
  incoming: { prof: string; subj: string; group: string };
};

/* ─── Helpers ─── */

/**
 * Expand a day pattern (e.g. "MWF") into individual day names.
 * Falls back to the raw value if not in the map.
 */
function expandDays(day: string): string[] {
  return DAY_PATTERN_MAP[day as DayPattern] ?? [day];
}

/**
 * Check if two day patterns share at least one overlapping day.
 */
function daysOverlap(dayA: string, dayB: string): boolean {
  const a = expandDays(dayA);
  const b = expandDays(dayB);
  return a.some((d) => b.includes(d));
}

/**
 * Returns true when two time slots conflict (exact match — 30-min slots don't partially overlap).
 */
function timeSlotsConflict(slotA: string, slotB: string): boolean {
  return slotA.trim() === slotB.trim();
}

/* ─── Conflict Detection ─── */

/**
 * Find existing approved reservations that conflict with the given booking.
 * Excludes a reservation by ID when checking edits (excludeId).
 */
export async function detectConflict(
  room: string,
  day: string,
  time_slot: string,
  excludeId?: string
): Promise<{ hasConflict: boolean; conflicting?: { prof: string; subj: string; group: string } }> {
  const existing = await prisma.reservation.findMany({
    where: {
      room,
      status: 'approved',
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
    select: { id: true, day: true, time_slot: true, prof: true, subj: true, group: true },
  });

  const conflict = existing.find(
    (r) => daysOverlap(r.day, day) && timeSlotsConflict(r.time_slot, time_slot)
  );

  if (conflict) {
    return {
      hasConflict: true,
      conflicting: { prof: conflict.prof, subj: conflict.subj, group: conflict.group },
    };
  }

  return { hasConflict: false };
}

/**
 * Detect all double-booking conflicts among currently approved reservations.
 * Used for the admin dashboard conflicts table.
 */
export async function detectAllConflicts(): Promise<ConflictResult[]> {
  const approved = await prisma.reservation.findMany({
    where: { status: 'approved' },
    select: { id: true, room: true, day: true, time_slot: true, prof: true, subj: true, group: true },
    orderBy: { created_at: 'asc' },
  });

  const conflicts: ConflictResult[] = [];
  const seen = new Set<string>();

  for (let i = 0; i < approved.length; i++) {
    for (let j = i + 1; j < approved.length; j++) {
      const a = approved[i];
      const b = approved[j];
      if (
        a.room === b.room &&
        daysOverlap(a.day, b.day) &&
        timeSlotsConflict(a.time_slot, b.time_slot)
      ) {
        const key = [a.id, b.id].sort().join('-');
        if (!seen.has(key)) {
          seen.add(key);
          conflicts.push({
            room: a.room,
            day: a.day,
            time_slot: a.time_slot,
            existing: { prof: a.prof, subj: a.subj, group: a.group },
            incoming: { prof: b.prof, subj: b.subj, group: b.group },
          });
        }
      }
    }
  }

  return conflicts;
}

/* ─── CRUD ─── */

export async function getReservations(query?: string) {
  return prisma.reservation.findMany({
    where: query
      ? {
          OR: [
            { prof: { contains: query, mode: 'insensitive' } },
            { subj: { contains: query, mode: 'insensitive' } },
            { group: { contains: query, mode: 'insensitive' } },
            { room: { contains: query, mode: 'insensitive' } },
          ],
        }
      : undefined,
    orderBy: { created_at: 'desc' },
  });
}

export async function getReservationsByStatus(status: string, query?: string) {
  return prisma.reservation.findMany({
    where: {
      status,
      ...(query
        ? {
            OR: [
              { prof: { contains: query, mode: 'insensitive' } },
              { subj: { contains: query, mode: 'insensitive' } },
              { group: { contains: query, mode: 'insensitive' } },
              { room: { contains: query, mode: 'insensitive' } },
            ],
          }
        : {}),
    },
    orderBy: { created_at: 'desc' },
  });
}

export async function getApprovedReservations() {
  return prisma.reservation.findMany({
    where: { status: 'approved' },
    orderBy: [{ room: 'asc' }, { day: 'asc' }, { time_slot: 'asc' }],
  });
}

export async function getPendingCount(): Promise<number> {
  return prisma.reservation.count({ where: { status: 'pending' } });
}

export async function getReservation(id: string) {
  return prisma.reservation.findUnique({ where: { id } });
}

export async function createReservation(data: CreateReservationInput) {
  const reservation = await prisma.reservation.create({ data });
  revalidatePath('/reservations');
  revalidatePath('/requests');
  revalidatePath('/schedule');
  revalidatePath('/dashboard');
  return reservation;
}

export async function updateReservation(id: string, data: UpdateReservationInput) {
  const reservation = await prisma.reservation.update({ where: { id }, data });
  revalidatePath('/reservations');
  revalidatePath('/requests');
  revalidatePath('/schedule');
  revalidatePath('/dashboard');
  return reservation;
}

export async function deleteReservation(id: string) {
  await prisma.reservation.delete({ where: { id } });
  revalidatePath('/reservations');
  revalidatePath('/requests');
  revalidatePath('/schedule');
  revalidatePath('/dashboard');
}

/* ─── Approve / Reject ─── */

export async function approveReservation(id: string) {
  const reservation = await prisma.reservation.update({
    where: { id },
    data: { status: 'approved', action_at: new Date() },
  });
  revalidatePath('/requests');
  revalidatePath('/reservations');
  revalidatePath('/schedule');
  revalidatePath('/dashboard');
  return reservation;
}

export async function rejectReservation(id: string) {
  const reservation = await prisma.reservation.update({
    where: { id },
    data: { status: 'rejected', action_at: new Date() },
  });
  revalidatePath('/requests');
  revalidatePath('/reservations');
  revalidatePath('/dashboard');
  return reservation;
}

/* ─── Batch Import ─── */

export type ImportRow = {
  prof: string;
  subj: string;
  group: string;
  email?: string | null;
  room: string;
  day: string;
  time_slot: string;
  notes?: string | null;
};

export type ImportPreviewRow = ImportRow & {
  hasConflict: boolean;
  conflicting?: { prof: string; subj: string; group: string };
};

/**
 * Preview import rows — checks each for conflicts without inserting.
 */
export async function previewImport(rows: ImportRow[]): Promise<ImportPreviewRow[]> {
  const results: ImportPreviewRow[] = [];

  for (const row of rows) {
    const { hasConflict, conflicting } = await detectConflict(row.room, row.day, row.time_slot);
    results.push({ ...row, hasConflict, conflicting });
  }

  return results;
}

/**
 * Batch insert approved rows. Skips conflicting rows.
 * Returns counts of inserted and skipped rows.
 */
export async function batchImport(
  rows: ImportRow[]
): Promise<{ inserted: number; skipped: number }> {
  let inserted = 0;
  let skipped = 0;

  for (const row of rows) {
    const { hasConflict } = await detectConflict(row.room, row.day, row.time_slot);
    if (hasConflict) {
      skipped++;
      continue;
    }
    await prisma.reservation.create({ data: { ...row, status: 'approved' } });
    inserted++;
  }

  revalidatePath('/reservations');
  revalidatePath('/schedule');
  revalidatePath('/dashboard');

  return { inserted, skipped };
}

/* ─── Danger Zone ─── */

export async function clearAllReservations(): Promise<{ count: number }> {
  const { count } = await prisma.reservation.deleteMany();
  revalidatePath('/reservations');
  revalidatePath('/requests');
  revalidatePath('/schedule');
  revalidatePath('/dashboard');
  return { count };
}
