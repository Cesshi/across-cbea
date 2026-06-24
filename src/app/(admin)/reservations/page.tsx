'use client';

import { PageBreadcrumb } from '@/components/common';
import { useRooms } from '@/components/hooks/use-rooms';
import {
  useCreateReservation,
  useDeleteReservation,
  useReservations,
  useUpdateReservation,
} from '@/components/hooks/use-reservations';
import {
  Badge,
  Button,
  ConfirmDialog,
  DataTable,
  Input,
  Modal,
  Select,
  Textarea,
} from '@/components/ui';
import { DAY_PATTERNS, RESERVATION_STATUSES, TIME_SLOTS, reservationSchema, type ReservationFormData } from '@/lib';
import { detectConflict } from '@/actions/reservations';
import { zodResolver } from '@hookform/resolvers/zod';
import type { ColumnDef } from '@tanstack/react-table';
import { AlertTriangle, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
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

const statusColor: Record<string, 'warning' | 'success' | 'error' | 'light'> = {
  pending: 'warning',
  approved: 'success',
  rejected: 'error',
};

function ReservationModal({
  isOpen,
  onClose,
  editItem,
}: {
  isOpen: boolean;
  onClose: () => void;
  editItem: Reservation | null;
}) {
  const { data: rooms = [] } = useRooms();
  const createMutation = useCreateReservation();
  const updateMutation = useUpdateReservation();
  const isPending = createMutation.isPending || updateMutation.isPending;

  const [conflict, setConflict] = useState<{ prof: string; subj: string; group: string } | null>(
    null
  );
  const [checkingConflict, setCheckingConflict] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<ReservationFormData>({
    resolver: zodResolver(reservationSchema),
    defaultValues: {
      prof: '',
      subj: '',
      group: '',
      email: '',
      room: '',
      day: 'MWF',
      time_slot: '',
      notes: '',
      status: 'approved',
    },
  });

  useEffect(() => {
    if (isOpen) {
      reset(
        editItem
          ? {
              prof: editItem.prof,
              subj: editItem.subj,
              group: editItem.group,
              email: editItem.email ?? '',
              room: editItem.room,
              day: editItem.day as ReservationFormData['day'],
              time_slot: editItem.time_slot,
              notes: editItem.notes ?? '',
              status: editItem.status as ReservationFormData['status'],
            }
          : {
              prof: '',
              subj: '',
              group: '',
              email: '',
              room: '',
              day: 'MWF',
              time_slot: '',
              notes: '',
              status: 'approved',
            }
      );
      setConflict(null);
    }
  }, [isOpen, editItem, reset]);

  // Real-time conflict detection
  const watchRoom = watch('room');
  const watchDay = watch('day');
  const watchSlot = watch('time_slot');

  useEffect(() => {
    if (!watchRoom || !watchDay || !watchSlot) {
      setConflict(null);
      return;
    }
    let cancelled = false;
    setCheckingConflict(true);
    detectConflict(watchRoom, watchDay, watchSlot, editItem?.id).then((result) => {
      if (!cancelled) {
        setConflict(result.hasConflict ? (result.conflicting ?? null) : null);
        setCheckingConflict(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [watchRoom, watchDay, watchSlot, editItem?.id]);

  const onSubmit = async (data: ReservationFormData) => {
    if (conflict && data.status === 'approved') {
      toast.error('Cannot save: this slot has a conflict. Change the status to pending or pick another slot.');
      return;
    }
    try {
      if (editItem) {
        await updateMutation.mutateAsync({ id: editItem.id, data });
        toast.success('Reservation updated');
      } else {
        await createMutation.mutateAsync(data);
        toast.success('Reservation added');
      }
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong');
    }
  };

  const roomOptions = rooms.map((r) => ({ value: r.name, label: `${r.name} (${r.type})` }));
  const dayOptions = DAY_PATTERNS.map((d) => ({ value: d, label: d }));
  const timeOptions = TIME_SLOTS.map((s) => ({ value: s, label: s }));
  const statusOptions = RESERVATION_STATUSES.map((s) => ({
    value: s,
    label: s.charAt(0).toUpperCase() + s.slice(1),
  }));

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <h2 className="mb-1 text-lg font-semibold text-gray-900 dark:text-white">
        {editItem ? 'Edit Reservation' : 'Add Reservation'}
      </h2>
      <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">
        Admin-added reservations are approved by default.
      </p>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label="Faculty Name"
            required
            placeholder="e.g. Dr. Juan Dela Cruz"
            error={!!errors.prof}
            hint={errors.prof?.message}
            {...register('prof')}
          />
          <Input
            label="Course Code"
            required
            placeholder="e.g. ACC 101"
            error={!!errors.subj}
            hint={errors.subj?.message}
            {...register('subj')}
          />
          <Input
            label="Group / Section"
            required
            placeholder="e.g. BSAC 2-A"
            error={!!errors.group}
            hint={errors.group?.message}
            {...register('group')}
          />
          <Input
            label="Email (optional)"
            type="email"
            placeholder="faculty@mmsu.edu.ph"
            error={!!errors.email}
            hint={errors.email?.message}
            {...register('email')}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Select
            label="Room"
            required
            placeholder="Select room..."
            options={roomOptions}
            error={!!errors.room}
            hint={errors.room?.message}
            {...register('room')}
          />
          <Select
            label="Day Pattern"
            required
            options={dayOptions}
            error={!!errors.day}
            hint={errors.day?.message}
            {...register('day')}
          />
          <Select
            label="Time Slot"
            required
            placeholder="Select time..."
            options={timeOptions}
            error={!!errors.time_slot}
            hint={errors.time_slot?.message}
            {...register('time_slot')}
          />
        </div>

        {/* Conflict alert */}
        {checkingConflict && (
          <p className="text-xs text-gray-400">Checking for conflicts...</p>
        )}
        {conflict && !checkingConflict && (
          <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-500/30 dark:bg-amber-500/10">
            <AlertTriangle size={16} className="mt-0.5 shrink-0 text-amber-500" />
            <div className="text-sm text-amber-700 dark:text-amber-400">
              <p className="font-medium">Scheduling conflict detected</p>
              <p className="text-xs">
                {conflict.prof} — {conflict.subj} ({conflict.group}) already has this slot.
              </p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Select
            label="Status"
            required
            options={statusOptions}
            error={!!errors.status}
            hint={errors.status?.message}
            {...register('status')}
          />
          <div />
        </div>

        <Textarea
          label="Notes (optional)"
          placeholder="Any additional information..."
          rows={3}
          {...register('notes')}
        />

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isPending} loadingText="Saving...">
            {editItem ? 'Update' : 'Add Reservation'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export default function ReservationsPage() {
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<Reservation | null>(null);
  const [deleteId, setDeleteId] = useState('');

  const { data: reservations = [], isPending, isFetching } = useReservations(debounced);
  const deleteMutation = useDeleteReservation();

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query), 400);
    return () => clearTimeout(t);
  }, [query]);

  const openAdd = () => {
    setEditItem(null);
    setModalOpen(true);
  };
  const openEdit = (item: Reservation) => {
    setEditItem(item);
    setModalOpen(true);
  };
  const closeModal = () => {
    setModalOpen(false);
    setEditItem(null);
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
      id: 'actions',
      header: 'Actions',
      enableSorting: false,
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <button
            onClick={() => openEdit(row.original)}
            className="hover:text-brand-500 text-gray-400 transition"
          >
            <Pencil size={16} />
          </button>
          <button
            onClick={() => setDeleteId(row.original.id)}
            className="hover:text-error-500 text-gray-400 transition"
            disabled={deleteMutation.isPending}
          >
            <Trash2 size={16} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <>
      <div className="space-y-6">
        <PageBreadcrumb pageTitle="Reservations" />

        <div className="flex flex-wrap items-center justify-between gap-3">
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
          <Button onClick={openAdd} startIcon={<Plus size={16} />}>
            Add Reservation
          </Button>
        </div>

        <DataTable
          columns={columns}
          data={reservations as Reservation[]}
          globalFilter={debounced}
          loading={isPending || isFetching}
          emptyMessage="No reservations found"
        />
      </div>

      <ReservationModal isOpen={modalOpen} onClose={closeModal} editItem={editItem} />

      <ConfirmDialog
        isOpen={!!deleteId}
        onClose={() => setDeleteId('')}
        onConfirm={() => deleteMutation.mutate(deleteId, { onSuccess: () => setDeleteId('') })}
        title="Delete Reservation"
        message="This reservation will be permanently deleted."
        confirmLabel="Delete"
        isLoading={deleteMutation.isPending}
      />
    </>
  );
}
