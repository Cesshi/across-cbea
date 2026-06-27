'use client';

import { PageBreadcrumb } from '@/components/common';
import { useClearAllReservations } from '@/components/hooks/use-reservations';
import { ConfirmDialog } from '@/components/ui';
import { AlertTriangle, Trash2 } from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';

export default function ClearDataPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const clearMutation = useClearAllReservations();

  const handleClear = () => {
    clearMutation.mutate(undefined, {
      onSuccess: (result) => {
        toast.success(`Cleared ${result.count} reservation${result.count !== 1 ? 's' : ''}`);
        setDialogOpen(false);
      },
      onError: () => toast.error('Failed to clear reservations'),
    });
  };

  return (
    <>
      <div className="flex flex-col gap-6">
        <PageBreadcrumb pageTitle="Clear Data" />

        <div className="mx-auto w-full max-w-xl">
          <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-500/20 dark:bg-amber-500/10">
            <p className="text-xs font-medium text-amber-700 dark:text-amber-400">
              Danger Zone — Actions here are permanent and cannot be undone.
            </p>
          </div>

          <div className="rounded-2xl border border-red-200 bg-red-50/50 p-5 dark:border-red-500/20 dark:bg-red-500/5">
            <div className="mb-3 flex items-start gap-3">
              <AlertTriangle size={18} className="mt-0.5 shrink-0 text-red-500" />
              <div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                  Clear All Reservations
                </h3>
                <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                  Permanently deletes every reservation record (approved, pending, and rejected).
                  Rooms will remain untouched.
                </p>
              </div>
            </div>
            <button
              onClick={() => setDialogOpen(true)}
              className="flex items-center gap-1.5 rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-600 transition hover:bg-red-100 dark:border-red-500/30 dark:text-red-400 dark:hover:bg-red-500/10"
            >
              <Trash2 size={14} />
              Clear All Reservations
            </button>
          </div>
        </div>
      </div>

      <ConfirmDialog
        isOpen={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onConfirm={handleClear}
        variant="danger"
        title="Clear All Reservations"
        message="This will permanently delete every reservation record — approved, pending, and rejected. This action cannot be undone."
        confirmLabel="Clear All"
        loadingText="Clearing..."
        isLoading={clearMutation.isPending}
      />
    </>
  );
}
