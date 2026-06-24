'use client';

import { PageBreadcrumb } from '@/components/common';
import { useClearAllReservations } from '@/components/hooks/use-reservations';
import { AlertTriangle, Trash2 } from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';

function DangerCard({
  title,
  desc,
  onConfirm,
  isPending,
}: {
  title: string;
  desc: string;
  onConfirm: () => void;
  isPending: boolean;
}) {
  const [confirm, setConfirm] = useState(false);

  return (
    <div className="rounded-2xl border border-red-200 bg-red-50/50 p-5 dark:border-red-500/20 dark:bg-red-500/5">
      <div className="mb-3 flex items-start gap-3">
        <AlertTriangle size={18} className="mt-0.5 shrink-0 text-red-500" />
        <div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{title}</h3>
          <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{desc}</p>
        </div>
      </div>

      {!confirm ? (
        <button
          onClick={() => setConfirm(true)}
          className="flex items-center gap-1.5 rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-600 transition hover:bg-red-100 dark:border-red-500/30 dark:text-red-400 dark:hover:bg-red-500/10"
        >
          <Trash2 size={14} />
          {title}
        </button>
      ) : (
        <div className="flex items-center gap-3">
          <p className="text-xs font-medium text-red-600 dark:text-red-400">
            Are you sure? This cannot be undone.
          </p>
          <button
            onClick={() => {
              onConfirm();
              setConfirm(false);
            }}
            disabled={isPending}
            className="rounded-lg bg-red-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-600 disabled:opacity-50"
          >
            Yes, Delete
          </button>
          <button
            onClick={() => setConfirm(false)}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}

export default function ClearDataPage() {
  const clearMutation = useClearAllReservations();

  const handleClearReservations = () => {
    clearMutation.mutate(undefined, {
      onSuccess: (result) =>
        toast.success(`Cleared ${result.count} reservation${result.count !== 1 ? 's' : ''}`),
      onError: () => toast.error('Failed to clear reservations'),
    });
  };

  return (
    <div className="flex flex-col gap-6">
      <PageBreadcrumb pageTitle="Clear Data" />

      <div className="mx-auto w-full max-w-xl">
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-500/20 dark:bg-amber-500/10">
          <p className="text-xs font-medium text-amber-700 dark:text-amber-400">
            Danger Zone — Actions here are permanent and cannot be undone.
          </p>
        </div>

        <div className="space-y-4">
          <DangerCard
            title="Clear All Reservations"
            desc="Permanently deletes every reservation record (approved, pending, and rejected). Rooms will remain untouched."
            onConfirm={handleClearReservations}
            isPending={clearMutation.isPending}
          />
        </div>
      </div>
    </div>
  );
}
