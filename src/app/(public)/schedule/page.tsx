'use client';

import { useApprovedReservations } from '@/components/hooks/use-reservations';
import { useRooms } from '@/components/hooks/use-rooms';
import { DAY_PATTERN_MAP, SCHEDULE_DAYS, TIME_SLOTS, type DayPattern } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { CalendarDays } from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState } from 'react';

type Reservation = {
  id: string;
  prof: string;
  subj: string;
  group: string;
  room: string;
  day: string;
  time_slot: string;
};

type GridCell = Reservation[];

function buildGrid(
  reservations: Reservation[],
  roomFilter: string
): Record<string, Record<string, GridCell>> {
  const grid: Record<string, Record<string, GridCell>> = {};

  for (const day of SCHEDULE_DAYS) {
    grid[day] = {};
    for (const slot of TIME_SLOTS) {
      grid[day][slot] = [];
    }
  }

  for (const r of reservations) {
    if (roomFilter && r.room !== roomFilter) continue;
    const days = DAY_PATTERN_MAP[r.day as DayPattern] ?? [r.day];
    for (const day of days) {
      if (grid[day]?.[r.time_slot] !== undefined) {
        grid[day][r.time_slot].push(r);
      }
    }
  }

  return grid;
}

export default function SchedulePage() {
  const { data: reservations = [], isPending } = useApprovedReservations();
  const { data: rooms = [] } = useRooms();
  const [roomFilter, setRoomFilter] = useState('');
  const [tooltip, setTooltip] = useState<{ r: Reservation; x: number; y: number } | null>(null);

  const grid = useMemo(
    () => buildGrid(reservations as Reservation[], roomFilter),
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
            Approved
          </span>
          <span>Hover a cell to see details</span>
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

      {/* Grid */}
      <div className="mx-auto max-w-screen-2xl overflow-x-auto px-4 pb-8 md:px-6">
        {isPending ? (
          <div className="flex h-64 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
          </div>
        ) : (
          <table className="w-full min-w-[800px] border-collapse text-xs">
            <thead>
              <tr>
                <th className="sticky left-0 z-1 w-28 border-b border-r border-gray-200 bg-gray-50 px-3 py-2 text-left font-semibold text-gray-600 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300">
                  Time
                </th>
                {SCHEDULE_DAYS.map((day) => (
                  <th
                    key={day}
                    className="border-b border-r border-gray-200 px-2 py-2 text-center font-semibold text-gray-600 dark:border-gray-700 dark:text-gray-300"
                  >
                    {day.slice(0, 3)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {TIME_SLOTS.map((slot) => {
                const isHour = slot.endsWith('00 AM') || slot.endsWith('00 PM') || slot.includes('12:00');
                return (
                  <tr key={slot} className={cn(isHour && 'border-t-2 border-gray-300 dark:border-gray-600')}>
                    <td className="sticky left-0 z-1 w-28 border-b border-r border-gray-200 bg-gray-50 px-3 py-1 font-medium text-gray-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400">
                      {slot.split(' - ')[0]}
                    </td>
                    {SCHEDULE_DAYS.map((day) => {
                      const cells = grid[day]?.[slot] ?? [];
                      return (
                        <td
                          key={day}
                          className="relative border-b border-r border-gray-200 p-0.5 align-top dark:border-gray-700"
                          style={{ minWidth: '110px', minHeight: '36px' }}
                        >
                          {cells.length > 0 ? (
                            <div className="flex flex-col gap-0.5">
                              {cells.map((r) => (
                                <div
                                  key={r.id}
                                  onMouseEnter={(e) =>
                                    setTooltip({
                                      r,
                                      x: e.clientX,
                                      y: e.clientY,
                                    })
                                  }
                                  onMouseLeave={() => setTooltip(null)}
                                  className="cursor-default rounded bg-brand-100 px-1.5 py-1 leading-tight text-brand-800 transition hover:bg-brand-200 dark:bg-brand-500/20 dark:text-brand-300 dark:hover:bg-brand-500/30"
                                >
                                  <p className="truncate font-semibold">{r.subj}</p>
                                  <p className="truncate text-[10px] opacity-70">{r.room}</p>
                                </div>
                              ))}
                              {cells.length > 2 && (
                                <span className="pl-1 text-[10px] text-gray-400">
                                  +{cells.length - 2} more
                                </span>
                              )}
                            </div>
                          ) : (
                            <div className="h-full min-h-[34px]" />
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Hover Tooltip */}
      {tooltip && (
        <div
          className="pointer-events-none fixed z-50 max-w-xs rounded-xl border border-gray-200 bg-white p-3 shadow-lg dark:border-gray-700 dark:bg-gray-800"
          style={{ top: tooltip.y + 12, left: tooltip.x + 8 }}
        >
          <p className="text-sm font-semibold text-gray-900 dark:text-white">{tooltip.r.subj}</p>
          <p className="text-xs text-gray-600 dark:text-gray-300">{tooltip.r.prof}</p>
          <p className="text-xs text-gray-500">{tooltip.r.group}</p>
          <p className="mt-1 text-xs font-medium text-brand-500">{tooltip.r.room}</p>
        </div>
      )}
    </div>
  );
}
