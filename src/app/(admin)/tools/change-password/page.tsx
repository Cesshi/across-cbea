'use client';

import { PageBreadcrumb } from '@/components/common';
import { changeUserPassword } from '@/actions/users';
import { useAuthStore } from '@/store';
import { zodResolver } from '@hookform/resolvers/zod';
import { KeyRound } from 'lucide-react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { z } from 'zod';

const schema = z
  .object({
    newPassword: z.string().min(8, 'Minimum 8 characters'),
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type FormValues = z.infer<typeof schema>;

export default function ChangePasswordPage() {
  const { userProfile } = useAuthStore();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (values: FormValues) => {
    if (!userProfile?.auth_id) return;
    try {
      await changeUserPassword(userProfile.auth_id, values.newPassword);
      toast.success('Password updated successfully');
      reset();
    } catch {
      toast.error('Failed to update password');
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <PageBreadcrumb pageTitle="Change Password" />

      <div className="mx-auto w-full max-w-md">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-gray-900">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 dark:bg-brand-500/10">
              <KeyRound size={18} className="text-brand-500" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
                Update Password
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">{userProfile?.email}</p>
            </div>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-600 dark:text-gray-400">
                New Password
              </label>
              <input
                type="password"
                {...register('newPassword')}
                className="h-11 w-full rounded-lg border border-gray-300 bg-gray-100 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              />
              {errors.newPassword && (
                <p className="mt-1 text-xs text-red-500">{errors.newPassword.message}</p>
              )}
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-600 dark:text-gray-400">
                Confirm Password
              </label>
              <input
                type="password"
                {...register('confirmPassword')}
                className="h-11 w-full rounded-lg border border-gray-300 bg-gray-100 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              />
              {errors.confirmPassword && (
                <p className="mt-1 text-xs text-red-500">{errors.confirmPassword.message}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-brand-500 py-3 text-sm font-semibold text-white transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting ? 'Updating...' : 'Update Password'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
