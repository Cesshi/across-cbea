'use client';

import type { ImportRow } from '@/actions/reservations';
import { PageBreadcrumb } from '@/components/common';
import { useBatchImport, usePreviewImport } from '@/components/hooks/use-reservations';
import { AlertTriangle, CheckCircle2, FileUp, Upload } from 'lucide-react';
import { useRef, useState } from 'react';
import toast from 'react-hot-toast';

type Step = 'upload' | 'preview' | 'done';
type PreviewRow = ImportRow & {
  hasConflict: boolean;
  conflicting?: { prof: string; course_code: string; section: string };
};

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

function normalizeHeader(h: string): string {
  return String(h ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

// Shifts hours 1–6 to PM since school hours run 7 AM – 9 PM (no midnight classes).
// e.g. "1:00" → "13:00", "7:00" stays "07:00", "13:00" stays "13:00"
function normalizeScheduleTime(t: string): string {
  const m = t.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return t;
  let h = parseInt(m[1]);
  const min = m[2];
  if (h >= 1 && h <= 6) h += 12;
  return `${h.toString().padStart(2, '0')}:${min}`;
}

// Maps raw column names from the real Excel file to ImportRow keys
const HEADER_MAP: Record<string, string> = {
  faculty: 'prof',
  course: 'course',
  year: 'year',
  section: 'section',
  'course code': 'course_code',
  'course title': 'course_title',
  lec: 'lec_units',
  lab: 'lab_units',
  time: 'time', // will be split into start_time / end_time
  day: 'day',
  'bldg & room': 'room',
  email: 'email',
  notes: 'notes',
};

function parseSheet(data: unknown[][]): ImportRow[] {
  if (data.length < 3) return [];

  // Row 0: main headers (Course, Year, Section, Course Code, Course Title, No. of Units, [blank], Time, Day, Bldg & Room, Faculty)
  // Row 1: sub-headers for units (blank, blank, blank, blank, blank, Lec, Lab, ...)
  // Row 2+: data

  const mainHeaders = (data[0] as string[]).map(normalizeHeader);
  const subHeaders = (data[1] as string[]).map(normalizeHeader);

  // Build final header list: prefer subheader if it has content, else use main header
  const headers = mainHeaders.map((h, i) => {
    const sub = subHeaders[i];
    // sub-row cells like 'lec' / 'lab' sit under 'no. of units' or blank
    if (sub && sub !== '' && sub !== h) return sub;
    return h;
  });

  // Map to ImportRow field names
  const fieldNames = headers.map((h) => HEADER_MAP[h] ?? h);

  return (data.slice(2) as unknown[][])
    .map((row) => {
      const obj: Record<string, string> = {};
      fieldNames.forEach((f, i) => {
        obj[f] = String(row[i] ?? '').trim();
      });

      // Split "08:00-11:00" into start_time / end_time; normalize ambiguous PM times
      const timeParts = (obj['time'] ?? '').split('-');
      const start_time = normalizeScheduleTime(timeParts[0]?.trim() ?? '');
      let end_time = normalizeScheduleTime(timeParts[1]?.trim() ?? '');
      // If end is before start after normalization, the end is still an unshifted PM hour — add 12
      const [sh, sm] = start_time.split(':').map(Number);
      const [eh, em] = end_time.split(':').map(Number);
      if (!isNaN(sh) && !isNaN(eh) && eh * 60 + (em || 0) <= sh * 60 + (sm || 0) && eh + 12 <= 24) {
        end_time = `${(eh + 12).toString().padStart(2, '0')}:${end_time.split(':')[1]}`;
      }

      return {
        prof: obj['prof'] ?? '',
        course: obj['course'] ?? '',
        year: String(obj['year'] ?? ''),
        section: obj['section'] ?? '',
        course_code: obj['course_code'] ?? '',
        course_title: obj['course_title'] ?? '',
        lec_units: obj['lec_units'] || null,
        lab_units: obj['lab_units'] || null,
        email: obj['email'] || null,
        room: obj['room'] ?? '',
        day: obj['day'] ?? '',
        start_time,
        end_time,
        notes: obj['notes'] || null,
      };
    })
    .filter((r) => REQUIRED_COLS.every((k) => r[k as keyof ImportRow]));
}

export default function ImportSchedulePage() {
  const [step, setStep] = useState<Step>('upload');
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [preview, setPreview] = useState<PreviewRow[]>([]);
  const [result, setResult] = useState<{ inserted: number; skipped: number } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const previewMutation = usePreviewImport();
  const batchMutation = useBatchImport();

  const handleFile = async (file: File) => {
    try {
      const { read, utils } = await import('xlsx');
      const buf = await file.arrayBuffer();
      const wb = read(buf);
      const ws = wb.Sheets[wb.SheetNames[0]];
      const data = utils.sheet_to_json<unknown[]>(ws, { header: 1 }) as unknown[][];
      const parsed = parseSheet(data);

      if (parsed.length === 0) {
        toast.error('No valid rows found. Check column headers: ' + REQUIRED_COLS.join(', '));
        return;
      }

      setRows(parsed);
      const previewed = await previewMutation.mutateAsync(parsed);
      setPreview(previewed as PreviewRow[]);
      setStep('preview');
    } catch {
      toast.error('Failed to parse file');
    }
  };

  const handleImport = async () => {
    const toInsert = rows.filter((_, i) => !preview[i]?.hasConflict);
    if (toInsert.length === 0) {
      toast.error('All rows have conflicts — nothing to import');
      return;
    }
    const res = await batchMutation.mutateAsync(toInsert);
    setResult(res);
    setStep('done');
  };

  const conflictCount = preview.filter((r) => r.hasConflict).length;
  const cleanCount = preview.length - conflictCount;

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
                Expected columns: Faculty, Course, Year, Section, Course Code, Course Title, Lec,
                Lab, Time, Day, Bldg &amp; Room
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
          <div className="flex flex-wrap items-center gap-2 justify-between">
            <div className="flex items-center gap-4 text-sm">
              <span className="flex items-center gap-1.5 text-green-600 dark:text-green-400">
                <CheckCircle2 size={15} />
                {cleanCount} will import
              </span>
              {conflictCount > 0 && (
                <span className="flex items-center gap-1.5 text-red-500">
                  <AlertTriangle size={15} />
                  {conflictCount} will be skipped (conflict)
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setStep('upload')}
                className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
              >
                Back
              </button>
              <button
                onClick={handleImport}
                disabled={batchMutation.isPending || cleanCount === 0}
                className="flex items-center gap-1.5 rounded-lg bg-brand-500 px-4 py-1.5 text-sm font-semibold text-white hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Upload size={14} />
                {batchMutation.isPending ? 'Importing...' : `Import ${cleanCount} rows`}
              </button>
            </div>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-gray-200 dark:border-white/10">
            <table className="w-full text-xs">
              <thead className="border-b border-gray-200 bg-gray-50 dark:border-white/10 dark:bg-gray-800">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold text-gray-500">Status</th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-500">Faculty</th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-500">Course Code</th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-500">Course Title</th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-500">Class</th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-500">Room</th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-500">Day</th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-500">Start Time</th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-500">End Time</th>
                </tr>
              </thead>
              <tbody>
                {preview.map((r, i) => (
                  <tr
                    key={i}
                    className={`border-b last:border-0 ${
                      r.hasConflict ? 'bg-red-50 dark:bg-red-500/5' : 'bg-white dark:bg-gray-900'
                    }`}
                  >
                    <td className="px-3 py-2">
                      {r.hasConflict ? (
                        <span className="flex items-center gap-1 text-red-500">
                          <AlertTriangle size={11} />
                          Conflict
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
                          <CheckCircle2 size={11} />
                          OK
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-gray-700 dark:text-gray-300">{r.prof}</td>
                    <td className="px-3 py-2 text-gray-700 dark:text-gray-300">{r.course_code}</td>
                    <td className="px-3 py-2 text-gray-700 dark:text-gray-300">{r.course_title}</td>
                    <td className="px-3 py-2 text-gray-700 dark:text-gray-300">
                      {r.course} {r.year}-{r.section}
                    </td>
                    <td className="px-3 py-2 text-gray-700 dark:text-gray-300">{r.room}</td>
                    <td className="px-3 py-2 text-gray-700 dark:text-gray-300">{r.day}</td>
                    <td className="px-3 py-2 text-gray-700 dark:text-gray-300">{r.start_time}</td>
                    <td className="px-3 py-2 text-gray-700 dark:text-gray-300">{r.end_time}</td>
                  </tr>
                ))}
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
          </div>
          <button
            onClick={() => {
              setStep('upload');
              setRows([]);
              setPreview([]);
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
