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

// 30-minute time slots from 7:00 AM to 9:00 PM
export const TIME_SLOTS: string[] = (() => {
  const slots: string[] = [];
  for (let h = 7; h < 21; h++) {
    for (const m of [0, 30]) {
      const startH = h;
      const startM = m;
      const endM = m + 30;
      const endH = endM === 60 ? h + 1 : h;
      const endMin = endM === 60 ? 0 : endM;

      const fmt = (hh: number, mm: number) => {
        const period = hh < 12 ? 'AM' : 'PM';
        const display = hh > 12 ? hh - 12 : hh === 0 ? 12 : hh;
        return `${display}:${String(mm).padStart(2, '0')} ${period}`;
      };

      slots.push(`${fmt(startH, startM)} - ${fmt(endH, endMin)}`);
    }
  }
  return slots;
})();

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
