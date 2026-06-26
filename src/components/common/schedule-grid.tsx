'use client';

import { DAY_PATTERNS, formatTime, type DayPattern } from '@/lib/constants';
import { cn } from '@/lib/utils';
import type { Reservation, Room } from '@prisma/client';
import { useMemo, useState } from 'react';

const MIN_HOUR = 7;
const MAX_HOUR = 21;
const HOUR_HEIGHT = 64;
const TIME_COL_W = 68;
const ROOM_COL_W = 164;
const PILLS_H = 48;
const BODY_PAD = 16; // vertical breathing room so first/last labels don't clip

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
  defaultPattern?: DayPattern;
  maxHeight?: string;
}

export function ScheduleGrid({
  reservations,
  rooms,
  isLoading,
  defaultPattern = 'MWF',
  maxHeight = 'calc(100vh - 180px)',
}: ScheduleGridProps) {
  const [activePattern, setActivePattern] = useState<DayPattern>(defaultPattern);
  const [tooltip, setTooltip] = useState<{ r: Reservation; x: number; y: number } | null>(null);

  const filteredReservations = useMemo(
    () => reservations.filter((r) => r.day === activePattern),
    [reservations, activePattern]
  );

  const byRoom = useMemo(() => {
    const map: Record<string, Reservation[]> = {};
    for (const room of rooms) map[room.name] = [];
    for (const r of filteredReservations) {
      if (map[r.room] !== undefined) map[r.room].push(r);
    }
    return map;
  }, [filteredReservations, rooms]);

  const { startHour, endHour } = useMemo(() => {
    if (filteredReservations.length === 0) return { startHour: 8, endHour: 17 };
    let minMin = Infinity;
    let maxMin = -Infinity;
    for (const r of filteredReservations) {
      minMin = Math.min(minMin, parseTimeToMinutes(r.start_time));
      maxMin = Math.max(maxMin, parseTimeToMinutes(r.end_time));
    }
    return {
      startHour: Math.max(Math.floor(minMin / 60) - 1, MIN_HOUR),
      endHour: Math.min(Math.ceil(maxMin / 60) + 1, MAX_HOUR),
    };
  }, [filteredReservations]);

  const timeSlots = Array.from({ length: endHour - startHour + 1 }, (_, i) => startHour + i);
  // Add BODY_PAD top + bottom so first/last labels aren't clipped by headers or borders
  const totalHeight = (endHour - startHour) * HOUR_HEIGHT + BODY_PAD * 2;

  // All absolute Y positions are shifted down by BODY_PAD
  const hourTop = (hour: number) => (hour - startHour) * HOUR_HEIGHT + BODY_PAD;
  const labelTop = (hour: number) => hourTop(hour) - 6;
  const cardTop = (startMin: number) => ((startMin - startHour * 60) / 60) * HOUR_HEIGHT + BODY_PAD;

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div
      className="overflow-auto rounded-xl border border-gray-200 dark:border-gray-800"
      style={{ maxHeight }}
    >
      {/*
       * ── Day pattern pills ──────────────────────────────────────────────────
       * Lives as a DIRECT child of the scroll container (not inside the wide
       * minWidth div), so its width is always the container's visible width.
       * sticky top-0 + sticky left-0 keeps it pinned to the top-left corner
       * when scrolling in either direction.
       */}
      <div
        className="sticky top-0 left-0 z-30 flex items-center gap-2 overflow-x-auto border-b border-gray-200 bg-white px-4 dark:border-gray-800 dark:bg-gray-950"
        style={{ height: PILLS_H }}
      >
        {DAY_PATTERNS.map((pattern) => (
          <button
            key={pattern}
            onClick={() => setActivePattern(pattern)}
            className={cn(
              'whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-medium transition-all',
              activePattern === pattern
                ? 'bg-brand-500 text-white shadow-sm'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
            )}
          >
            {pattern}
          </button>
        ))}
      </div>

      {/* ── Wide content (causes horizontal scroll) ── */}
      <div style={{ minWidth: TIME_COL_W + rooms.length * ROOM_COL_W }}>
        {/* Room header row — sticky just below the pills */}
        <div
          className="sticky z-20 flex border-b border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900"
          style={{ top: PILLS_H }}
        >
          {/* Corner — sticky left-0 within the header row */}
          <div
            className="sticky left-0 z-30 shrink-0 border-r border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900"
            style={{ width: TIME_COL_W, minWidth: TIME_COL_W }}
          />
          {rooms.map((room) => (
            <div
              key={room.id}
              style={{ width: ROOM_COL_W, minWidth: ROOM_COL_W }}
              className="shrink-0 border-r border-gray-200 px-2 py-2 last:border-r-0 dark:border-gray-800"
            >
              <p className="truncate text-xs font-semibold text-gray-700 dark:text-gray-200">
                {room.name}
              </p>
              <p className="truncate text-xs text-gray-400 dark:text-gray-500">{room.type}</p>
            </div>
          ))}
        </div>

        {/* Grid body */}
        <div className="flex bg-white dark:bg-gray-950">
          {/* Time labels — sticky left */}
          <div
            className="sticky left-0 z-10 shrink-0 border-r border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950"
            style={{ width: TIME_COL_W, minWidth: TIME_COL_W, height: totalHeight }}
          >
            {timeSlots.map((hour) => (
              <div
                key={hour}
                className="absolute right-2 text-right text-xs leading-none text-gray-400 dark:text-gray-500"
                style={{ top: labelTop(hour) }}
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
              {/* Hour lines */}
              {timeSlots.map((hour) => (
                <div
                  key={hour}
                  className="absolute inset-x-0 border-t border-gray-100 dark:border-gray-800"
                  style={{ top: hourTop(hour) }}
                />
              ))}
              {/* Half-hour lines */}
              {timeSlots.slice(0, -1).map((hour) => (
                <div
                  key={`${hour}-h`}
                  className="absolute inset-x-0 border-t border-dashed border-gray-100 dark:border-gray-800/50"
                  style={{ top: hourTop(hour) + HOUR_HEIGHT / 2 }}
                />
              ))}

              {/* Reservation cards */}
              {byRoom[room.name]?.map((r) => {
                const startMin = parseTimeToMinutes(r.start_time);
                const endMin = parseTimeToMinutes(r.end_time);
                const top = cardTop(startMin);
                const height = ((endMin - startMin) / 60) * HOUR_HEIGHT;
                return (
                  <div
                    key={r.id}
                    onMouseEnter={(e) => setTooltip({ r, x: e.clientX, y: e.clientY })}
                    onMouseLeave={() => setTooltip(null)}
                    className="absolute inset-x-1 cursor-default overflow-hidden rounded-md bg-brand-100 px-1.5 py-1 transition hover:bg-brand-200 dark:bg-brand-500/20 dark:hover:bg-brand-500/30"
                    style={{ top: top + 1, height: Math.max(height - 2, 20) }}
                  >
                    <p className="truncate text-xs font-medium leading-tight text-brand-600 dark:text-brand-400">
                      {formatTime(r.start_time)}–{formatTime(r.end_time)}
                    </p>
                    <p className="truncate text-sm font-semibold leading-tight text-brand-800 dark:text-brand-200">
                      {r.course_code}
                    </p>
                    {height >= 42 && (
                      <p className="truncate text-xs leading-tight text-brand-700 opacity-70 dark:text-brand-300">
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

      {/* Tooltip */}
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
