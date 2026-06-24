'use client';

import { ProtectedRoute, SignOutButton } from '@/components/auth';
import { Dropdown, DropdownItem } from '@/components/ui';
import { useAuthStore, useThemeStore } from '@/store';
import { CalendarDays, ChevronDown, Moon, Sun } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

export default function FacultyLayout({ children }: { children: React.ReactNode }) {
  const { user, userProfile } = useAuthStore();
  const { theme, toggleTheme } = useThemeStore();
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const displayName = userProfile?.full_name
    ? userProfile.full_name.split(' ')[0]
    : (user?.email?.split('@')[0] ?? 'User');

  const email = userProfile?.email ?? user?.email ?? '';

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
        <header className="sticky top-0 z-10 border-b border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
          <div className="mx-auto flex max-w-7xl  items-center justify-between px-4 py-3 lg:px-6">
            {/* Left - logo */}
            <Link href="/reservation" className="flex items-center gap-2">
              <CalendarDays size={20} className="text-brand-500" />
              <span className="text-sm font-semibold text-gray-900 dark:text-white">
                ACROSS — MMSU CBEA
              </span>
            </Link>

            {/* Right - actions */}
            <div className="flex items-center gap-3">
              {/* Theme toggle */}
              <button
                onClick={toggleTheme}
                className="flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 dark:border-gray-800 dark:text-gray-400 dark:hover:bg-white/5"
              >
                {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
              </button>

              {/* User menu */}
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen((p) => !p)}
                  className="dropdown-toggle flex items-center gap-2 text-gray-700 transition hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  <div className="bg-brand-500 flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold text-white">
                    {displayName.charAt(0).toUpperCase()}
                  </div>
                  <span className="hidden text-sm font-medium lg:block">{displayName}</span>
                  <ChevronDown
                    size={16}
                    className={`transition-transform duration-200 ${userMenuOpen ? 'rotate-180' : ''}`}
                  />
                </button>

                <Dropdown
                  isOpen={userMenuOpen}
                  onClose={() => setUserMenuOpen(false)}
                  className="w-60 p-2"
                >
                  <DropdownItem>
                    <div className="w-full items-start border-b border-gray-100 pb-1 dark:border-gray-800">
                      <p className="truncate text-start text-sm font-medium text-gray-900 dark:text-white">
                        {displayName}
                      </p>
                      <p className="truncate text-start text-xs text-gray-500">{email}</p>
                    </div>
                  </DropdownItem>
                  <SignOutButton />
                </Dropdown>
              </div>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-7xl px-4 py-6 md:px-6">{children}</main>
      </div>
    </ProtectedRoute>
  );
}
