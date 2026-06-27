'use client';

import type { ImportPreviewRow, ImportRow, ImportRowWithOptions } from '@/actions/reservations';
import { PageBreadcrumb } from '@/components/common';
import { useBatchImport, usePreviewImport } from '@/components/hooks/use-reservations';
import { useRooms } from '@/components/hooks/use-rooms';
import { AlertTriangle, CheckCircle2, FileUp, HelpCircle, Upload } from 'lucide-react';
import { useRef, useState } from 'react';
import toast from 'react-hot-toast';

type Step = 'upload' | 'preview' | 'done';

type EnrichedRow = ImportPreviewRow & {
  isTba: boolean;
  unknownRoom: boolean;
};

type RowKind = 'ok' | 'tba' | 'unknown_room' | 'conflict';

function getRowKind(row: EnrichedRow): RowKind {
  if (row.isTba) return 'tba';
  if (row.unknownRoom) return 'unknown_room';
  if (row.hasConflict) return 'conflict';
  return 'ok';
}

const REQUIRED_COLS = [
  'prof',
  'course',
  'year',
  'section',
  'course_code',
  'course_title',
  'room',
  'day',
  'start_time',
  'end_time',
];

function parseSectionHeader(
  text: string
): { course: string; year: string; section: string } | null {
  const match = text.match(/^(.+?)\s+(\d)([A-Z])\s*\//i);
  if (!match) return null;
  return {
    course: match[1].trim(),
    year: match[2],
    section: match[3].toUpperCase(),
  };
}

function parseSheet(data: unknown[][]): ImportRow[] {
  const results: ImportRow[] = [];
  let currentCourse = '';
  let currentYear = '';
  let currentSection = '';

  for (const rawRow of data) {
    const row = rawRow as (string | number | null)[];
    const col0 = String(row[0] ?? '').trim();
    const col1 = String(row[1] ?? '').trim();

    if (!col0 && !col1) continue;
    if (col0 === 'Course Code') continue;
    if (col1 === 'Total Units' || col1 === 'Lec') continue;
    if (
      col0.startsWith('COLLEGE OF') ||
      col0.startsWith('FIRST SEMESTER') ||
      col0.startsWith('SECOND SEMESTER') ||
      col0.startsWith('COURSE/YEAR') ||
      col0 === 'MARIANO MARCOS STATE UNIVERSITY' ||
      col0 === 'Office of the University Registrar' ||
      col0 === 'CLASS SCHEDULE'
    )
      continue;

    const parsed = parseSectionHeader(col0);
    if (parsed) {
      currentCourse = parsed.course;
      currentYear = parsed.year;
      currentSection = parsed.section;
      continue;
    }

    const course_code = col0;
    const course_title = col1;
    const lec_units =
      row[2] != null && String(row[2]).trim() !== '0' && String(row[2]).trim() !== ''
        ? String(row[2]).trim()
        : null;
    const lab_units =
      row[3] != null && String(row[3]).trim() !== '0' && String(row[3]).trim() !== ''
        ? String(row[3]).trim()
        : null;
    const timeRaw = String(row[4] ?? '').trim();
    const day = String(row[5] ?? '').trim();
    const room = String(row[6] ?? '').trim();
    const prof = String(row[7] ?? '').trim();

    const dashIdx = timeRaw.indexOf('-');
    const rawStart = dashIdx !== -1 ? timeRaw.slice(0, dashIdx).trim() : timeRaw;
    const rawEnd = dashIdx !== -1 ? timeRaw.slice(dashIdx + 1).trim() : '';
    const start_time = normalizeScheduleTime(rawStart);
    let end_time = normalizeScheduleTime(rawEnd);

    // If end is still ≤ start after normalization, it's an unshifted PM hour — add 12
    const [sh, sm] = start_time.split(':').map(Number);
    const [eh, em] = end_time.split(':').map(Number);
    if (!isNaN(sh) && !isNaN(eh) && eh * 60 + (em || 0) <= sh * 60 + (sm || 0) && eh + 12 <= 24) {
      end_time = `${(eh + 12).toString().padStart(2, '0')}:${end_time.split(':')[1]}`;
    }

    const entry: ImportRow = {
      prof,
      course: currentCourse,
      year: currentYear,
      section: currentSection,
      course_code,
      course_title,
      lec_units,
      lab_units,
      email: null,
      room,
      day,
      start_time,
      end_time,
      notes: null,
    };

    if (REQUIRED_COLS.every((k) => entry[k as keyof ImportRow])) {
      results.push(entry);
    }
  }

  return results;
}

// Shifts hours 1–6 to PM since school hours run 7 AM – 9 PM.
function normalizeScheduleTime(t: string): string {
  const m = t.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return t;
  let h = parseInt(m[1]);
  const min = m[2];
  if (h >= 1 && h <= 6) h += 12;
  return `${h.toString().padStart(2, '0')}:${min}`;
}

const KIND_CONFIG: Record<
  RowKind,
  { label: string; badge: string; icon: React.ReactNode; rowBg: string }
> = {
  ok: {
    label: 'OK',
    badge: 'bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-400',
    icon: <CheckCircle2 size={11} />,
    rowBg: 'bg-white dark:bg-gray-900',
  },
  tba: {
    label: 'TBA Room',
    badge: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400',
    icon: <HelpCircle size={11} />,
    rowBg: 'bg-amber-50 dark:bg-amber-500/5',
  },
  unknown_room: {
    label: 'Unknown Room',
    badge: 'bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-400',
    icon: <AlertTriangle size={11} />,
    rowBg: 'bg-orange-50 dark:bg-orange-500/5',
  },
  conflict: {
    label: 'Conflict',
    badge: 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400',
    icon: <AlertTriangle size={11} />,
    rowBg: 'bg-red-50 dark:bg-red-500/5',
  },
};

export default function ImportSchedulePage() {
  const [step, setStep] = useState<Step>('upload');
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [preview, setPreview] = useState<EnrichedRow[]>([]);
  const [excluded, setExcluded] = useState<Set<number>>(new Set());
  const [result, setResult] = useState<{ inserted: number; skipped: number } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const { data: rooms = [] } = useRooms();
  const previewMutation = usePreviewImport();
  const batchMutation = useBatchImport();

  const toggleExcluded = (i: number) => {
    setExcluded((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  };

  const handleFile = async (file: File) => {
    try {
      const { read, utils } = await import('xlsx');
      const buf = await file.arrayBuffer();
      const wb = read(buf);

      const allRows: ImportRow[] = [];
      for (const sheetName of wb.SheetNames) {
        const ws = wb.Sheets[sheetName];
        const data = utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: null }) as unknown[][];
        allRows.push(...parseSheet(data));
      }

      if (allRows.length === 0) {
        toast.error('No valid rows found. Check the file format.');
        return;
      }

      setRows(allRows);
      const previewed = (await previewMutation.mutateAsync(allRows)) as ImportPreviewRow[];

      const roomNameSet = new Set(rooms.map((r) => r.name.toLowerCase()));
      const enriched: EnrichedRow[] = previewed.map((row) => {
        const isTba = row.room.trim().toUpperCase() === 'TBA';
        const unknownRoom = !isTba && !roomNameSet.has(row.room.trim().toLowerCase());
        return { ...row, isTba, unknownRoom };
      });

      setPreview(enriched);
      setExcluded(new Set()); // start with everything included — user can exclude
      setStep('preview');
    } catch {
      toast.error('Failed to parse file');
    }
  };

  const handleImport = async () => {
    const toImport: ImportRowWithOptions[] = [];

    preview.forEach((row, i) => {
      if (excluded.has(i)) return;
      const kind = getRowKind(row);
      const isTrouble = kind !== 'ok';
      const notes =
        [
          kind === 'tba' ? '[TBA – Room to be assigned]' : null,
          kind === 'unknown_room' ? `[Unknown Room: ${row.room}]` : null,
          kind === 'conflict'
            ? `[Conflict with ${row.conflicting?.prof ?? 'another class'}]`
            : null,
          rows[i]?.notes ?? null,
        ]
          .filter(Boolean)
          .join('. ') || null;

      toImport.push({
        ...rows[i],
        notes,
        status: isTrouble ? 'pending' : 'approved',
        forceImport: isTrouble,
      });
    });

    if (toImport.length === 0) {
      toast.error('Nothing selected to import');
      return;
    }

    const res = await batchMutation.mutateAsync(toImport);
    setResult(res);
    setStep('done');
  };

  const includedCount = preview.filter((_, i) => !excluded.has(i)).length;
  const needsReviewCount = preview.filter((_, i) => {
    if (excluded.has(i)) return false;
    return getRowKind(preview[i]) !== 'ok';
  }).length;
  const approvedCount = includedCount - needsReviewCount;
  const excludedCount = excluded.size;

  return (
    <div className="flex flex-col gap-6">
      <PageBreadcrumb pageTitle="Import Schedule" />

      {/* Step indicators */}
      <div className="flex items-center gap-2 text-xs">
        {(['upload', 'preview', 'done'] as Step[]).map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            {i > 0 && <div className="h-px w-6 bg-gray-300 dark:bg-gray-700" />}
            <span
              className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${
                step === s
                  ? 'bg-brand-500 text-white'
                  : ['preview', 'done'].indexOf(step) > ['preview', 'done'].indexOf(s)
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-200 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
              }`}
            >
              {i + 1}
            </span>
            <span className="capitalize text-gray-500 dark:text-gray-400">{s}</span>
          </div>
        ))}
      </div>

      {/* Upload step */}
      {step === 'upload' && (
        <div className="mx-auto w-full max-w-lg">
          <div
            onClick={() => fileRef.current?.click()}
            className="flex cursor-pointer flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed border-gray-300 bg-gray-50 py-16 transition hover:border-brand-400 hover:bg-brand-50/30 dark:border-gray-700 dark:bg-gray-900 dark:hover:border-brand-500 dark:hover:bg-brand-500/5"
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100 dark:bg-gray-800">
              <FileUp size={24} className="text-brand-500" />
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold text-gray-900 dark:text-white">
                Click to upload .xlsx or .csv
              </p>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Accepts the official MMSU CBEA class schedule workbook (.xlsx)
              </p>
            </div>
            {previewMutation.isPending && (
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
                Parsing file...
              </div>
            )}
          </div>
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.csv"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
              e.target.value = '';
            }}
          />
        </div>
      )}

      {/* Preview step */}
      {step === 'preview' && (
        <div className="flex flex-col gap-4">
          {/* Summary bar */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3 text-xs">
              <span className="flex items-center gap-1.5 font-medium text-green-600 dark:text-green-400">
                <CheckCircle2 size={13} />
                {approvedCount} approved
              </span>
              {needsReviewCount > 0 && (
                <span className="flex items-center gap-1.5 font-medium text-amber-600 dark:text-amber-400">
                  <AlertTriangle size={13} />
                  {needsReviewCount} pending review
                </span>
              )}
              {excludedCount > 0 && (
                <span className="text-gray-400 dark:text-gray-500">{excludedCount} excluded</span>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setStep('upload')}
                disabled={batchMutation.isPending}
                className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
              >
                Back
              </button>
              <button
                onClick={handleImport}
                disabled={batchMutation.isPending || includedCount === 0}
                className="flex items-center gap-1.5 rounded-lg bg-brand-500 px-4 py-1.5 text-sm font-semibold text-white hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Upload size={14} />
                {batchMutation.isPending ? 'Importing...' : `Import ${includedCount} rows`}
              </button>
            </div>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-3 text-xs text-gray-500">
            <span className="flex items-center gap-1.5">
              <span className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-400">
                <CheckCircle2 size={10} /> OK
              </span>
              Will import as approved
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400">
                <HelpCircle size={10} /> TBA Room
              </span>
              Import as pending — room to be assigned
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-400">
                <AlertTriangle size={10} /> Unknown Room
              </span>
              Import as pending — room not in database
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400">
                <AlertTriangle size={10} /> Conflict
              </span>
              Import as pending — overlaps existing schedule
            </span>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-gray-200 dark:border-white/10">
            <table className="w-full text-xs">
              <thead className="border-b border-gray-200 bg-gray-50 dark:border-white/10 dark:bg-gray-800">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold text-gray-500">Include</th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-500">Status</th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-500">Faculty</th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-500">Course Code</th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-500">Course Title</th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-500">Class</th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-500">Room</th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-500">Day</th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-500">Start</th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-500">End</th>
                </tr>
              </thead>
              <tbody>
                {preview.map((r, i) => {
                  const kind = getRowKind(r);
                  const cfg = KIND_CONFIG[kind];
                  const isExcluded = excluded.has(i);
                  return (
                    <tr
                      key={i}
                      className={`border-b last:border-0 transition-opacity ${cfg.rowBg} ${isExcluded ? 'opacity-40' : ''}`}
                    >
                      <td className="px-3 py-2">
                        <input
                          type="checkbox"
                          checked={!isExcluded}
                          onChange={() => toggleExcluded(i)}
                          className="h-3.5 w-3.5 rounded border-gray-300 text-brand-500 focus:ring-brand-500"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <span
                          className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 font-medium ${cfg.badge}`}
                        >
                          {cfg.icon}
                          {cfg.label}
                        </span>
                        {kind === 'conflict' && r.conflicting && (
                          <p className="mt-0.5 text-gray-400">
                            vs {r.conflicting.prof} ({r.conflicting.course_code})
                          </p>
                        )}
                      </td>
                      <td className="px-3 py-2 text-gray-700 dark:text-gray-300">{r.prof}</td>
                      <td className="px-3 py-2 text-gray-700 dark:text-gray-300">
                        {r.course_code}
                      </td>
                      <td className="px-3 py-2 text-gray-700 dark:text-gray-300">
                        {r.course_title}
                      </td>
                      <td className="px-3 py-2 text-gray-700 dark:text-gray-300">
                        {r.course} {r.year}-{r.section}
                      </td>
                      <td className="px-3 py-2 text-gray-700 dark:text-gray-300">{r.room}</td>
                      <td className="px-3 py-2 text-gray-700 dark:text-gray-300">{r.day}</td>
                      <td className="px-3 py-2 text-gray-700 dark:text-gray-300">{r.start_time}</td>
                      <td className="px-3 py-2 text-gray-700 dark:text-gray-300">{r.end_time}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Done step */}
      {step === 'done' && result && (
        <div className="mx-auto flex w-full max-w-sm flex-col items-center gap-4 py-10 text-center">
          <CheckCircle2 size={48} className="text-green-500" />
          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Import Complete</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              <span className="font-semibold text-green-600">{result.inserted} inserted</span>
              {result.skipped > 0 && (
                <>
                  {' '}
                  · <span className="font-semibold text-amber-500">{result.skipped} skipped</span>
                </>
              )}
            </p>
            <p className="mt-2 text-xs text-gray-400">
              Pending rows are saved and need room assignment or conflict resolution.
            </p>
          </div>
          <button
            onClick={() => {
              setStep('upload');
              setRows([]);
              setPreview([]);
              setExcluded(new Set());
              setResult(null);
            }}
            className="rounded-lg bg-brand-500 px-5 py-2 text-sm font-medium text-white hover:bg-brand-600"
          >
            Import Another File
          </button>
        </div>
      )}
    </div>
  );
}
