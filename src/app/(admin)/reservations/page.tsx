'use client';

import { detectConflict } from '@/actions/reservations';
import { PageBreadcrumb, TimeSlotPicker } from '@/components/common';
import {
  useApprovedReservations,
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
import { cn } from '@/lib/utils';
import { zodResolver } from '@hookform/resolvers/zod';
import type { Reservation } from '@prisma/client';
import type { ColumnDef } from '@tanstack/react-table';
import { AlertTriangle, Clock, Info, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';

const statusColor: Record<string, 'warning' | 'success' | 'error' | 'light'> = {
  pending: 'warning',
  approved: 'success',
  rejected: 'error',
};

const normalizeYear = (raw: string): ReservationFormData['year'] => {
  const map: Record<string, ReservationFormData['year']> = {
    '1': '1st Year',
    '2': '2nd Year',
    '3': '3rd Year',
    '4': '4th Year',
    '5': '5th Year',
  };
  return map[raw] ?? (raw as ReservationFormData['year']);
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
      accessorKey: 'course',
      header: 'Course',
      cell: ({ getValue }) => (
        <span className="text-sm font-medium text-gray-900 dark:text-white">
          {String(getValue())}
        </span>
      ),
    },
    {
      accessorKey: 'year',
      header: 'Year',
      cell: ({ getValue }) => (
        <span className="text-sm text-gray-700 dark:text-gray-300">{String(getValue())}</span>
      ),
    },
    {
      accessorKey: 'section',
      header: 'Section',
      cell: ({ getValue }) => (
        <span className="text-sm text-gray-700 dark:text-gray-300">{String(getValue())}</span>
      ),
    },
    {
      accessorKey: 'course_code',
      header: 'Course Code',
      cell: ({ getValue }) => (
        <span className="text-sm font-medium text-gray-900 dark:text-white">
          {String(getValue())}
        </span>
      ),
    },
    {
      accessorKey: 'course_title',
      header: 'Course Title',
      cell: ({ getValue }) => (
        <span className="text-sm text-gray-700 dark:text-gray-300">{String(getValue())}</span>
      ),
    },
    {
      id: 'units',
      enableSorting: false,
      header: () => (
        <div>
          <p>No. of Units</p>
          <div className="mt-0.5 flex gap-6 text-[10px] font-normal text-gray-400">
            <span>Lec</span>
            <span>Lab</span>
          </div>
        </div>
      ),
      cell: ({ row }) => (
        <div className="flex gap-6 text-sm text-gray-600 dark:text-gray-400">
          <span>{row.original.lec_units ?? '—'}</span>
          <span>{row.original.lab_units ?? '—'}</span>
        </div>
      ),
    },
    {
      id: 'time',
      header: 'Time',
      enableSorting: false,
      cell: ({ row }) => (
        <span className="whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
          {formatTime(row.original.start_time)} – {formatTime(row.original.end_time)}
        </span>
      ),
    },
    {
      accessorKey: 'day',
      header: 'Day',
      cell: ({ getValue }) => (
        <span className="rounded bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700 dark:bg-gray-700 dark:text-gray-300">
          {String(getValue())}
        </span>
      ),
    },
    {
      accessorKey: 'room',
      header: 'Bldg & Room',
      cell: ({ getValue }) => (
        <span className="rounded bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700 dark:bg-gray-700 dark:text-gray-300">
          {String(getValue())}
        </span>
      ),
    },
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
  const { data: allApproved = [] } = useApprovedReservations();
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
    setValue,
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
              year: normalizeYear(editItem.year),
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
  const watchStart = watch('start_time');
  const watchEnd = watch('end_time');

  // Approved reservations for the selected room+day, excluding the item being edited
  const roomDayReservations = useMemo(
    () =>
      watchRoom && watchDay
        ? allApproved.filter(
            (r) => r.room === watchRoom && r.day === watchDay && r.id !== editItem?.id
          )
        : [],
    [allApproved, watchRoom, watchDay, editItem?.id]
  );

  const showPicker = !!(watchRoom && watchDay);

  useEffect(() => {
    if (!watchRoom || !watchDay || !watchStart || !watchEnd) {
      setConflict(null);
      return;
    }
    let cancelled = false;
    setCheckingConflict(true);
    detectConflict(watchRoom, watchDay, watchStart, watchEnd, editItem?.id).then((result) => {
      if (!cancelled) {
        setConflict(result.hasConflict ? (result.conflicting ?? null) : null);
        setCheckingConflict(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [watchRoom, watchDay, watchStart, watchEnd, editItem?.id]);

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

        {/* Time slot picker */}
        {showPicker ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-200">
                Room Availability
              </p>
              {watchStart && watchEnd ? (
                <div className="flex items-center gap-1.5 rounded-lg border border-brand-200 bg-brand-50 px-3 py-1.5 dark:border-brand-500/30 dark:bg-brand-500/10">
                  <Clock size={12} className="text-brand-500" />
                  <span className="text-xs font-semibold text-brand-700 dark:text-brand-300">
                    {formatTime(watchStart)} – {formatTime(watchEnd)}
                  </span>
                </div>
              ) : (
                <p className="flex items-center gap-1 text-xs text-gray-400">
                  <Info size={12} />
                  Click a free slot to begin
                </p>
              )}
            </div>

            <TimeSlotPicker
              reservations={roomDayReservations}
              selectedStart={watchStart ?? ''}
              selectedEnd={watchEnd ?? ''}
              onSelect={(start, end) => {
                setValue('start_time', start, { shouldValidate: true });
                setValue('end_time', end, { shouldValidate: true });
              }}
            />

            {(errors.start_time || errors.end_time) && (
              <p className="text-xs text-red-500">
                {errors.start_time?.message ?? errors.end_time?.message}
              </p>
            )}

            <details className="text-xs">
              <summary className="cursor-pointer text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                Enter time manually instead
              </summary>
              <div className="mt-2 grid grid-cols-2 gap-3">
                <Input
                  label="Start Time"
                  type="time"
                  error={!!errors.start_time}
                  {...register('start_time')}
                />
                <Input
                  label="End Time"
                  type="time"
                  error={!!errors.end_time}
                  {...register('end_time')}
                />
              </div>
            </details>
          </div>
        ) : (
          <div
            className={cn(
              'flex items-center gap-2 rounded-xl border border-dashed px-4 py-4 text-sm text-gray-400',
              errors.start_time || errors.end_time
                ? 'border-red-300 bg-red-50 dark:border-red-500/30 dark:bg-red-500/5'
                : 'border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900'
            )}
          >
            <Clock size={16} />
            Select a room and day pattern above to choose a time slot.
          </div>
        )}

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
