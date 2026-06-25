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

function parseSheet(data: unknown[][]): ImportRow[] {
  if (data.length < 2) return [];
  const headers = (data[0] as string[]).map((h) =>
    String(h ?? '')
      .trim()
      .toLowerCase()
  );
  return (data.slice(1) as unknown[][])
    .map((row) => {
      const obj: Record<string, string> = {};
      headers.forEach((h, i) => {
        obj[h] = String(row[i] ?? '').trim();
      });
      return {
        prof: obj['prof'] ?? '',
        course: obj['course'] ?? '',
        year: obj['year'] ?? '',
        section: obj['section'] ?? '',
        course_code: obj['course_code'] ?? '',
        course_title: obj['course_title'] ?? '',
        lec_units: obj['lec_units'] || null,
        lab_units: obj['lab_units'] || null,
        email: obj['email'] || null,
        room: obj['room'] ?? '',
        day: obj['day'] ?? '',
        start_time: obj['start_time'] ?? '',
        end_time: obj['end_time'] ?? '',
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
                Required columns: {REQUIRED_COLS.join(', ')}
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
          <div className="flex items-center justify-between">
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
