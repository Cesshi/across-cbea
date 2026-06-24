'use client';

import { PageBreadcrumb } from '@/components/common';
import {
  useApproveReservation,
  useDeleteReservation,
  useRejectReservation,
  useReservations,
} from '@/components/hooks/use-reservations';
import { Badge, Button, ConfirmDialog, DataTable, Input, Modal } from '@/components/ui';
import type { ColumnDef } from '@tanstack/react-table';
import { format } from 'date-fns';
import { Check, FileText, Search, Trash2, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';

type Reservation = {
  id: string;
  prof: string;
  subj: string;
  group: string;
  email: string | null;
  room: string;
  day: string;
  time_slot: string;
  notes: string | null;
  status: string;
  action_at: Date | null;
  created_at: Date;
};

const STATUS_TABS = ['All', 'Pending', 'Approved', 'Rejected'] as const;
type StatusTab = (typeof STATUS_TABS)[number];

const statusColor: Record<string, 'warning' | 'success' | 'error' | 'light'> = {
  pending: 'warning',
  approved: 'success',
  rejected: 'error',
};

export default function RequestsPage() {
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [activeTab, setActiveTab] = useState<StatusTab>('Pending');
  const [deleteId, setDeleteId] = useState('');
  const [notesModal, setNotesModal] = useState<{ open: boolean; notes: string; prof: string }>({
    open: false,
    notes: '',
    prof: '',
  });

  const { data: all = [], isPending, isFetching } = useReservations(debounced);
  const approveMutation = useApproveReservation();
  const rejectMutation = useRejectReservation();
  const deleteMutation = useDeleteReservation();

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query), 400);
    return () => clearTimeout(t);
  }, [query]);

  const counts = useMemo(
    () => ({
      All: all.length,
      Pending: all.filter((r) => r.status === 'pending').length,
      Approved: all.filter((r) => r.status === 'approved').length,
      Rejected: all.filter((r) => r.status === 'rejected').length,
    }),
    [all]
  );

  const filtered = useMemo(
    () => (activeTab === 'All' ? all : all.filter((r) => r.status === activeTab.toLowerCase())),
    [all, activeTab]
  );

  const handleApprove = (id: string) => {
    approveMutation.mutate(id, {
      onSuccess: () => toast.success('Request approved'),
      onError: () => toast.error('Failed to approve'),
    });
  };

  const handleReject = (id: string) => {
    rejectMutation.mutate(id, {
      onSuccess: () => toast.success('Request rejected'),
      onError: () => toast.error('Failed to reject'),
    });
  };

  const columns: ColumnDef<Reservation, unknown>[] = [
    {
      accessorKey: 'prof',
      header: 'Faculty',
      cell: ({ getValue }) => (
        <span className="font-medium text-gray-900 dark:text-white">{String(getValue())}</span>
      ),
    },
    { accessorKey: 'subj', header: 'Subject' },
    { accessorKey: 'group', header: 'Group' },
    {
      accessorKey: 'room',
      header: 'Room',
      cell: ({ getValue }) => (
        <span className="rounded bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700 dark:bg-gray-700 dark:text-gray-300">
          {String(getValue())}
        </span>
      ),
    },
    { accessorKey: 'day', header: 'Day' },
    { accessorKey: 'time_slot', header: 'Time Slot' },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ getValue }) => {
        const s = String(getValue());
        return (
          <Badge color={statusColor[s] ?? 'light'} size="sm" className="capitalize">
            {s}
          </Badge>
        );
      },
    },
    {
      accessorKey: 'created_at',
      header: 'Submitted',
      cell: ({ getValue }) =>
        getValue() ? format(new Date(getValue() as Date), 'MMM d, yyyy') : '—',
    },
    {
      id: 'actions',
      header: 'Actions',
      enableSorting: false,
      cell: ({ row }) => {
        const r = row.original;
        return (
          <div className="flex items-center gap-2">
            {r.status === 'pending' && (
              <>
                <button
                  onClick={() => handleApprove(r.id)}
                  disabled={approveMutation.isPending}
                  title="Approve"
                  className="flex h-7 w-7 items-center justify-center rounded-full bg-green-100 text-green-600 transition hover:bg-green-200 dark:bg-green-500/15 dark:hover:bg-green-500/25"
                >
                  <Check size={14} />
                </button>
                <button
                  onClick={() => handleReject(r.id)}
                  disabled={rejectMutation.isPending}
                  title="Reject"
                  className="flex h-7 w-7 items-center justify-center rounded-full bg-red-100 text-red-600 transition hover:bg-red-200 dark:bg-red-500/15 dark:hover:bg-red-500/25"
                >
                  <X size={14} />
                </button>
              </>
            )}
            {r.notes && (
              <button
                onClick={() => setNotesModal({ open: true, notes: r.notes!, prof: r.prof })}
                title="View notes"
                className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-100 text-blue-600 transition hover:bg-blue-200 dark:bg-blue-500/15 dark:hover:bg-blue-500/25"
              >
                <FileText size={14} />
              </button>
            )}
            <button
              onClick={() => setDeleteId(r.id)}
              title="Delete"
              className="hover:text-error-500 text-gray-400 transition"
              disabled={deleteMutation.isPending}
            >
              <Trash2 size={15} />
            </button>
          </div>
        );
      },
    },
  ];

  return (
    <>
      <div className="space-y-6">
        <PageBreadcrumb pageTitle="Requests" />

        {/* Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex gap-1 rounded-xl border border-gray-200 bg-gray-50 p-1 dark:border-gray-700 dark:bg-gray-800">
            {STATUS_TABS.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-all ${
                  activeTab === tab
                    ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-white'
                    : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                }`}
              >
                {tab}
                <span
                  className={`rounded-full px-1.5 py-0.5 text-xs ${
                    activeTab === tab
                      ? 'bg-gray-100 text-gray-600 dark:bg-gray-600 dark:text-gray-200'
                      : 'bg-gray-200 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
                  }`}
                >
                  {counts[tab]}
                </span>
              </button>
            ))}
          </div>

          <div className="relative min-w-2xs max-w-sm flex-1">
            <Search
              size={16}
              className="absolute top-1/2 left-3 z-1 -translate-y-1/2 text-gray-400"
            />
            <Input
              placeholder="Search by faculty, subject, room..."
              className="pl-9"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </div>

        <DataTable
          columns={columns}
          data={filtered as Reservation[]}
          globalFilter={debounced}
          loading={isPending || isFetching}
          emptyMessage="No requests found"
        />
      </div>

      {/* Notes Modal */}
      <Modal
        isOpen={notesModal.open}
        onClose={() => setNotesModal({ open: false, notes: '', prof: '' })}
        className="sm:max-w-sm"
      >
        <h3 className="mb-1 text-base font-semibold text-gray-900 dark:text-white">
          Notes from {notesModal.prof}
        </h3>
        <p className="mt-3 rounded-lg bg-gray-100 p-4 text-sm text-gray-700 dark:bg-gray-700 dark:text-gray-300">
          {notesModal.notes}
        </p>
        <Button
          variant="outline"
          className="mt-4 w-full"
          onClick={() => setNotesModal({ open: false, notes: '', prof: '' })}
        >
          Close
        </Button>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteId}
        onClose={() => setDeleteId('')}
        onConfirm={() => deleteMutation.mutate(deleteId, { onSuccess: () => setDeleteId('') })}
        title="Delete Request"
        message="This request will be permanently deleted."
        confirmLabel="Delete"
        isLoading={deleteMutation.isPending}
      />
    </>
  );
}
