'use client';

import { PageBreadcrumb } from '@/components/common';
import { useAllConflicts, useReservationsByStatus } from '@/components/hooks/use-reservations';
import { useRooms } from '@/components/hooks/use-rooms';
import { Badge } from '@/components/ui';
import { formatTime } from '@/lib/constants';
import type { Reservation } from '@prisma/client';
import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  Building2,
  ChevronRight,
  ClipboardList,
  Inbox,
} from 'lucide-react';
import Link from 'next/link';

export default function DashboardPage() {
  const { data: rooms = [] } = useRooms();
  const { data: approved = [] } = useReservationsByStatus('approved');
  const { data: pending = [] } = useReservationsByStatus('pending');
  const { data: conflicts = [] } = useAllConflicts();
  // Vacant = rooms with no approved reservations at all
  const occupiedRooms = new Set(approved.map((r) => r.room));
  const vacantCount = rooms.filter((r) => r.is_active && !occupiedRooms.has(r.name)).length;

  const stats = [
    {
      title: 'Total Rooms',
      value: rooms.length,
      icon: <Building2 size={20} />,
      color: 'brand' as const,
      description: 'Rooms in the system',
    },
    {
      title: 'Approved',
      value: approved.length,
      icon: <ClipboardList size={20} />,
      color: 'success' as const,
      description: 'Active reservations',
    },
    {
      title: 'Pending',
      value: pending.length,
      icon: <ClipboardList size={20} />,
      color: 'warning' as const,
      description: 'Awaiting approval',
    },
    {
      title: 'Vacant Rooms',
      value: vacantCount,
      icon: <BookOpen size={20} />,
      color: 'info' as const,
      description: 'Rooms with no bookings',
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageBreadcrumb pageTitle="Dashboard" />

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((s) => (
          <StatCard key={s.title} {...s} />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Pending Requests */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-gray-900">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
              Pending Requests
            </h3>
            <div className="flex items-center gap-2">
              {pending.length > 0 && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-500 px-1.5 text-xs font-semibold text-white">
                  {pending.length}
                </span>
              )}
              <Link
                href="/requests"
                className="flex items-center gap-1 text-xs font-medium text-brand-500 hover:text-brand-600 dark:text-brand-400"
              >
                Manage <ArrowRight size={12} />
              </Link>
            </div>
          </div>

          {pending.length === 0 ? (
            <EmptyState message="No pending requests" />
          ) : (
            <div className="space-y-2">
              {(pending as Reservation[]).slice(0, 6).map((r) => (
                <Link
                  key={r.id}
                  href="/requests"
                  className="flex items-center justify-between gap-3 rounded-xl border border-gray-100 bg-gray-50 p-3 transition hover:border-gray-200 hover:bg-gray-100 dark:border-white/5 dark:bg-white/5 dark:hover:border-white/10 dark:hover:bg-white/10"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-gray-900 dark:text-white">
                      {r.prof}
                    </p>
                    <p className="truncate text-xs text-gray-500 dark:text-gray-400">
                      {r.course_code} · {r.course} {r.year}-{r.section} · {r.room}
                    </p>
                    <p className="text-xs text-gray-400">
                      {r.day} · {formatTime(r.start_time)}–{formatTime(r.end_time)}
                    </p>
                  </div>
                  <ChevronRight size={14} className="shrink-0 text-gray-400" />
                </Link>
              ))}
              {pending.length > 6 && (
                <Link
                  href="/requests"
                  className="block pt-1 text-center text-xs text-brand-500 hover:text-brand-600 dark:text-brand-400"
                >
                  +{pending.length - 6} more — view all requests
                </Link>
              )}
            </div>
          )}
        </div>

        {/* Conflicts */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-gray-900">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
              Scheduling Conflicts
            </h3>
            {conflicts.length > 0 && (
              <Badge color="error" size="sm">
                {conflicts.length} conflict{conflicts.length !== 1 ? 's' : ''}
              </Badge>
            )}
          </div>

          {conflicts.length === 0 ? (
            <EmptyState message="No conflicts detected" />
          ) : (
            <div className="space-y-2">
              {conflicts.slice(0, 5).map((c, i) => (
                <div
                  key={i}
                  className="rounded-xl border border-red-100 bg-red-50 p-3 dark:border-red-500/20 dark:bg-red-500/10"
                >
                  <div className="mb-1 flex items-center gap-1.5">
                    <AlertTriangle size={12} className="text-red-500" />
                    <span className="text-xs font-semibold text-red-600 dark:text-red-400">
                      {c.room} · {c.day} · {formatTime(c.start_time)}–{formatTime(c.end_time)}
                    </span>
                  </div>
                  <p className="text-xs text-red-500 dark:text-red-400">
                    {c.existing.prof} ({c.existing.course_code}) vs {c.incoming.prof} (
                    {c.incoming.course_code})
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  icon,
  color = 'brand',
  description,
}: {
  title: string;
  value: number;
  icon: React.ReactNode;
  color?: 'brand' | 'success' | 'warning' | 'info' | 'error';
  description?: string;
}) {
  const styles: Record<string, { bg: string; iconBg: string }> = {
    brand: {
      bg: 'bg-blue-100 dark:bg-blue-500/10',
      iconBg: 'bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400',
    },
    success: {
      bg: 'bg-green-100 dark:bg-green-500/10',
      iconBg: 'bg-green-100 text-green-600 dark:bg-green-500/20 dark:text-green-400',
    },
    warning: {
      bg: 'bg-amber-100 dark:bg-amber-500/10',
      iconBg: 'bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400',
    },
    info: {
      bg: 'bg-sky-100 dark:bg-sky-500/10',
      iconBg: 'bg-sky-100 text-sky-600 dark:bg-sky-500/20 dark:text-sky-400',
    },
    error: {
      bg: 'bg-red-100 dark:bg-red-500/10',
      iconBg: 'bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400',
    },
  };

  return (
    <div className="relative flex flex-col justify-between overflow-hidden rounded-2xl border border-gray-200 bg-white p-4 shadow-sm transition-all hover:shadow-md dark:border-white/10 dark:bg-gray-900">
      <div className="flex items-start justify-between">
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{title}</p>
          <p className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">{value}</p>
        </div>
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-xl ${styles[color].iconBg}`}
        >
          {icon}
        </div>
      </div>
      {description && (
        <div className="mt-3 text-xs text-gray-500 dark:text-gray-400">{description}</div>
      )}
      <div
        className={`pointer-events-none absolute -right-4 -bottom-4 h-24 w-24 rounded-full blur-2xl ${styles[color].bg}`}
      />
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex min-h-40 w-full flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 bg-gray-50/50 dark:border-white/10 dark:bg-white/5">
      <Inbox className="mb-2 text-gray-300 dark:text-gray-600" size={24} />
      <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{message}</p>
    </div>
  );
}
