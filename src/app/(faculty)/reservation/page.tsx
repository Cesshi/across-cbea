'use client';

import { useCreateReservation } from '@/components/hooks/use-reservations';
import { useRooms } from '@/components/hooks/use-rooms';
import { Input, Select, Textarea } from '@/components/ui';
import { requestSchema, type RequestFormData } from '@/lib';
import { DAY_PATTERNS, RESTRICTED_ROOMS, YEAR_LEVELS } from '@/lib/constants';
import { useAuthStore } from '@/store';
import { zodResolver } from '@hookform/resolvers/zod';
import { CheckCircle2, ChevronRight } from 'lucide-react';
import { useMemo, useState } from 'react';
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
  const createMutation = useCreateReservation();

  const [step, setStep] = useState<Step>('form');
  const [mode, setMode] = useState<Mode>('new');

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

  const availableRooms = useMemo(
    () =>
      rooms.filter(
        (r) =>
          r.is_active && !RESTRICTED_ROOMS.includes(r.name as (typeof RESTRICTED_ROOMS)[number])
      ),
    [rooms]
  );

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
    if (m === 'new') {
      setValue('from_day', null);
      setValue('from_start_time', null);
      setValue('from_end_time', null);
    }
  };

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
  const fromDayOptions = DAY_PATTERNS.map((d) => ({ value: d, label: d }));

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
            className={`flex-1 rounded-lg py-2 text-sm font-medium transition ${
              mode === m
                ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-white'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'
            }`}
          >
            {m === 'new' ? 'New Schedule' : 'Change Existing Schedule'}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {/* Class info */}
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

        {/* Subject info */}
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

        {/* Faculty info */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label="Faculty Name"
            required
            error={!!errors.prof}
            hint={errors.prof?.message}
            {...register('prof')}
          />
          <Input
            label="Email (optional)"
            type="email"
            placeholder="your@email.com"
            error={!!errors.email}
            hint={errors.email?.message}
            {...register('email')}
          />
        </div>

        {/* Room */}
        <Select
          label="Room"
          required
          placeholder="Select a room..."
          options={roomOptions}
          error={!!errors.room}
          hint={errors.room?.message}
          {...register('room')}
        />

        {/* Change mode: FROM schedule */}
        {mode === 'change' && (
          <div className="rounded-xl border border-orange-200 bg-orange-50 p-4 dark:border-orange-500/20 dark:bg-orange-500/5">
            <p className="mb-3 text-xs font-semibold text-orange-700 dark:text-orange-400">
              Current Schedule to Vacate
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Select
                label="Day Pattern"
                placeholder="Select day..."
                options={fromDayOptions}
                {...register('from_day')}
              />
              <Input label="Start Time" type="time" {...register('from_start_time')} />
              <Input label="End Time" type="time" {...register('from_end_time')} />
            </div>
          </div>
        )}

        {/* New schedule */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Select
            label={mode === 'change' ? 'New Day Pattern' : 'Day Pattern'}
            required
            placeholder="Select day..."
            options={dayOptions}
            error={!!errors.day}
            hint={errors.day?.message}
            {...register('day')}
          />
          <Input
            label={mode === 'change' ? 'New Start Time' : 'Start Time'}
            type="time"
            required
            error={!!errors.start_time}
            hint={errors.start_time?.message}
            {...register('start_time')}
          />
          <Input
            label={mode === 'change' ? 'New End Time' : 'End Time'}
            type="time"
            required
            error={!!errors.end_time}
            hint={errors.end_time?.message}
            {...register('end_time')}
          />
        </div>

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
