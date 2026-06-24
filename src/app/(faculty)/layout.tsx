'use client';

import { ProtectedRoute } from '@/components/auth';
import { SignOutButton } from '@/components/auth';
import { useAuthStore, useThemeStore } from '@/store';
import { CalendarDays, Moon, Sun } from 'lucide-react';
import Link from 'next/link';

export default function FacultyLayout({ children }: { children: React.ReactNode }) {
  const { userProfile } = useAuthStore();
  const { theme, toggleTheme } = useThemeStore();

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
        <header className="border-b border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
          <div className="mx-auto flex max-w-screen-xl items-center justify-between px-4 py-3 md:px-6">
            <Link href="/reservation" className="flex items-center gap-2">
              <CalendarDays size={20} className="text-brand-500" />
              <span className="text-sm font-semibold text-gray-900 dark:text-white">
                ACROSS — MMSU CBEA
              </span>
            </Link>
            <div className="flex items-center gap-3">
              <span className="hidden text-sm text-gray-500 dark:text-gray-400 sm:block">
                {userProfile?.full_name ?? userProfile?.email}
              </span>
              <button
                onClick={toggleTheme}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-white/5"
              >
                {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
              </button>
              <SignOutButton />
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-screen-xl px-4 py-6 md:px-6">{children}</main>
      </div>
    </ProtectedRoute>
  );
}
