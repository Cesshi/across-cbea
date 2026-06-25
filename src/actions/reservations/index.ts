'use server';

import type { DayPattern } from '@/lib/constants';
import { DAY_PATTERN_MAP } from '@/lib/constants';
import { prisma } from '@/lib/prisma';
import { type Prisma } from '@prisma/client';
import { revalidatePath } from 'next/cache';

// Derived from Prisma's generated types — automatically stays in sync with schema changes
export type CreateReservationInput = Omit<
  Prisma.ReservationCreateInput,
  'id' | 'created_at' | 'action_at'
>;
export type UpdateReservationInput = Prisma.ReservationUpdateInput;

export type ConflictResult = {
  room: string;
  day: string;
  start_time: string;
  end_time: string;
  existing: { prof: string; course_code: string; section: string };
  incoming: { prof: string; course_code: string; section: string };
};

/* ─── CRUD ─── */

export async function getReservations(query?: string) {
  return prisma.reservation.findMany({
    where: query
      ? {
          OR: [
            { prof: { contains: query, mode: 'insensitive' } },
            { course_code: { contains: query, mode: 'insensitive' } },
            { course_title: { contains: query, mode: 'insensitive' } },
            { course: { contains: query, mode: 'insensitive' } },
            { section: { contains: query, mode: 'insensitive' } },
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
              { course_code: { contains: query, mode: 'insensitive' } },
              { course_title: { contains: query, mode: 'insensitive' } },
              { course: { contains: query, mode: 'insensitive' } },
              { section: { contains: query, mode: 'insensitive' } },
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
    orderBy: [{ room: 'asc' }, { day: 'asc' }, { start_time: 'asc' }],
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

export type ImportRow = Omit<CreateReservationInput, 'status'>;

export type ImportPreviewRow = ImportRow & {
  hasConflict: boolean;
  conflicting?: { prof: string; course_code: string; section: string };
};

/**
 * Preview import rows — checks each for conflicts without inserting.
 */
export async function previewImport(rows: ImportRow[]): Promise<ImportPreviewRow[]> {
  const results: ImportPreviewRow[] = [];

  for (const row of rows) {
    const { hasConflict, conflicting } = await detectConflict(
      row.room,
      row.day,
      row.start_time,
      row.end_time
    );
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
    const { hasConflict } = await detectConflict(row.room, row.day, row.start_time, row.end_time);
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

/* ─── Helpers ─── */

function expandDays(day: string): string[] {
  return DAY_PATTERN_MAP[day as DayPattern] ?? [day];
}

function daysOverlap(dayA: string, dayB: string): boolean {
  const a = expandDays(dayA);
  const b = expandDays(dayB);
  return a.some((d) => b.includes(d));
}

function parseTimeToMinutes(t: string): number {
  const trimmed = t.trim();
  // HH:MM (24-hour) — from type="time" inputs
  const hhmm = trimmed.match(/^(\d{1,2}):(\d{2})$/);
  if (hhmm) return parseInt(hhmm[1]) * 60 + parseInt(hhmm[2]);
  // H:MM AM/PM (12-hour) — legacy format
  const ampm = trimmed.match(/^(\d+):(\d+)\s*(AM|PM)$/i);
  if (ampm) {
    let h = parseInt(ampm[1]);
    const m = parseInt(ampm[2]);
    const period = ampm[3].toUpperCase();
    if (period === 'PM' && h !== 12) h += 12;
    if (period === 'AM' && h === 12) h = 0;
    return h * 60 + m;
  }
  return 0;
}

function timeRangesOverlap(startA: string, endA: string, startB: string, endB: string): boolean {
  return (
    parseTimeToMinutes(startA) < parseTimeToMinutes(endB) &&
    parseTimeToMinutes(endA) > parseTimeToMinutes(startB)
  );
}

/* ─── Conflict Detection ─── */

export async function detectConflict(
  room: string,
  day: string,
  start_time: string,
  end_time: string,
  excludeId?: string
): Promise<{
  hasConflict: boolean;
  conflicting?: { prof: string; course_code: string; section: string };
}> {
  const existing = await prisma.reservation.findMany({
    where: {
      room,
      status: 'approved',
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
    select: {
      id: true,
      day: true,
      start_time: true,
      end_time: true,
      prof: true,
      course_code: true,
      section: true,
    },
  });

  const conflict = existing.find(
    (r) =>
      daysOverlap(r.day, day) && timeRangesOverlap(r.start_time, r.end_time, start_time, end_time)
  );

  if (conflict) {
    return {
      hasConflict: true,
      conflicting: {
        prof: conflict.prof,
        course_code: conflict.course_code,
        section: conflict.section,
      },
    };
  }

  return { hasConflict: false };
}

export async function detectAllConflicts(): Promise<ConflictResult[]> {
  const approved = await prisma.reservation.findMany({
    where: { status: 'approved' },
    select: {
      id: true,
      room: true,
      day: true,
      start_time: true,
      end_time: true,
      prof: true,
      course_code: true,
      section: true,
    },
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
        timeRangesOverlap(a.start_time, a.end_time, b.start_time, b.end_time)
      ) {
        const key = [a.id, b.id].sort().join('-');
        if (!seen.has(key)) {
          seen.add(key);
          conflicts.push({
            room: a.room,
            day: a.day,
            start_time: a.start_time,
            end_time: a.end_time,
            existing: { prof: a.prof, course_code: a.course_code, section: a.section },
            incoming: { prof: b.prof, course_code: b.course_code, section: b.section },
          });
        }
      }
    }
  }

  return conflicts;
}
