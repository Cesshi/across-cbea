'use client';

import { TimeSlotPicker } from '@/components/common';
import { useApprovedReservations, useCreateReservation } from '@/components/hooks/use-reservations';
import { useRooms } from '@/components/hooks/use-rooms';
import { ConfirmDialog, Input, Select, Textarea } from '@/components/ui';
import { requestSchema, type RequestFormData } from '@/lib';
import {
  DAY_PATTERNS,
  RESTRICTED_ROOMS,
  YEAR_LEVELS,
  daysOverlap,
  formatTime,
} from '@/lib/constants';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store';
import { zodResolver } from '@hookform/resolvers/zod';
import type { Reservation } from '@prisma/client';
import { CheckCircle2, ChevronRight, Clock, Info } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';

type Mode = 'new' | 'change';
type Step = 'form' | 'success';

const DEFAULT_VALUES: RequestFormData = {
  prof: '',
  email: '',
  course: '',
  year: YEAR_LEVELS[0],
  section: '',
  course_code: '',
  course_title: '',
  lec_units: '',
  lab_units: '',
  room: '',
  day: '' as RequestFormData['day'],
  start_time: '',
  end_time: '',
  notes: '',
  status: 'pending',
  is_change_request: false,
  from_room: null,
  from_day: null,
  from_start_time: null,
  from_end_time: null,
};

