'use client';

import { PageBreadcrumb } from '@/components/common';
import { useProfiles } from '@/components/hooks/use-users';
import { BookOpen, Building2, ClipboardList, Inbox } from 'lucide-react';

export default function DashboardPage() {
  const { data: profiles = [] } = useProfiles();

  const stats = [
    {
      title: 'Total Rooms',
      value: '—',
      icon: <Building2 size={20} />,
      color: 'brand' as const,
      description: 'Rooms in the system',
    },
    {
      title: 'Approved',
      value: '—',
      icon: <ClipboardList size={20} />,
      color: 'success' as const,
      description: 'Approved reservations',
    },
    {
      title: 'Pending',
      value: '—',
      icon: <ClipboardList size={20} />,
      color: 'warning' as const,
      description: 'Awaiting approval',
    },
    {
      title: 'Vacant Rooms',
      value: '—',
      icon: <BookOpen size={20} />,
      color: 'info' as const,
      description: 'Currently unoccupied',
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageBreadcrumb pageTitle="Dashboard" />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <StatCard key={stat.title} {...stat} />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Pending Requests */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-gray-900">
          <h3 className="mb-4 text-sm font-semibold text-gray-900 dark:text-white">
            Pending Requests
          </h3>
          <EmptyState message="No pending requests" />
        </div>

        {/* Scheduling Conflicts */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-gray-900">
          <h3 className="mb-4 text-sm font-semibold text-gray-900 dark:text-white">
            Scheduling Conflicts
          </h3>
          <EmptyState message="No conflicts detected" />
        </div>
      </div>

      <p className="hidden text-xs text-gray-400">{profiles.length} users loaded</p>
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
  value: number | string;
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
