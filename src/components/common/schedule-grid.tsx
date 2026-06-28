'use client';

import { Spinner } from '@/components/ui';
import { DAY_PATTERNS, formatTime, type DayPattern } from '@/lib/constants';
import { cn } from '@/lib/utils';
import type { Reservation, Room } from '@prisma/client';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

type PaletteEntry = (typeof PALETTE)[number];

const MIN_HOUR = 7;
const MAX_HOUR = 21;
const HOUR_HEIGHT = 64;
const TIME_COL_W = 68;
const ROOM_COL_W = 164;
const PILLS_H = 48;
const BODY_PAD = 16; // vertical breathing room so first/last labels don't clip

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
  const [legendOpen, setLegendOpen] = useState(true);
  const [stickyHeaderH, setStickyHeaderH] = useState(PILLS_H);
  const stickyHeaderRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = stickyHeaderRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setStickyHeaderH(el.offsetHeight));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const filteredReservations = useMemo(
    () => reservations.filter((r) => r.day === activePattern),
    [reservations, activePattern]
  );

  // Assign a stable color per program (r.course) across ALL reservations so
  // the same program always gets the same color regardless of the active day.
  const courseColorMap = useMemo(() => {
    const courses = [...new Set(reservations.map((r) => r.course))].sort();
    const map = new Map<string, PaletteEntry>();
    courses.forEach((c, i) => map.set(c, PALETTE[i % PALETTE.length]));
    return map;
  }, [reservations]);

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
        <Spinner size="md" center />
      </div>
    );
  }

  return (
    <div
      className="relative z-0 overflow-auto rounded-xl border border-gray-200 dark:border-gray-800"
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
        ref={stickyHeaderRef}
        className="sticky top-0 left-0 z-30 border-b border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950"
      >
        {/* Day pattern pills */}
        <div className="flex items-center gap-2 overflow-x-auto px-4" style={{ height: PILLS_H }}>
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
        {/* Course legend */}
        {courseColorMap.size > 0 && (
          <div className="border-t border-gray-100 dark:border-gray-800">
            <button
              onClick={() => setLegendOpen((o) => !o)}
              className="flex w-full items-center gap-1.5 px-4 py-1.5 text-xs font-medium text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              {legendOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              Course Legend
              <span className="ml-1 rounded-full bg-gray-100 px-1.5 py-0.5 text-xs text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                {courseColorMap.size}
              </span>
            </button>
            {legendOpen && (
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 pb-2">
                {[...courseColorMap.entries()].map(([course, color]) => (
                  <span
                    key={course}
                    className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400"
                  >
                    <span className={cn('h-2.5 w-2.5 shrink-0 rounded-full', color.dot)} />
                    {course}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Wide content (causes horizontal scroll) ── */}
      <div style={{ minWidth: TIME_COL_W + rooms.length * ROOM_COL_W }}>
        {/* Room header row — sticky just below the pills */}
        <div
          className="sticky z-20 flex border-b border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900"
          style={{ top: stickyHeaderH }}
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
                const color = courseColorMap.get(r.course) ?? PALETTE[0];
                return (
                  <div
                    key={r.id}
                    onMouseEnter={(e) => setTooltip({ r, x: e.clientX, y: e.clientY })}
                    onMouseLeave={() => setTooltip(null)}
                    className={cn(
                      'absolute inset-x-1 cursor-default overflow-hidden rounded-md px-1.5 py-1 transition',
                      color.card
                    )}
                    style={{ top: top + 1, height: Math.max(height - 2, 20) }}
                  >
                    <p className={cn('truncate text-xs font-medium leading-tight', color.time)}>
                      {formatTime(r.start_time)}–{formatTime(r.end_time)}
                    </p>
                    <p className={cn('truncate text-sm font-semibold leading-tight', color.name)}>
                      {r.course_code}
                    </p>
                    {height >= 42 && (
                      <p className={cn('truncate text-xs leading-tight opacity-70', color.sub)}>
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

const PALETTE = [
  {
    // Sky blue
    card: 'bg-sky-100 hover:bg-sky-200 dark:bg-sky-500/30 dark:hover:bg-sky-500/20',
    time: 'text-sky-600 dark:text-sky-400',
    name: 'text-sky-900 dark:text-sky-200',
    sub: 'text-sky-700 dark:text-sky-300',
    dot: 'bg-sky-500',
  },
  {
    // Lime green
    card: 'bg-lime-100 hover:bg-lime-200 dark:bg-lime-500/30 dark:hover:bg-lime-500/20',
    time: 'text-lime-600 dark:text-lime-400',
    name: 'text-lime-900 dark:text-lime-200',
    sub: 'text-lime-700 dark:text-lime-300',
    dot: 'bg-lime-500',
  },
  {
    // Fuchsia/magenta
    card: 'bg-fuchsia-100 hover:bg-fuchsia-200 dark:bg-fuchsia-500/30 dark:hover:bg-fuchsia-500/20',
    time: 'text-fuchsia-600 dark:text-fuchsia-400',
    name: 'text-fuchsia-900 dark:text-fuchsia-200',
    sub: 'text-fuchsia-700 dark:text-fuchsia-300',
    dot: 'bg-fuchsia-500',
  },
  {
    // Amber/yellow
    card: 'bg-yellow-100 hover:bg-yellow-200 dark:bg-yellow-500/30 dark:hover:bg-yellow-500/20',
    time: 'text-yellow-600 dark:text-yellow-400',
    name: 'text-yellow-900 dark:text-yellow-200',
    sub: 'text-yellow-700 dark:text-yellow-300',
    dot: 'bg-yellow-500',
  },
  {
    // Red (stronger than rose)
    card: 'bg-red-100 hover:bg-red-200 dark:bg-red-500/30 dark:hover:bg-red-500/20',
    time: 'text-red-600 dark:text-red-400',
    name: 'text-red-900 dark:text-red-200',
    sub: 'text-red-700 dark:text-red-300',
    dot: 'bg-red-500',
  },
  {
    // Teal (clearly green-leaning, not blue)
    card: 'bg-teal-100 hover:bg-teal-200 dark:bg-teal-500/30 dark:hover:bg-teal-500/20',
    time: 'text-teal-600 dark:text-teal-400',
    name: 'text-teal-900 dark:text-teal-200',
    sub: 'text-teal-700 dark:text-teal-300',
    dot: 'bg-teal-500',
  },
  {
    // Orange (clearly different from yellow/amber)
    card: 'bg-orange-100 hover:bg-orange-200 dark:bg-orange-500/30 dark:hover:bg-orange-500/20',
    time: 'text-orange-600 dark:text-orange-400',
    name: 'text-orange-900 dark:text-orange-200',
    sub: 'text-orange-700 dark:text-orange-300',
    dot: 'bg-orange-500',
  },
  {
    // Violet/purple (deep, distinct from fuchsia)
    card: 'bg-purple-100 hover:bg-purple-200 dark:bg-purple-500/30 dark:hover:bg-purple-500/20',
    time: 'text-purple-600 dark:text-purple-400',
    name: 'text-purple-900 dark:text-purple-200',
    sub: 'text-purple-700 dark:text-purple-300',
    dot: 'bg-purple-500',
  },
  {
    // Rose/pink (warm, different from red)
    card: 'bg-pink-100 hover:bg-pink-200 dark:bg-pink-500/30 dark:hover:bg-pink-500/20',
    time: 'text-pink-600 dark:text-pink-400',
    name: 'text-pink-900 dark:text-pink-200',
    sub: 'text-pink-700 dark:text-pink-300',
    dot: 'bg-pink-500',
  },
  {
    // Emerald (deep green, clearly distinct from lime/teal)
    card: 'bg-emerald-100 hover:bg-emerald-200 dark:bg-emerald-500/30 dark:hover:bg-emerald-500/20',
    time: 'text-emerald-600 dark:text-emerald-400',
    name: 'text-emerald-900 dark:text-emerald-200',
    sub: 'text-emerald-700 dark:text-emerald-300',
    dot: 'bg-emerald-500',
  },
] as const;
