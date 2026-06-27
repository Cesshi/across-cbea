'use client';

import { detectConflict } from '@/actions/reservations';
import { PageBreadcrumb } from '@/components/common';
import {
  useApproveReservation,
  useDeleteReservation,
  useRejectReservation,
  useReservations,
} from '@/components/hooks/use-reservations';
import { useRooms } from '@/components/hooks/use-rooms';
import { Badge, Button, ConfirmDialog, DataTable, Input, Modal } from '@/components/ui';
import { formatTime } from '@/lib/constants';
import type { Reservation } from '@prisma/client';
import type { ColumnDef } from '@tanstack/react-table';
import { format } from 'date-fns';
import { AlertTriangle, Check, FileText, Search, Trash2, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';

const STATUS_TABS = ['All', 'Pending', 'Approved', 'Rejected'] as const;
type StatusTab = (typeof STATUS_TABS)[number];

const statusColor: Record<string, 'warning' | 'success' | 'error' | 'light'> = {
  pending: 'warning',
  approved: 'success',
  rejected: 'error',
};

export default function RequestsPage() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [activeTab, setActiveTab] = useState<StatusTab>('Pending');
  const [deleteId, setDeleteId] = useState('');
  const [approveTarget, setApproveTarget] = useState<Reservation | null>(null);
  const [rejectTarget, setRejectTarget] = useState<Reservation | null>(null);
  const [approveCheckPending, setApproveCheckPending] = useState(false);
  const [approveBlock, setApproveBlock] = useState<{
    reasons: string[];
    reservation: Reservation;
  } | null>(null);
  const [notesModal, setNotesModal] = useState<{ open: boolean; notes: string; prof: string }>({
    open: false,
    notes: '',
    prof: '',
  });

  const { data: all = [], isPending, isFetching } = useReservations(debounced);
  const { data: rooms = [] } = useRooms();
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

  const confirmApprove = () => {
    if (!approveTarget) return;
    approveMutation.mutate(approveTarget.id, {
      onSuccess: () => {
        toast.success('Request approved');
        setApproveTarget(null);
      },
      onError: () => toast.error('Failed to approve'),
    });
  };

  const confirmReject = () => {
    if (!rejectTarget) return;
    rejectMutation.mutate(rejectTarget.id, {
      onSuccess: () => {
        toast.success('Request rejected');
        setRejectTarget(null);
      },
      onError: () => toast.error('Failed to reject'),
    });
  };

  const handleApproveClick = async (r: Reservation) => {
    setApproveCheckPending(true);
    const reasons: string[] = [];

    // Block TBA rooms — no room assigned yet
    if (r.room.trim().toUpperCase() === 'TBA') {
      reasons.push(
        'Room is not yet assigned (TBA). Update the reservation with a finalized room first.'
      );
    } else {
      // Block rooms not in the database
      const roomNameSet = new Set(rooms.map((rm) => rm.name.toLowerCase()));
      if (!roomNameSet.has(r.room.trim().toLowerCase())) {
        reasons.push(
          `Room "${r.room}" does not exist in the room database. Add this room first or correct the room name in the schedule page.`
        );
      }
    }

    // Check for scheduling conflicts with already-approved reservations
    try {
      const { hasConflict, conflicting } = await detectConflict(
        r.room,
        r.day,
        r.start_time,
        r.end_time,
        r.id
      );
      if (hasConflict && conflicting) {
        reasons.push(
          `Time slot conflicts with an approved reservation: ${conflicting.prof} — ${conflicting.course_code} (${conflicting.section}) is already in ${r.room} at this time. Resolve this in the schedule page.`
        );
      }
    } catch {
      // If the conflict check itself fails, don't silently allow — surface it
      reasons.push('Could not verify scheduling conflicts. Please try again.');
    }

    setApproveCheckPending(false);

    if (reasons.length > 0) {
      setApproveBlock({ reasons, reservation: r });
    } else {
      setApproveTarget(r);
    }
  };

  const columns: ColumnDef<Reservation, unknown>[] = [
    {
      accessorKey: 'prof',
      header: 'Faculty',
      cell: ({ getValue }) => (
        <span className="font-medium text-gray-900 dark:text-white">{String(getValue())}</span>
      ),
    },
    {
      accessorKey: 'course_code',
      header: 'Course',
      cell: ({ row }) => (
        <div>
          <p className="font-medium text-gray-900 dark:text-white">{row.original.course_code}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">{row.original.course_title}</p>
        </div>
      ),
    },
    {
      id: 'class',
      header: 'Class',
      cell: ({ row }) => (
        <span className="text-sm text-gray-700 dark:text-gray-300">
          {row.original.course} {row.original.year} – {row.original.section}
        </span>
      ),
    },
    {
      accessorKey: 'room',
      header: 'Room',
      cell: ({ getValue }) => (
        <span className="rounded bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700 dark:bg-gray-700 dark:text-gray-300">
          {String(getValue())}
        </span>
      ),
    },
    {
      id: 'schedule',
      header: 'Schedule',
      cell: ({ row }) => (
        <span className="text-xs text-gray-600 dark:text-gray-400">
          {row.original.day} · {formatTime(row.original.start_time)} –{' '}
          {formatTime(row.original.end_time)}
        </span>
      ),
    },
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
                  onClick={() => handleApproveClick(r)}
                  disabled={approveMutation.isPending || approveCheckPending}
                  title="Approve"
                  className="flex h-7 w-7 items-center justify-center rounded-full bg-green-100 text-green-600 transition hover:bg-green-200 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-green-500/15 dark:hover:bg-green-500/25"
                >
                  {approveCheckPending ? (
                    <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-green-600 border-t-transparent" />
                  ) : (
                    <Check size={14} />
                  )}
                </button>
                <button
                  onClick={() => setRejectTarget(r)}
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
              placeholder="Search by faculty, course code, room..."
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

      {/* Approval blocked — show reasons */}
      <Modal isOpen={!!approveBlock} onClose={() => setApproveBlock(null)} className="sm:max-w-md">
        <div className="mb-4 flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-100 dark:bg-red-500/15">
            <AlertTriangle size={18} className="text-red-500" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">
              Cannot Approve Request
            </h3>
            <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
              The following issues must be resolved before this request can be approved.
            </p>
          </div>
        </div>
        <ul className="space-y-2">
          {approveBlock?.reasons.map((reason, i) => (
            <li
              key={i}
              className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-400"
            >
              <AlertTriangle size={14} className="mt-0.5 shrink-0" />
              {reason}
            </li>
          ))}
        </ul>
        <div className="mt-5 flex gap-3">
          <Button variant="outline" className="flex-1" onClick={() => setApproveBlock(null)}>
            Dismiss
          </Button>
          <Button
            className="flex-1"
            onClick={() => {
              router.push(`/reservations?edit=${approveBlock!.reservation.id}`);
              setApproveBlock(null);
            }}
          >
            Edit Reservation
          </Button>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={!!approveTarget}
        onClose={() => setApproveTarget(null)}
        onConfirm={confirmApprove}
        title="Approve Request"
        message={
          approveTarget
            ? `Approve ${approveTarget.prof}'s request for ${approveTarget.course_code} in ${approveTarget.room} (${approveTarget.day} · ${formatTime(approveTarget.start_time)}–${formatTime(approveTarget.end_time)})?`
            : ''
        }
        confirmLabel="Approve"
        loadingText="Approving..."
        variant="success"
        isLoading={approveMutation.isPending}
      />

      <ConfirmDialog
        isOpen={!!rejectTarget}
        onClose={() => setRejectTarget(null)}
        onConfirm={confirmReject}
        title="Reject Request"
        message={
          rejectTarget
            ? `Reject ${rejectTarget.prof}'s request for ${rejectTarget.course_code} in ${rejectTarget.room}? This cannot be undone.`
            : ''
        }
        confirmLabel="Reject"
        loadingText="Rejecting..."
        variant="danger"
        isLoading={rejectMutation.isPending}
      />

      <ConfirmDialog
        isOpen={!!deleteId}
        onClose={() => setDeleteId('')}
        onConfirm={() =>
          deleteMutation.mutate(deleteId, {
            onSuccess: () => {
              toast.success('Request deleted');
              setDeleteId('');
            },
          })
        }
        title="Delete Request"
        message="This request will be permanently deleted."
        confirmLabel="Delete"
        loadingText="Deleting..."
        variant="danger"
        isLoading={deleteMutation.isPending}
      />
    </>
  );
}
