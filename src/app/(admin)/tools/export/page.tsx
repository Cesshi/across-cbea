'use client';

import { PageBreadcrumb } from '@/components/common';
import { useApprovedReservations, useReservations } from '@/components/hooks/use-reservations';
import { useRooms } from '@/components/hooks/use-rooms';
import { DAY_PATTERN_MAP, SCHEDULE_DAYS, type DayPattern } from '@/lib/constants';
import { Download, FileSpreadsheet, FileText } from 'lucide-react';
import toast from 'react-hot-toast';

function downloadCsv(filename: string, rows: string[][]) {
  const csv = rows
    .map((r) => r.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(','))
    .join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function ExportDataPage() {
  const { data: rooms = [] } = useRooms();
  const { data: allReservations = [] } = useReservations();
  const { data: approvedReservations = [] } = useApprovedReservations();

  const exportRoomsCsv = () => {
    const header = ['Name', 'Type', 'Capacity', 'Floor', 'Status'];
    const rows = rooms.map((r) => [
      r.name,
      r.type,
      String(r.capacity),
      r.floor ?? '',
      r.is_active ? 'Active' : 'Inactive',
    ]);
    downloadCsv('rooms.csv', [header, ...rows]);
    toast.success('Rooms exported');
  };

  const exportReservationsCsv = () => {
    const header = [
      'Faculty',
      'Course',
      'Year',
      'Section',
      'Course Code',
      'Course Title',
      'Lec Units',
      'Lab Units',
      'Email',
      'Room',
      'Day',
      'Start Time',
      'End Time',
      'Status',
      'Notes',
      'Created At',
    ];
    const rows = allReservations.map((r) => [
      r.prof,
      r.course,
      r.year,
      r.section,
      r.course_code,
      r.course_title,
      r.lec_units ?? '',
      r.lab_units ?? '',
      r.email ?? '',
      r.room,
      r.day,
      r.start_time,
      r.end_time,
      r.status,
      r.notes ?? '',
      new Date(r.created_at).toLocaleString(),
    ]);
    downloadCsv('reservations.csv', [header, ...rows]);
    toast.success('Reservations exported');
  };

  const exportScheduleXlsx = async () => {
    try {
      const { utils, write } = await import('xlsx');

      // Build one sheet per room with days as columns and time slots as rows
      const wb = utils.book_new();

      const roomNames = [...new Set(approvedReservations.map((r) => r.room))].sort();

      for (const roomName of roomNames) {
        const data: string[][] = [
          [
            'Day',
            'Start Time',
            'End Time',
            'Course Code',
            'Course Title',
            'Faculty',
            'Class',
            'Lec',
            'Lab',
          ],
        ];

        const roomEntries = approvedReservations
          .filter((r) => r.room === roomName)
          .flatMap((r) => {
            const days = DAY_PATTERN_MAP[r.day as DayPattern] ?? [r.day];
            return days.map((day) => ({ ...r, _day: day }));
          })
          .sort((a, b) => {
            const di = SCHEDULE_DAYS.indexOf(a._day as (typeof SCHEDULE_DAYS)[number]);
            const dj = SCHEDULE_DAYS.indexOf(b._day as (typeof SCHEDULE_DAYS)[number]);
            return di !== dj ? di - dj : a.start_time.localeCompare(b.start_time);
          });

        for (const e of roomEntries) {
          data.push([
            e._day,
            e.start_time,
            e.end_time,
            e.course_code,
            e.course_title,
            e.prof,
            `${e.course} ${e.year}-${e.section}`,
            e.lec_units ?? '',
            e.lab_units ?? '',
          ]);
        }

        const ws = utils.aoa_to_sheet(data);
        utils.book_append_sheet(wb, ws, roomName.slice(0, 31));
      }

      const buf = write(wb, { type: 'array', bookType: 'xlsx' });
      const blob = new Blob([buf], { type: 'application/octet-stream' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'schedule.xlsx';
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Schedule exported');
    } catch {
      toast.error('Failed to export schedule');
    }
  };

  const exports = [
    {
      icon: <FileText size={20} className="text-brand-500" />,
      title: 'Export Rooms (CSV)',
      desc: `${rooms.length} rooms — name, type, capacity, floor, status`,
      action: exportRoomsCsv,
    },
    {
      icon: <FileText size={20} className="text-brand-500" />,
      title: 'Export Reservations (CSV)',
      desc: `${allReservations.length} reservations — all statuses`,
      action: exportReservationsCsv,
    },
    {
      icon: <FileSpreadsheet size={20} className="text-green-500" />,
      title: 'Export Room Schedule (Excel)',
      desc: `${approvedReservations.length} approved — one sheet per room`,
      action: exportScheduleXlsx,
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageBreadcrumb pageTitle="Export Data" />

      <div className="mx-auto w-full max-w-xl space-y-3">
        {exports.map((e) => (
          <div
            key={e.title}
            className="flex items-center justify-between gap-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-gray-900"
          >
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gray-50 dark:bg-white/5">
                {e.icon}
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">{e.title}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{e.desc}</p>
              </div>
            </div>
            <button
              onClick={e.action}
              className="flex shrink-0 items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 transition hover:border-brand-400 hover:text-brand-600 dark:border-gray-700 dark:text-gray-300 dark:hover:border-brand-500 dark:hover:text-brand-400"
            >
              <Download size={13} />
              Download
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
