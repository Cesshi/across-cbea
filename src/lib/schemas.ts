import { z } from 'zod';
import { DAY_PATTERNS, RESERVATION_STATUSES, ROOM_TYPES, YEAR_LEVELS } from './constants';

/* ─── Auth ─── */
export const signInSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
});

export const updatePasswordSchema = z
  .object({
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

export const changePasswordSchema = z
  .object({
    new_password: z.string().min(8, 'Password must be at least 8 characters'),
    confirm_password: z.string(),
  })
  .refine((d) => d.new_password === d.confirm_password, {
    message: "Passwords don't match",
    path: ['confirm_password'],
  });

/* ─── Profile ─── */
export const profileSchema = z.object({
  full_name: z.string().min(1, 'Full name is required'),
  email: z.string().email('Invalid email address'),
  role: z.enum(['admin', 'faculty']),
  is_active: z.boolean().default(true),
});

export const createUserSchema = z
  .object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
    full_name: z.string().min(1, 'Full name is required'),
    role: z.enum(['admin', 'faculty']),
    is_active: z.boolean().default(true),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

/* ─── Room ─── */
export const roomSchema = z.object({
  name: z.string().min(1, 'Room name is required'),
  type: z.enum(ROOM_TYPES, { required_error: 'Room type is required' }),
  capacity: z.coerce.number().int().min(0, 'Capacity must be 0 or more').default(0),
  floor: z.string().optional().nullable(),
  is_active: z.boolean().default(true),
});

/* ─── Reservation ─── */
export const reservationSchema = z.object({
  prof: z.string().min(1, 'Faculty name is required'),
  course: z.string().min(1, 'Course/program is required'),
  year: z.enum(YEAR_LEVELS, { required_error: 'Year level is required' }),
  section: z.string().min(1, 'Section is required'),
  course_code: z.string().min(1, 'Course code is required'),
  course_title: z.string().min(1, 'Course title is required'),
  lec_units: z.string().optional().nullable(),
  lab_units: z.string().optional().nullable(),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  room: z.string().min(1, 'Room is required'),
  day: z.enum(DAY_PATTERNS, { required_error: 'Day pattern is required' }),
  start_time: z.string().min(1, 'Start time is required'),
  end_time: z.string().min(1, 'End time is required'),
  notes: z.string().optional().nullable(),
  status: z.enum(RESERVATION_STATUSES).default('approved'),
});

// Faculty submits a request — status locked to pending
export const requestSchema = reservationSchema.omit({ status: true }).extend({
  status: z.literal('pending').default('pending'),
  is_change_request: z.boolean().default(false),
  from_room: z.string().optional().nullable(),
  from_day: z.preprocess((v) => (v === '' ? null : v), z.enum(DAY_PATTERNS).optional().nullable()),
  from_start_time: z.string().optional().nullable(),
  from_end_time: z.string().optional().nullable(),
});

/* ─── Inferred types ─── */
export type SignInFormData = z.infer<typeof signInSchema>;
export type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;
export type UpdatePasswordFormData = z.infer<typeof updatePasswordSchema>;
export type ChangePasswordFormData = z.infer<typeof changePasswordSchema>;
export type ProfileFormData = z.infer<typeof profileSchema>;
export type CreateUserFormData = z.infer<typeof createUserSchema>;
export type RoomFormData = z.infer<typeof roomSchema>;
export type ReservationFormData = z.infer<typeof reservationSchema>;
export type RequestFormData = z.infer<typeof requestSchema>;
