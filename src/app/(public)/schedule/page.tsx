'use client';

import { useApprovedReservations } from '@/components/hooks/use-reservations';
import { useRooms } from '@/components/hooks/use-rooms';
import { DAY_PATTERN_MAP, SCHEDULE_DAYS, formatTime, type DayPattern } from '@/lib/constants';
import type { Reservation } from '@prisma/client';
import { CalendarDays } from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState } from 'react';

export default function SchedulePage() {
  const { data: reservations = [], isPending } = useApprovedReservations();
  const { data: rooms = [] } = useRooms();
  const [roomFilter, setRoomFilter] = useState('');
  const [tooltip, setTooltip] = useState<{ r: Reservation; x: number; y: number } | null>(null);

  const dayMap = useMemo(
    () => buildDayMap(reservations as Reservation[], roomFilter),
    [reservations, roomFilter]
  );

  const roomOptions = rooms.map((r) => r.name);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-gray-200 bg-white/90 backdrop-blur dark:border-gray-800 dark:bg-gray-900/90">
        <div className="mx-auto flex max-w-screen-2xl items-center justify-between gap-4 px-4 py-3 md:px-6">
          <div className="flex items-center gap-2">
            <CalendarDays size={20} className="text-brand-500" />
            <span className="text-sm font-semibold text-gray-900 dark:text-white">
              Weekly Schedule — MMSU CBEA
            </span>
          </div>

          <div className="flex items-center gap-3">
            <select
              value={roomFilter}
              onChange={(e) => setRoomFilter(e.target.value)}
              className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-500/30 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
            >
              <option value="">All Rooms</option>
              {roomOptions.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
            <Link
              href="/signin"
              className="rounded-lg bg-brand-500 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-brand-600"
            >
              Login
            </Link>
          </div>
        </div>
      </header>

      {/* Legend */}
      <div className="mx-auto max-w-screen-2xl px-4 pt-4 pb-2 md:px-6">
        <div className="flex items-center gap-4 text-xs text-gray-500">
          <span className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-sm bg-brand-100 dark:bg-brand-500/20" />
            Approved schedules
          </span>
          <span>Hover a card to see details</span>
          {roomFilter && (
            <button
              onClick={() => setRoomFilter('')}
              className="text-brand-500 underline hover:no-underline"
            >
              Clear filter
            </button>
          )}
        </div>
      </div>

      {/* Schedule columns */}
      <div className="mx-auto max-w-screen-2xl overflow-x-auto px-4 pb-8 md:px-6">
        {isPending ? (
          <div className="flex h-64 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
          </div>
        ) : (
          <div className="grid min-w-225 grid-cols-6 gap-2">
            {SCHEDULE_DAYS.map((day) => (
              <div key={day}>
                <div className="mb-2 rounded-lg bg-gray-100 px-2 py-1.5 text-center text-xs font-semibold text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                  {day.slice(0, 3)}
                </div>
                <div className="flex flex-col gap-1.5">
                  {dayMap[day]?.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-gray-200 px-2 py-4 text-center text-[10px] text-gray-400 dark:border-gray-700">
                      No classes
                    </div>
                  ) : (
                    dayMap[day]?.map((r) => (
                      <div
                        key={r.id}
                        onMouseEnter={(e) => setTooltip({ r, x: e.clientX, y: e.clientY })}
                        onMouseLeave={() => setTooltip(null)}
                        className="cursor-default rounded-lg bg-brand-100 px-2 py-1.5 leading-tight text-brand-800 transition hover:bg-brand-200 dark:bg-brand-500/20 dark:text-brand-300 dark:hover:bg-brand-500/30"
                      >
                        <p className="text-[10px] font-medium text-brand-600 dark:text-brand-400">
                          {formatTime(r.start_time)} – {formatTime(r.end_time)}
                        </p>
                        <p className="truncate text-xs font-semibold">{r.course_code}</p>
                        <p className="truncate text-[10px] opacity-70">{r.room}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Hover Tooltip */}
      {tooltip && (
        <div
          className="pointer-events-none fixed z-50 max-w-xs rounded-xl border border-gray-200 bg-white p-3 shadow-lg dark:border-gray-700 dark:bg-gray-800"
          style={{ top: tooltip.y + 12, left: tooltip.x + 8 }}
        >
          <p className="text-xs font-medium text-brand-500">
            {formatTime(tooltip.r.start_time)} – {formatTime(tooltip.r.end_time)}
          </p>
          <p className="text-sm font-semibold text-gray-900 dark:text-white">
            {tooltip.r.course_code}
          </p>
          <p className="text-xs text-gray-600 dark:text-gray-300">{tooltip.r.course_title}</p>
          <p className="text-xs text-gray-500">
            {tooltip.r.prof} · {tooltip.r.course} {tooltip.r.year}-{tooltip.r.section}
          </p>
          <p className="mt-1 text-xs font-medium text-brand-500">{tooltip.r.room}</p>
        </div>
      )}
    </div>
  );
}

function parseTimeToMinutes(t: string): number {
  const trimmed = t.trim();
  const hhmm = trimmed.match(/^(\d{1,2}):(\d{2})$/);
  if (hhmm) return parseInt(hhmm[1]) * 60 + parseInt(hhmm[2]);
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

function buildDayMap(
  reservations: Reservation[],
  roomFilter: string
): Record<string, Reservation[]> {
  const map: Record<string, Reservation[]> = {};
  for (const day of SCHEDULE_DAYS) map[day] = [];

  for (const r of reservations) {
    if (roomFilter && r.room !== roomFilter) continue;
    const days = DAY_PATTERN_MAP[r.day as DayPattern] ?? [r.day];
    for (const day of days) {
      if (map[day]) map[day].push(r);
    }
  }

  for (const day of SCHEDULE_DAYS) {
    map[day].sort((a, b) => parseTimeToMinutes(a.start_time) - parseTimeToMinutes(b.start_time));
  }

  return map;
}
