export const ROOM_TYPES = [
  'Lecture Room',
  'Computer Lab',
  'Conference Room',
  'Function Hall',
  'AVR',
  'Auditorium',
] as const;
export type RoomType = (typeof ROOM_TYPES)[number];

export const DAY_PATTERNS = [
  'MWF',
  'TTH',
  'SAT',
  'MW',
  'MF',
  'WF',
  'M',
  'T',
  'W',
  'TH',
  'F',
] as const;
export type DayPattern = (typeof DAY_PATTERNS)[number];

export const RESERVATION_STATUSES = ['approved', 'pending', 'rejected'] as const;
export type ReservationStatus = (typeof RESERVATION_STATUSES)[number];

// Rooms excluded from faculty requests and bulk imports
export const RESTRICTED_ROOMS = [
  'THM Extension Building 3rd Floor',
  'BAR ROOM',
  'KL1',
  'KL2',
  'AVR CBEA',
  'READING CENTER',
] as const;

// Days that make up each day pattern (for schedule grid column mapping)
export const DAY_PATTERN_MAP: Record<DayPattern, string[]> = {
  MWF: ['Monday', 'Wednesday', 'Friday'],
  TTH: ['Tuesday', 'Thursday'],
  SAT: ['Saturday'],
  MW: ['Monday', 'Wednesday'],
  MF: ['Monday', 'Friday'],
  WF: ['Wednesday', 'Friday'],
  M: ['Monday'],
  T: ['Tuesday'],
  W: ['Wednesday'],
  TH: ['Thursday'],
  F: ['Friday'],
};

export const YEAR_LEVELS = ['1st Year', '2nd Year', '3rd Year', '4th Year', '5th Year'] as const;

// Converts "HH:MM" (24-hour, from type="time" inputs) to "H:MM AM/PM" for display.
// Falls back to returning the input unchanged for legacy "7:00 AM" strings.
export function formatTime(t: string): string {
  const hhmm = t.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!hhmm) return t;
  let h = parseInt(hhmm[1]);
  const m = parseInt(hhmm[2]);
  const period = h >= 12 ? 'PM' : 'AM';
  if (h > 12) h -= 12;
  if (h === 0) h = 12;
  return `${h}:${m.toString().padStart(2, '0')} ${period}`;
}
export type YearLevel = (typeof YEAR_LEVELS)[number];

export const SCHEDULE_DAYS = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
] as const;
export type ScheduleDay = (typeof SCHEDULE_DAYS)[number];

// Pre-seeded rooms (27 rooms)
export const SEED_ROOMS = [
  { name: 'CBEA 102', type: 'Lecture Room', capacity: 40, floor: '1st Floor' },
  { name: 'CBEA 109', type: 'Lecture Room', capacity: 40, floor: '1st Floor' },
  { name: 'CBEA 110', type: 'Lecture Room', capacity: 40, floor: '1st Floor' },
  { name: 'CBEA 201', type: 'Lecture Room', capacity: 40, floor: '2nd Floor' },
  { name: 'CBEA 202', type: 'Lecture Room', capacity: 40, floor: '2nd Floor' },
  { name: 'CBEA 203', type: 'Lecture Room', capacity: 40, floor: '2nd Floor' },
  { name: 'CBEA 204', type: 'Lecture Room', capacity: 40, floor: '2nd Floor' },
  { name: 'CBEA 205', type: 'Lecture Room', capacity: 40, floor: '2nd Floor' },
  { name: 'CBEA 206', type: 'Lecture Room', capacity: 40, floor: '2nd Floor' },
  { name: 'CBEA 207', type: 'Lecture Room', capacity: 40, floor: '2nd Floor' },
  { name: 'CBEA 208', type: 'Lecture Room', capacity: 40, floor: '2nd Floor' },
  { name: 'CBEA 209', type: 'Lecture Room', capacity: 40, floor: '2nd Floor' },
  { name: 'CBEA 210', type: 'Lecture Room', capacity: 40, floor: '2nd Floor' },
  { name: 'CBEA 211', type: 'Lecture Room', capacity: 40, floor: '2nd Floor' },
  { name: 'CBEA 212', type: 'Lecture Room', capacity: 40, floor: '2nd Floor' },
  { name: 'CBEA 213', type: 'Lecture Room', capacity: 40, floor: '2nd Floor' },
  { name: 'CBEA 214', type: 'Lecture Room', capacity: 40, floor: '2nd Floor' },
  { name: 'CBEA 215', type: 'Lecture Room', capacity: 40, floor: '2nd Floor' },
  { name: 'CBEA 216', type: 'Lecture Room', capacity: 40, floor: '2nd Floor' },
  { name: 'CBEA 217', type: 'Lecture Room', capacity: 40, floor: '2nd Floor' },
  { name: 'CBEA 218', type: 'Lecture Room', capacity: 40, floor: '2nd Floor' },
  { name: 'CBEA 219', type: 'Lecture Room', capacity: 40, floor: '2nd Floor' },
  { name: 'CBEA 220', type: 'Lecture Room', capacity: 40, floor: '2nd Floor' },
  { name: 'iHub 1', type: 'Computer Lab', capacity: 30, floor: '1st Floor' },
  { name: 'iHub 2', type: 'Computer Lab', capacity: 30, floor: '1st Floor' },
  { name: 'Typing Room', type: 'Computer Lab', capacity: 25, floor: '1st Floor' },
  { name: 'Student Center', type: 'Function Hall', capacity: 100, floor: '1st Floor' },
] as const;
