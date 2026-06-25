'use client';

import {
  DAY_PATTERN_MAP,
  SCHEDULE_DAYS,
  formatTime,
  type DayPattern,
  type ScheduleDay,
} from '@/lib/constants';
import { cn } from '@/lib/utils';
import type { Reservation, Room } from '@prisma/client';
import { useMemo, useState } from 'react';

const HOUR_HEIGHT = 64;
const START_HOUR = 7;
const END_HOUR = 21;
const TIME_COL_W = 68;
const ROOM_COL_W = 164;

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

function formatHour(hour: number): string {
  if (hour === 12) return '12 PM';
  if (hour > 12) return `${hour - 12} PM`;
  return `${hour} AM`;
}

export interface ScheduleGridProps {
  reservations: Reservation[];
  rooms: Pick<Room, 'id' | 'name' | 'type'>[];
  isLoading?: boolean;
  defaultDay?: ScheduleDay;
}

export function ScheduleGrid({
  reservations,
  rooms,
  isLoading,
  defaultDay = 'Monday',
}: ScheduleGridProps) {
  const [activeDay, setActiveDay] = useState<ScheduleDay>(defaultDay);
  const [tooltip, setTooltip] = useState<{ r: Reservation; x: number; y: number } | null>(null);

  const filteredReservations = useMemo(
    () =>
      reservations.filter((r) => {
        const days = DAY_PATTERN_MAP[r.day as DayPattern] ?? [r.day];
        return days.includes(activeDay);
      }),
    [reservations, activeDay]
  );

  const byRoom = useMemo(() => {
    const map: Record<string, Reservation[]> = {};
    for (const room of rooms) map[room.name] = [];
    for (const r of filteredReservations) {
      if (map[r.room] !== undefined) map[r.room].push(r);
    }
    return map;
  }, [filteredReservations, rooms]);

  const timeSlots = Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => START_HOUR + i);
  const totalHeight = (END_HOUR - START_HOUR) * HOUR_HEIGHT;

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div>
      {/* Day pills */}
      <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
        {SCHEDULE_DAYS.map((day) => (
          <button
            key={day}
            onClick={() => setActiveDay(day)}
            className={cn(
              'whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-medium transition-all',
              activeDay === day
                ? 'bg-brand-500 text-white shadow-sm'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
            )}
          >
            {day}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800">
        <div style={{ minWidth: TIME_COL_W + rooms.length * ROOM_COL_W }}>
          {/* Room header row */}
          <div className="flex border-b border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900/80">
            {/* Corner */}
            <div
              style={{ width: TIME_COL_W, minWidth: TIME_COL_W }}
              className="shrink-0 border-r border-gray-200 dark:border-gray-800"
            />
            {/* Room names */}
            {rooms.map((room) => (
              <div
                key={room.id}
                style={{ width: ROOM_COL_W, minWidth: ROOM_COL_W }}
                className="shrink-0 border-r border-gray-200 px-2 py-2 last:border-r-0 dark:border-gray-800"
              >
                <p className="truncate text-xs font-semibold text-gray-700 dark:text-gray-200">
                  {room.name}
                </p>
                <p className="truncate text-[10px] text-gray-400 dark:text-gray-500">{room.type}</p>
              </div>
            ))}
          </div>

          {/* Time + room body */}
          <div className="flex bg-white dark:bg-gray-950">
            {/* Time labels */}
            <div
              style={{ width: TIME_COL_W, minWidth: TIME_COL_W, height: totalHeight }}
              className="relative shrink-0 border-r border-gray-200 dark:border-gray-800"
            >
              {timeSlots.map((hour) => (
                <div
                  key={hour}
                  className="absolute right-2 pr-0.5 text-right text-[10px] leading-none text-gray-400 dark:text-gray-500"
                  style={{ top: (hour - START_HOUR) * HOUR_HEIGHT - 6 }}
                >
                  {formatHour(hour)}
                </div>
              ))}
            </div>

            {/* Room columns */}
            {rooms.map((room) => (
              <div
                key={room.id}
                style={{ width: ROOM_COL_W, minWidth: ROOM_COL_W, height: totalHeight }}
                className="relative shrink-0 border-r border-gray-200 last:border-r-0 dark:border-gray-800"
              >
                {/* Full-hour lines */}
                {timeSlots.map((hour) => (
                  <div
                    key={hour}
                    className="absolute inset-x-0 border-t border-gray-100 dark:border-gray-800"
                    style={{ top: (hour - START_HOUR) * HOUR_HEIGHT }}
                  />
                ))}
                {/* Half-hour lines */}
                {timeSlots.slice(0, -1).map((hour) => (
                  <div
                    key={`${hour}-h`}
                    className="absolute inset-x-0 border-t border-dashed border-gray-100 dark:border-gray-800/50"
                    style={{ top: (hour - START_HOUR) * HOUR_HEIGHT + HOUR_HEIGHT / 2 }}
                  />
                ))}

                {/* Reservation cards */}
                {byRoom[room.name]?.map((r) => {
                  const startMin = parseTimeToMinutes(r.start_time);
                  const endMin = parseTimeToMinutes(r.end_time);
                  const top = ((startMin - START_HOUR * 60) / 60) * HOUR_HEIGHT;
                  const height = ((endMin - startMin) / 60) * HOUR_HEIGHT;
                  return (
                    <div
                      key={r.id}
                      onMouseEnter={(e) => setTooltip({ r, x: e.clientX, y: e.clientY })}
                      onMouseLeave={() => setTooltip(null)}
                      className="absolute inset-x-1 cursor-default overflow-hidden rounded-md bg-brand-100 px-1.5 py-1 transition hover:bg-brand-200 dark:bg-brand-500/20 dark:hover:bg-brand-500/30"
                      style={{ top: top + 1, height: Math.max(height - 2, 20) }}
                    >
                      <p className="truncate text-[9px] font-medium leading-tight text-brand-600 dark:text-brand-400">
                        {formatTime(r.start_time)}–{formatTime(r.end_time)}
                      </p>
                      <p className="truncate text-[11px] font-semibold leading-tight text-brand-800 dark:text-brand-200">
                        {r.course_code}
                      </p>
                      {height >= 42 && (
                        <p className="truncate text-[9px] leading-tight text-brand-700 opacity-70 dark:text-brand-300">
                          {r.prof}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Hover tooltip */}
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
