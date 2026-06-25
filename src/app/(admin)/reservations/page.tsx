'use client';

import { detectConflict } from '@/actions/reservations';
import { PageBreadcrumb } from '@/components/common';
import {
  useCreateReservation,
  useDeleteReservation,
  useReservations,
  useUpdateReservation,
} from '@/components/hooks/use-reservations';
import { useRooms } from '@/components/hooks/use-rooms';
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
import {
  DAY_PATTERNS,
  RESERVATION_STATUSES,
  YEAR_LEVELS,
  formatTime,
  reservationSchema,
  type ReservationFormData,
} from '@/lib';
import { zodResolver } from '@hookform/resolvers/zod';
import type { Reservation } from '@prisma/client';
import type { ColumnDef } from '@tanstack/react-table';
import { AlertTriangle, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';

const statusColor: Record<string, 'warning' | 'success' | 'error' | 'light'> = {
  pending: 'warning',
  approved: 'success',
  rejected: 'error',
};

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
      cell: ({ row }) => (
        <div>
          <p className="font-medium text-gray-900 dark:text-white">{row.original.prof}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">{row.original.email ?? ''}</p>
        </div>
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
      id: 'units',
      header: 'Units',
      cell: ({ row }) => (
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {row.original.lec_units ?? '—'} Lec / {row.original.lab_units ?? '—'} Lab
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
              placeholder="Search by faculty, course code, room..."
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

  const [conflict, setConflict] = useState<{
    prof: string;
    course_code: string;
    section: string;
  } | null>(null);
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
      course: '',
      year: '1st Year',
      section: '',
      course_code: '',
      course_title: '',
      lec_units: '',
      lab_units: '',
      email: '',
      room: '',
      day: 'MWF',
      start_time: '',
      end_time: '',
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
              course: editItem.course,
              year: editItem.year as ReservationFormData['year'],
              section: editItem.section,
              course_code: editItem.course_code,
              course_title: editItem.course_title,
              lec_units: editItem.lec_units ?? '',
              lab_units: editItem.lab_units ?? '',
              email: editItem.email ?? '',
              room: editItem.room,
              day: editItem.day as ReservationFormData['day'],
              start_time: editItem.start_time,
              end_time: editItem.end_time,
              notes: editItem.notes ?? '',
              status: editItem.status as ReservationFormData['status'],
            }
          : {
              prof: '',
              course: '',
              year: '1st Year',
              section: '',
              course_code: '',
              course_title: '',
              lec_units: '',
              lab_units: '',
              email: '',
              room: '',
              day: 'MWF',
              start_time: '',
              end_time: '',
              notes: '',
              status: 'approved',
            }
      );
      setConflict(null);
    }
  }, [isOpen, editItem, reset]);

  const watchRoom = watch('room');
  const watchDay = watch('day');
  const watchStartTime = watch('start_time');
  const watchEndTime = watch('end_time');

  useEffect(() => {
    if (!watchRoom || !watchDay || !watchStartTime || !watchEndTime) {
      setConflict(null);
      return;
    }
    let cancelled = false;
    setCheckingConflict(true);
    detectConflict(watchRoom, watchDay, watchStartTime, watchEndTime, editItem?.id).then(
      (result) => {
        if (!cancelled) {
          setConflict(result.hasConflict ? (result.conflicting ?? null) : null);
          setCheckingConflict(false);
        }
      }
    );
    return () => {
      cancelled = true;
    };
  }, [watchRoom, watchDay, watchStartTime, watchEndTime, editItem?.id]);

  const onSubmit = async (data: ReservationFormData) => {
    if (conflict && data.status === 'approved') {
      toast.error(
        'Cannot save: this slot has a conflict. Change the status to pending or pick another slot.'
      );
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
  const yearOptions = YEAR_LEVELS.map((y) => ({ value: y, label: y }));
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
        {/* Course + Year + Section */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Input
            label="Course / Program"
            required
            placeholder="e.g. BSAC"
            error={!!errors.course}
            hint={errors.course?.message}
            {...register('course')}
          />
          <Select
            label="Year"
            required
            options={yearOptions}
            error={!!errors.year}
            hint={errors.year?.message}
            {...register('year')}
          />
          <Input
            label="Section"
            required
            placeholder="e.g. A"
            error={!!errors.section}
            hint={errors.section?.message}
            {...register('section')}
          />
        </div>

        {/* Course Code + Title */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label="Course Code"
            required
            placeholder="e.g. ACC 101"
            error={!!errors.course_code}
            hint={errors.course_code?.message}
            {...register('course_code')}
          />
          <Input
            label="Course Title"
            required
            placeholder="e.g. Financial Accounting"
            error={!!errors.course_title}
            hint={errors.course_title?.message}
            {...register('course_title')}
          />
        </div>

        {/* Units */}
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Lec Units"
            placeholder="e.g. 3"
            error={!!errors.lec_units}
            hint={errors.lec_units?.message}
            {...register('lec_units')}
          />
          <Input
            label="Lab Units"
            placeholder="e.g. 1 (3 hours)"
            error={!!errors.lab_units}
            hint={errors.lab_units?.message}
            {...register('lab_units')}
          />
        </div>

        {/* Faculty + Email */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label="Faculty"
            required
            placeholder="e.g. Dr. Juan Dela Cruz"
            error={!!errors.prof}
            hint={errors.prof?.message}
            {...register('prof')}
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

        {/* Room + Day */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
        </div>

        {/* Start + End Time */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label="Start Time"
            type="time"
            required
            error={!!errors.start_time}
            hint={errors.start_time?.message}
            {...register('start_time')}
          />
          <Input
            label="End Time"
            type="time"
            required
            error={!!errors.end_time}
            hint={errors.end_time?.message}
            {...register('end_time')}
          />
        </div>

        {/* Conflict alert */}
        {checkingConflict && <p className="text-xs text-gray-400">Checking for conflicts...</p>}
        {conflict && !checkingConflict && (
          <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-500/30 dark:bg-amber-500/10">
            <AlertTriangle size={16} className="mt-0.5 shrink-0 text-amber-500" />
            <div className="text-sm text-amber-700 dark:text-amber-400">
              <p className="font-medium">Scheduling conflict detected</p>
              <p className="text-xs">
                {conflict.prof} — {conflict.course_code} ({conflict.section}) overlaps this slot.
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