export default function ReservationPage() {
  const { userProfile } = useAuthStore();
  const { data: rooms = [] } = useRooms();
  const { data: allReservations = [] } = useApprovedReservations();
  const createMutation = useCreateReservation();

  const [step, setStep] = useState<Step>('form');
  const [mode, setMode] = useState<Mode>('new');

  // Change mode: reservation the user clicked (awaiting confirm) and confirmed target
  const [pendingChange, setPendingChange] = useState<Reservation | null>(null);
  const [changeTarget, setChangeTarget] = useState<Reservation | null>(null);

  const [subjectOpen, setSubjectOpen] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    reset,
    setValue,
    formState: { errors },
  } = useForm<RequestFormData>({
    resolver: zodResolver(requestSchema),
    defaultValues: {
      ...DEFAULT_VALUES,
      prof: userProfile?.full_name ?? '',
      email: userProfile?.email ?? '',
    },
  });

  const watchRoom = watch('room');
  const watchDay = watch('day');
  const watchStart = watch('start_time');
  const watchEnd = watch('end_time');

  const hasSubjectErrors = !!(
    errors.course ||
    errors.year ||
    errors.section ||
    errors.course_code ||
    errors.course_title ||
    errors.lec_units ||
    errors.lab_units
  );

  useEffect(() => {
    if (hasSubjectErrors) setSubjectOpen(true);
  }, [hasSubjectErrors]);

  const availableRooms = useMemo(
    () =>
      rooms.filter(
        (r) =>
          r.is_active && !RESTRICTED_ROOMS.includes(r.name as (typeof RESTRICTED_ROOMS)[number])
      ),
    [rooms]
  );

  // Reservations for the currently selected room + day
  const roomDayReservations = useMemo(
    () =>
      watchRoom && watchDay
        ? allReservations.filter((r) => r.room === watchRoom && daysOverlap(r.day, watchDay))
        : [],
    [allReservations, watchRoom, watchDay]
  );

  const showPicker = !!(watchRoom && watchDay);

  const onSubmit = async (data: RequestFormData) => {
    const changeNote =
      mode === 'change' && data.from_day && data.from_start_time
        ? `[Change Request] From: ${data.from_day} ${data.from_start_time}–${data.from_end_time}`
        : null;
    const combinedNotes = [changeNote, data.notes || null].filter(Boolean).join('. ') || null;

    try {
      await createMutation.mutateAsync({
        prof: data.prof,
        course: data.course,
        year: data.year,
        section: data.section,
        course_code: data.course_code,
        course_title: data.course_title,
        lec_units: data.lec_units || null,
        lab_units: data.lab_units || null,
        email: data.email || null,
        room: data.room,
        day: data.day,
        start_time: data.start_time,
        end_time: data.end_time,
        notes: combinedNotes,
        status: 'pending',
      });
      setStep('success');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong');
    }
  };

  const handleModeChange = (m: Mode) => {
    setMode(m);
    setValue('is_change_request', m === 'change');
    setValue('from_room', null);
    setValue('from_day', null);
    setValue('from_start_time', null);
    setValue('from_end_time', null);
    setValue('start_time', '');
    setValue('end_time', '');
    setPendingChange(null);
    setChangeTarget(null);
    setSubjectOpen(false);
  };

  function confirmChangeTarget() {
    if (!pendingChange) return;
    setChangeTarget(pendingChange);
    // Populate class info from the selected reservation so user doesn't re-type it
    setValue('course', pendingChange.course);
    setValue('year', normalizeYear(pendingChange.year));
    setValue('section', pendingChange.section);
    setValue('course_code', pendingChange.course_code);
    setValue('course_title', pendingChange.course_title);
    setValue('lec_units', pendingChange.lec_units ?? '');
    setValue('lab_units', pendingChange.lab_units ?? '');
    setValue('from_room', pendingChange.room);
    setValue('from_day', pendingChange.day as RequestFormData['from_day']);
    setValue('from_start_time', pendingChange.start_time);
    setValue('from_end_time', pendingChange.end_time);
    setValue('start_time', '', { shouldValidate: false });
    setValue('end_time', '', { shouldValidate: false });
    setPendingChange(null);
  }

  function normalizeYear(raw: string): RequestFormData['year'] {
    const map: Record<string, RequestFormData['year']> = {
      '1': '1st Year',
      '2': '2nd Year',
      '3': '3rd Year',
      '4': '4th Year',
      '5': '5th Year',
    };
    return map[raw] ?? (raw as RequestFormData['year']);
  }

  if (step === 'success') {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
        <CheckCircle2 size={48} className="mb-4 text-green-500" />
        <h2 className="mb-2 text-xl font-bold text-gray-900 dark:text-white">Request Submitted!</h2>
        <p className="mb-6 max-w-sm text-sm text-gray-500 dark:text-gray-400">
          Your reservation request for <strong>{watchRoom}</strong> has been submitted and is
          pending approval.
        </p>
        <button
          onClick={() => {
            setStep('form');
            setMode('new');
            reset({
              ...DEFAULT_VALUES,
              prof: userProfile?.full_name ?? '',
              email: userProfile?.email ?? '',
            });
          }}
          className="flex items-center gap-1.5 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
        >
          Submit Another <ChevronRight size={16} />
        </button>
      </div>
    );
  }

  const roomOptions = availableRooms.map((r) => ({
    value: r.name,
    label: `${r.name} (${r.type}) — ${r.capacity} pax`,
  }));
  const dayOptions = DAY_PATTERNS.map((d) => ({ value: d, label: d }));
  const yearOptions = YEAR_LEVELS.map((y) => ({ value: y, label: y }));

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">Room Reservation</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Submit a room reservation request for approval.
        </p>
      </div>

      {/* Mode toggle */}
      <div className="mb-6 flex gap-1 rounded-xl border border-gray-200 bg-gray-50 p-1 dark:border-gray-700 dark:bg-gray-800">
        {(['new', 'change'] as Mode[]).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => handleModeChange(m)}
            className={cn(
              'flex-1 rounded-lg py-2 text-sm font-medium transition',
              mode === m
                ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-white'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'
            )}
          >
            {m === 'new' ? 'New Schedule' : 'Change Existing Schedule'}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {/* Class info — always shown in new mode; collapsible in change mode */}
        {mode === 'new' && (
          <>
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
                label="Year Level"
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

            {/* Faculty info */}
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
                label="Email (optional)"
                type="email"
                placeholder="faculty@mmsu.edu.ph"
                error={!!errors.email}
                hint={errors.email?.message}
                {...register('email')}
              />
            </div>
          </>
        )}

        {/* Room + Day */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Select
            label="Room"
            required
            placeholder="Select a room..."
            options={roomOptions}
            error={!!errors.room}
            hint={errors.room?.message}
            {...register('room')}
          />
          <Select
            label={mode === 'change' ? 'New Day Pattern' : 'Day Pattern'}
            required
            placeholder="Select day..."
            options={dayOptions}
            error={!!errors.day}
            hint={errors.day?.message}
            {...register('day')}
          />
        </div>
        {/* Time slot picker — shown after room + day are selected */}
        {showPicker ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-700 dark:text-gray-200">
                  {mode === 'change' && !changeTarget
                    ? 'Select a schedule to change'
                    : mode === 'change' && changeTarget
                      ? 'Pick your new time slot'
                      : 'Room Availability'}
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500">
                  {watchRoom} &mdash; {watchDay}
                </p>
              </div>
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
                  {mode === 'change' && !changeTarget
                    ? 'Click a reservation to change it'
                    : 'Click a free slot to begin'}
                </p>
              )}
            </div>

            {/* Change target banner */}
            {mode === 'change' && changeTarget && (
              <div className="flex items-center justify-between gap-2 rounded-lg border border-orange-200 bg-orange-50 px-3 py-2 dark:border-orange-500/20 dark:bg-orange-500/5">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-orange-400" />
                  <span className="text-xs text-orange-700 dark:text-orange-300">
                    Changing{' '}
                    <strong>
                      {changeTarget.course_code} — {formatTime(changeTarget.start_time)}–
                      {formatTime(changeTarget.end_time)}
                    </strong>
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setChangeTarget(null);
                    setValue('from_room', null);
                    setValue('from_day', null);
                    setValue('from_start_time', null);
                    setValue('from_end_time', null);
                    setValue('start_time', '');
                    setValue('end_time', '');
                  }}
                  className="text-xs text-orange-500 underline hover:text-orange-700"
                >
                  Cancel
                </button>
              </div>
            )}

            <TimeSlotPicker
              reservations={roomDayReservations}
              selectedStart={watchStart ?? ''}
              selectedEnd={watchEnd ?? ''}
              changeTarget={mode === 'change' ? changeTarget : null}
              onOccupiedClick={mode === 'change' && !changeTarget ? setPendingChange : undefined}
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

            {/* Manual override */}
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
          <div className="flex items-center gap-2 rounded-xl border border-dashed border-gray-200 bg-gray-50 px-4 py-5 text-sm text-gray-400 dark:border-gray-700 dark:bg-gray-900">
            <Clock size={16} />
            Select a room and day pattern above to choose your time slot.
          </div>
        )}
        {/* Confirm change dialog */}
        <ConfirmDialog
          isOpen={!!pendingChange}
          onClose={() => setPendingChange(null)}
          onConfirm={confirmChangeTarget}
          variant="primary"
          title="Change this schedule?"
          confirmLabel="Yes, change it"
          message={
            pendingChange
              ? `${pendingChange.course_code} — ${formatTime(pendingChange.start_time)}–${formatTime(pendingChange.end_time)} · ${pendingChange.prof}`
              : ''
          }
        />

        {mode === 'change' && (
          // Change mode: class details auto-filled from selected reservation, collapsible
          <details
            open={subjectOpen}
            onToggle={(e) => setSubjectOpen((e.target as HTMLDetailsElement).open)}
            className="rounded-xl border border-gray-200 dark:border-gray-700"
          >
            <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-sm font-medium text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white [&::-webkit-details-marker]:hidden">
              <span className={cn(hasSubjectErrors && 'text-red-500 dark:text-red-400')}>
                Subject details{hasSubjectErrors ? ' — fix required fields' : ''}
              </span>
              <ChevronRight
                size={15}
                className={cn(
                  'transition-transform duration-200',
                  subjectOpen ? 'rotate-90' : '',
                  hasSubjectErrors ? 'text-red-400' : 'text-gray-400'
                )}
              />
            </summary>
            <div className="space-y-4 border-t border-gray-200 px-4 py-4 dark:border-gray-700">
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
                  label="Year Level"
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

              {/* Faculty info */}
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
                  label="Email (optional)"
                  type="email"
                  placeholder="faculty@mmsu.edu.ph"
                  error={!!errors.email}
                  hint={errors.email?.message}
                  {...register('email')}
                />
              </div>
            </div>
          </details>
        )}

        {/* Notes */}
        <Textarea
          label="Notes (optional)"
          rows={3}
          placeholder="Additional information..."
          {...register('notes')}
        />
        <button
          type="submit"
          disabled={createMutation.isPending}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-500 py-3 text-sm font-semibold text-white transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {createMutation.isPending ? 'Submitting...' : 'Submit Request'}
        </button>
      </form>
    </div>
  );
}
