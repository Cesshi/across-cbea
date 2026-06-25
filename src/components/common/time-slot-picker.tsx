'use client';

import { formatTime } from '@/lib/constants';
import { cn } from '@/lib/utils';
import type { Reservation } from '@prisma/client';
import { MousePointerClick } from 'lucide-react';
import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';

const SLOT_MIN = 30;
const DAY_START_MIN = 7 * 60;
const DAY_END_MIN = 21 * 60;

function parseToMins(t: string): number {
  const trimmed = t.trim();
  const hhmm = trimmed.match(/^(\d{1,2}):(\d{2})$/);
  if (hhmm) return parseInt(hhmm[1]) * 60 + parseInt(hhmm[2]);
  const ampm = trimmed.match(/^(\d+):(\d+)\s*(AM|PM)$/i);
  if (ampm) {
    let h = parseInt(ampm[1]);
    const m = parseInt(ampm[2]);
    if (ampm[3].toUpperCase() === 'PM' && h !== 12) h += 12;
    if (ampm[3].toUpperCase() === 'AM' && h === 12) h = 0;
    return h * 60 + m;
  }
  return 0;
}

function toHHMM(mins: number): string {
  return `${Math.floor(mins / 60)
    .toString()
    .padStart(2, '0')}:${(mins % 60).toString().padStart(2, '0')}`;
}

function fmtMins(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  const p = h >= 12 ? 'PM' : 'AM';
  const dh = h > 12 ? h - 12 : h === 0 ? 12 : h;
  return `${dh}:${m.toString().padStart(2, '0')} ${p}`;
}

export interface TimeSlotPickerProps {
  reservations: Reservation[];
  selectedStart: string;
  selectedEnd: string;
  /** Reservation being vacated — its slots are treated as free and shown in amber */
  changeTarget?: Reservation | null;
  /** Called when an occupied slot is clicked (change mode only) */
  onOccupiedClick?: (r: Reservation) => void;
  onSelect: (start: string, end: string) => void;
}

