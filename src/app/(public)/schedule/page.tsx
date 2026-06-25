'use client';

import { ScheduleGrid } from '@/components/common/schedule-grid';
import { useApprovedReservations } from '@/components/hooks/use-reservations';
import { useRooms } from '@/components/hooks/use-rooms';
import { CalendarDays } from 'lucide-react';
import Link from 'next/link';

export default function SchedulePage() {
  const { data: reservations = [], isPending } = useApprovedReservations();
  const { data: rooms = [] } = useRooms();

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
          <Link
            href="/signin"
            className="rounded-lg bg-brand-500 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-brand-600"
          >
            Login
          </Link>
        </div>
      </header>

      {/* Content */}
      <div className="mx-auto max-w-screen-2xl px-4 py-6 md:px-6">
        <ScheduleGrid reservations={reservations} rooms={rooms} isLoading={isPending} />
      </div>
    </div>
  );
}
