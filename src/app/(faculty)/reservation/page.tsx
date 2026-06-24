'use client';

import { useApprovedReservations, useCreateReservation } from '@/components/hooks/use-reservations';
import { useRooms } from '@/components/hooks/use-rooms';
import { useAuthStore } from '@/store';
import {
  DAY_PATTERN_MAP,
  RESTRICTED_ROOMS,
  SCHEDULE_DAYS,
  TIME_SLOTS,
  type DayPattern,
} from '@/lib/constants';
import { cn } from '@/lib/utils';
import { CalendarDays, CheckCircle2, ChevronRight } from 'lucide-react';
import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';

type Reservation = { id: string; room: string; day: string; time_slot: string; prof: string; subj: string };
type Mode = 'new' | 'change';
type Step = 'form' | 'success';

function SchedulePickerModal({
  isOpen,
  onClose,
  roomName,
  reservations,
  onSelect,
  selected,
}: {
  isOpen: boolean;
  onClose: () => void;
  roomName: string;
  reservations: Reservation[];
  onSelect: (day: string, slot: string) => void;
  selected: { day: string; slot: string } | null;
}) {
  if (!isOpen) return null;

  const takenSet = useMemo(() => {
    const s = new Set<string>();
    for (const r of reservations) {
      if (r.room !== roomName) continue;
      const days = DAY_PATTERN_MAP[r.day as DayPattern] ?? [r.day];
      for (const d of days) s.add(`${d}|${r.time_slot}`);
    }
    return s;
  }, [reservations, roomName]);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 pt-10">
      <div
        className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative z-10 w-full max-w-4xl rounded-2xl bg-white shadow-2xl dark:bg-gray-900">
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4 dark:border-gray-700">
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">Pick a Time Slot</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">Room: {roomName}</p>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <span className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-sm bg-green-400" /> Vacant
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-sm bg-red-400" /> Taken
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-sm bg-orange-400" /> Selected
            </span>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg px-3 py-1.5 text-sm text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            Close
          </button>
        </div>

        <div className="overflow-x-auto p-4">
          <table className="w-full min-w-[640px] border-collapse text-xs">
            <thead>
              <tr>
                <th className="w-24 border-b border-gray-200 px-2 py-2 text-left text-gray-500 dark:border-gray-700">
                  Time
                </th>
                {SCHEDULE_DAYS.map((d) => (
                  <th
                    key={d}
                    className="border-b border-gray-200 px-2 py-2 text-center font-semibold text-gray-600 dark:border-gray-700 dark:text-gray-300"
                  >
                    {d.slice(0, 3)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {TIME_SLOTS.map((slot) => (
                <tr key={slot}>
                  <td className="border-b border-r border-gray-100 px-2 py-1 font-medium text-gray-400 dark:border-gray-800">
                    {slot.split(' - ')[0]}
                  </td>
                  {SCHEDULE_DAYS.map((day) => {
                    const key = `${day}|${slot}`;
                    const isTaken = takenSet.has(key);
                    const isSelected = selected?.day === day && selected?.slot === slot;

                    return (
                      <td
                        key={day}
                        className="border-b border-r border-gray-100 p-0.5 dark:border-gray-800"
                      >
                        <button
                          disabled={isTaken}
                          onClick={() => {
                            onSelect(day, slot);
                            onClose();
                          }}
                          className={cn(
                            'h-7 w-full rounded transition',
                            isSelected
                              ? 'bg-orange-400 text-white'
                              : isTaken
                                ? 'cursor-not-allowed bg-red-100 dark:bg-red-500/20'
                                : 'bg-green-100 hover:bg-green-300 dark:bg-green-500/20 dark:hover:bg-green-500/40'
                          )}
                        />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default function ReservationPage() {
  const { userProfile } = useAuthStore();
  const { data: rooms = [] } = useRooms();
  const { data: allReservations = [] } = useApprovedReservations();
  const createMutation = useCreateReservation();

  const [step, setStep] = useState<Step>('form');
  const [mode, setMode] = useState<Mode>('new');
  const [pickerOpen, setPickerOpen] = useState(false);

  const [form, setForm] = useState({
    prof: userProfile?.full_name ?? '',
    subj: '',
    group: '',
    email: userProfile?.email ?? '',
    room: '',
    notes: '',
  });
  const [selected, setSelected] = useState<{ day: string; slot: string } | null>(null);
  const [fromSelected, setFromSelected] = useState<{ day: string; slot: string } | null>(null);
  const [fromPickerOpen, setFromPickerOpen] = useState(false);

  const availableRooms = useMemo(
    () =>
      rooms.filter(
        (r) => r.is_active && !RESTRICTED_ROOMS.includes(r.name as (typeof RESTRICTED_ROOMS)[number])
      ),
    [rooms]
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected) return toast.error('Please pick a time slot first');
    if (!form.room) return toast.error('Please select a room');

    // Map day name back to a day pattern (find patterns that include this single day)
    const dayPatternForDay = (dayName: string): string => {
      const single: Record<string, string> = {
        Monday: 'M',
        Tuesday: 'T',
        Wednesday: 'W',
        Thursday: 'TH',
        Friday: 'F',
        Saturday: 'SAT',
      };
      return single[dayName] ?? dayName;
    };

    try {
      await createMutation.mutateAsync({
        prof: form.prof,
        subj: form.subj,
        group: form.group,
        email: form.email || null,
        room: form.room,
        day: dayPatternForDay(selected.day),
        time_slot: selected.slot,
        notes: form.notes
          ? mode === 'change' && fromSelected
            ? `[Change Request] From: ${fromSelected.day} ${fromSelected.slot}. ${form.notes}`
            : form.notes
          : mode === 'change' && fromSelected
            ? `[Change Request] From: ${fromSelected.day} ${fromSelected.slot}`
            : null,
        status: 'pending',
      });
      setStep('success');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong');
    }
  };

  if (step === 'success') {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
        <CheckCircle2 size={48} className="mb-4 text-green-500" />
        <h2 className="mb-2 text-xl font-bold text-gray-900 dark:text-white">
          Request Submitted!
        </h2>
        <p className="mb-6 max-w-sm text-sm text-gray-500 dark:text-gray-400">
          Your reservation request for <strong>{form.room}</strong> has been submitted and is
          pending approval.
        </p>
        <button
          onClick={() => {
            setStep('form');
            setSelected(null);
            setFromSelected(null);
            setForm((f) => ({ ...f, subj: '', group: '', notes: '', room: '' }));
          }}
          className="flex items-center gap-1.5 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
        >
          Submit Another <ChevronRight size={16} />
        </button>
      </div>
    );
  }

  return (
    <>
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
              onClick={() => setMode(m)}
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

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-600 dark:text-gray-400">
                Faculty Name <span className="text-red-500">*</span>
              </label>
              <input
                required
                value={form.prof}
                onChange={(e) => setForm((f) => ({ ...f, prof: e.target.value }))}
                className="h-11 w-full rounded-lg border border-gray-300 bg-gray-100 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-600 dark:text-gray-400">
                Course Code <span className="text-red-500">*</span>
              </label>
              <input
                required
                placeholder="e.g. ACC 101"
                value={form.subj}
                onChange={(e) => setForm((f) => ({ ...f, subj: e.target.value }))}
                className="h-11 w-full rounded-lg border border-gray-300 bg-gray-100 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-600 dark:text-gray-400">
                Group / Section <span className="text-red-500">*</span>
              </label>
              <input
                required
                placeholder="e.g. BSAC 2-A"
                value={form.group}
                onChange={(e) => setForm((f) => ({ ...f, group: e.target.value }))}
                className="h-11 w-full rounded-lg border border-gray-300 bg-gray-100 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-600 dark:text-gray-400">
                Email (optional)
              </label>
              <input
                type="email"
                placeholder="your@email.com"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                className="h-11 w-full rounded-lg border border-gray-300 bg-gray-100 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
              />
            </div>
          </div>

          {/* Room select + schedule picker */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-600 dark:text-gray-400">
              Room <span className="text-red-500">*</span>
            </label>
            <select
              required
              value={form.room}
              onChange={(e) => {
                setForm((f) => ({ ...f, room: e.target.value }));
                setSelected(null);
                setFromSelected(null);
              }}
              className="h-11 w-full rounded-lg border border-gray-300 bg-gray-100 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
            >
              <option value="">Select a room...</option>
              {availableRooms.map((r) => (
                <option key={r.id} value={r.name}>
                  {r.name} ({r.type}) — {r.capacity} pax
                </option>
              ))}
            </select>
          </div>

          {/* Change mode: pick FROM slot */}
          {mode === 'change' && (
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-600 dark:text-gray-400">
                Current Slot (to vacate)
              </label>
              <button
                type="button"
                disabled={!form.room}
                onClick={() => setFromPickerOpen(true)}
                className={cn(
                  'flex h-11 w-full items-center justify-between rounded-lg border px-4 text-sm transition',
                  fromSelected
                    ? 'border-orange-300 bg-orange-50 text-orange-700 dark:border-orange-500/30 dark:bg-orange-500/10 dark:text-orange-400'
                    : 'border-gray-300 bg-gray-100 text-gray-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400',
                  !form.room && 'cursor-not-allowed opacity-50'
                )}
              >
                {fromSelected
                  ? `${fromSelected.day} · ${fromSelected.slot}`
                  : 'Pick current slot to vacate...'}
                <CalendarDays size={16} />
              </button>
            </div>
          )}

          {/* Pick new slot */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-600 dark:text-gray-400">
              {mode === 'change' ? 'New Slot' : 'Preferred Time Slot'}{' '}
              <span className="text-red-500">*</span>
            </label>
            <button
              type="button"
              disabled={!form.room}
              onClick={() => setPickerOpen(true)}
              className={cn(
                'flex h-11 w-full items-center justify-between rounded-lg border px-4 text-sm transition',
                selected
                  ? 'border-brand-300 bg-brand-50 text-brand-700 dark:border-brand-500/30 dark:bg-brand-500/10 dark:text-brand-400'
                  : 'border-gray-300 bg-gray-100 text-gray-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400',
                !form.room && 'cursor-not-allowed opacity-50'
              )}
            >
              {selected ? `${selected.day} · ${selected.slot}` : 'Open schedule picker...'}
              <CalendarDays size={16} />
            </button>
            {!form.room && (
              <p className="mt-1 text-xs text-gray-400">Select a room first to enable the picker</p>
            )}
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-600 dark:text-gray-400">
              Notes (optional)
            </label>
            <textarea
              rows={3}
              placeholder="Additional information..."
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              className="w-full rounded-lg border border-gray-300 bg-gray-100 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
            />
          </div>

          <button
            type="submit"
            disabled={createMutation.isPending || !selected}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-500 py-3 text-sm font-semibold text-white transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {createMutation.isPending ? 'Submitting...' : 'Submit Request'}
          </button>
        </form>
      </div>

      <SchedulePickerModal
        isOpen={pickerOpen}
        onClose={() => setPickerOpen(false)}
        roomName={form.room}
        reservations={allReservations as Reservation[]}
        onSelect={(day, slot) => setSelected({ day, slot })}
        selected={selected}
      />

      <SchedulePickerModal
        isOpen={fromPickerOpen}
        onClose={() => setFromPickerOpen(false)}
        roomName={form.room}
        reservations={allReservations as Reservation[]}
        onSelect={(day, slot) => setFromSelected({ day, slot })}
        selected={fromSelected}
      />
    </>
  );
}