export function TimeSlotPicker({
  reservations,
  selectedStart,
  selectedEnd,
  changeTarget,
  onOccupiedClick,
  onSelect,
}: TimeSlotPickerProps) {
  const [anchor, setAnchor] = useState<number | null>(null);
  const [hover, setHover] = useState<number | null>(null);

  const slots = useMemo(() => {
    const s: number[] = [];
    for (let m = DAY_START_MIN; m < DAY_END_MIN; m += SLOT_MIN) s.push(m);
    return s;
  }, []);

  const selStart = selectedStart ? parseToMins(selectedStart) : null;
  const selEnd = selectedEnd ? parseToMins(selectedEnd) : null;

  function effectiveOccupant(slotMins: number): Reservation | null {
    return (
      reservations.find((r) => {
        if (changeTarget && r.id === changeTarget.id) return false;
        const rs = parseToMins(r.start_time);
        const re = parseToMins(r.end_time);
        return slotMins >= rs && slotMins < re;
      }) ?? null
    );
  }

  function isVacating(slotMins: number): boolean {
    if (!changeTarget) return false;
    const vs = parseToMins(changeTarget.start_time);
    const ve = parseToMins(changeTarget.end_time);
    return slotMins >= vs && slotMins < ve;
  }

  function slotState(
    slotMins: number
  ): 'occupied' | 'vacating' | 'selected' | 'selecting' | 'anchor' | 'free' {
    if (effectiveOccupant(slotMins)) return 'occupied';
    if (anchor === slotMins) return 'anchor';
    if (selStart !== null && selEnd !== null && slotMins >= selStart && slotMins <= selEnd)
      return 'selected';
    if (anchor !== null && hover !== null) {
      const lo = Math.min(anchor, hover);
      const hi = Math.max(anchor, hover);
      if (slotMins >= lo && slotMins <= hi) return 'selecting';
    }
    if (isVacating(slotMins)) return 'vacating';
    return 'free';
  }

  function handleClick(slotMins: number) {
    const rawOccupant =
      reservations.find((r) => {
        const rs = parseToMins(r.start_time);
        const re = parseToMins(r.end_time);
        return slotMins >= rs && slotMins < re;
      }) ?? null;

    if (rawOccupant && !(changeTarget && rawOccupant.id === changeTarget.id)) {
      if (onOccupiedClick) onOccupiedClick(rawOccupant);
      else if (anchor !== null) setAnchor(null);
      return;
    }

    if (anchor === null) {
      setAnchor(slotMins);
      onSelect(toHHMM(slotMins), '');
      return;
    }

    const lo = Math.min(anchor, slotMins);
    const hi = Math.max(anchor, slotMins);

    if (lo === hi) {
      setAnchor(null);
      onSelect('', '');
      return;
    }

    const hasConflict = reservations.some((r) => {
      if (changeTarget && r.id === changeTarget.id) return false;
      const rs = parseToMins(r.start_time);
      const re = parseToMins(r.end_time);
      return rs < hi && re > lo;
    });

    if (hasConflict) {
      toast.error('Selected range overlaps with an existing reservation.');
      setAnchor(null);
      onSelect('', '');
      return;
    }

    onSelect(toHHMM(lo), toHHMM(hi));
    setAnchor(null);
  }

  const stateStyles: Record<string, string> = {
    occupied:
      'bg-gray-100 dark:bg-gray-800 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700',
    vacating: 'bg-orange-50 dark:bg-orange-500/10 cursor-pointer',
    anchor: 'bg-brand-500 cursor-pointer',
    selected: 'bg-brand-100 dark:bg-brand-500/20 cursor-pointer',
    selecting: 'bg-brand-50 dark:bg-brand-500/10 cursor-pointer',
    free: 'bg-white dark:bg-gray-950 hover:bg-brand-50 dark:hover:bg-brand-500/10 cursor-pointer',
  };

  return (
    <div
      className="overflow-y-auto rounded-xl border border-gray-200 dark:border-gray-800"
      style={{ maxHeight: 420 }}
    >
      {/* Legend */}
      <div className="sticky top-0 z-10 flex flex-wrap items-center gap-3 border-b border-gray-200 bg-gray-50 px-4 py-2 dark:border-gray-800 dark:bg-gray-900">
        <span className="flex items-center gap-1.5 text-xs text-gray-500">
          <span className="h-3 w-3 rounded-sm bg-gray-200 dark:bg-gray-700" />
          {onOccupiedClick ? 'Click to change' : 'Occupied'}
        </span>
        {changeTarget && (
          <span className="flex items-center gap-1.5 text-xs text-gray-500">
            <span className="h-3 w-3 rounded-sm bg-orange-100 dark:bg-orange-500/20" />
            Vacating
          </span>
        )}
        <span className="flex items-center gap-1.5 text-xs text-gray-500">
          <span className="h-3 w-3 rounded-sm bg-brand-100 dark:bg-brand-500/30" />
          Selected
        </span>
        <span className="flex items-center gap-1.5 text-xs text-gray-500">
          <span className="h-3 w-3 rounded-sm border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-950" />
          Available
        </span>
        {anchor !== null && (
          <span className="ml-auto flex items-center gap-1 text-xs font-medium text-brand-600 dark:text-brand-400">
            <MousePointerClick size={12} />
            Click end time to confirm
          </span>
        )}
      </div>

      {/* Slots */}
      <div>
        {slots.map((slotMins) => {
          const state = slotState(slotMins);
          const isHour = slotMins % 60 === 0;

          const displayOccupant =
            reservations.find((r) => {
              const rs = parseToMins(r.start_time);
              const re = parseToMins(r.end_time);
              return slotMins >= rs && slotMins < re;
            }) ?? null;
          const isBlockStart = displayOccupant
            ? parseToMins(displayOccupant.start_time) === slotMins
            : false;

          return (
            <div
              key={slotMins}
              className="flex items-stretch"
              style={{ height: 32 }}
              onMouseEnter={() => setHover(slotMins)}
              onMouseLeave={() => setHover(null)}
            >
              {/* Time label */}
              <div
                className={cn(
                  'flex w-20 shrink-0 items-center justify-end pr-3 text-xs leading-none',
                  isHour
                    ? 'font-medium text-gray-500 dark:text-gray-400'
                    : 'text-gray-300 dark:text-gray-700'
                )}
              >
                {fmtMins(slotMins)}
              </div>

              {/* Slot bar */}
              <div
                className={cn(
                  'relative flex-1 border-l transition-colors',
                  isHour
                    ? 'border-t border-gray-200 dark:border-gray-800'
                    : 'border-t border-dashed border-gray-100 dark:border-gray-800/50',
                  stateStyles[state]
                )}
                onClick={() => handleClick(slotMins)}
              >
                {isBlockStart && displayOccupant && (
                  <div className="absolute inset-0 flex items-center overflow-hidden px-2">
                    <p
                      className={cn(
                        'truncate text-xs font-medium',
                        state === 'vacating'
                          ? 'text-orange-600 dark:text-orange-400'
                          : 'text-gray-600 dark:text-gray-300'
                      )}
                    >
                      {displayOccupant.course_code} &mdash; {formatTime(displayOccupant.start_time)}
                      –{formatTime(displayOccupant.end_time)}{' '}
                      <span className="font-normal opacity-70">{displayOccupant.prof}</span>
                    </p>
                  </div>
                )}

                {state === 'anchor' && (
                  <div className="absolute inset-0 flex items-center px-2">
                    <p className="text-xs font-semibold text-white">{fmtMins(slotMins)} — start</p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
