'use client';

import { Building2, CalendarDays, ClipboardList, Users } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

const features = [
  {
    icon: <CalendarDays size={24} className="text-brand-500" />,
    title: 'Live Schedule View',
    desc: 'View the full weekly classroom schedule without logging in.',
  },
  {
    icon: <Building2 size={24} className="text-brand-500" />,
    title: 'Room Availability',
    desc: 'Check which rooms are vacant or occupied at a glance.',
  },
  {
    icon: <ClipboardList size={24} className="text-brand-500" />,
    title: 'Online Reservations',
    desc: 'Faculty can submit room requests and receive updates instantly.',
  },
  {
    icon: <Users size={24} className="text-brand-500" />,
    title: 'Admin Management',
    desc: 'Admins can manage rooms, approve requests, and resolve conflicts.',
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      {/* Nav */}
      <nav className="fixed top-0 right-0 left-0 z-10 border-b border-gray-100 bg-white/80 backdrop-blur dark:border-gray-800 dark:bg-gray-950/80">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 md:px-6">
          <div className="flex items-center gap-2">
            <CalendarDays size={20} className="text-brand-500" />
            <span className="text-sm font-bold text-gray-900 dark:text-white">ACROSS CBEA</span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/schedule"
              className="text-sm text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
            >
              Schedule
            </Link>
            <Link
              href="/signin"
              className="rounded-lg bg-brand-500 px-4 py-1.5 text-sm font-medium text-white transition hover:bg-brand-600"
            >
              Login
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
        <div className="mb-4 flex flex-wrap items-center justify-center gap-3">
          <Image
            src="/mmsu-logo.png"
            alt="MMSU Logo"
            width={72}
            height={72}
            sizes="72px"
            className="object-contain"
          />
          <Image
            src="/cbea-logo.png"
            alt="CBEA Logo"
            width={72}
            height={72}
            sizes="72px"
            className="object-contain"
          />
        </div>
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700 dark:border-brand-500/30 dark:bg-brand-500/10 dark:text-brand-400">
          MMSU — College of Business and Economics Administration
        </div>
        <h1 className="mb-4 max-w-2xl text-4xl font-extrabold leading-tight tracking-tight text-gray-900 dark:text-white sm:text-5xl">
          Academic Classroom Occupancy
          <span className="text-brand-500"> Scheduling System</span>
        </h1>
        <p className="mb-8 max-w-lg text-base text-gray-500 dark:text-gray-400">
          Streamline room reservations, view live schedules, and eliminate scheduling conflicts
          across MMSU-CBEA classrooms.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link
            href="/schedule"
            className="flex items-center gap-2 rounded-xl border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-700 transition hover:border-brand-400 hover:text-brand-600 dark:border-gray-700 dark:text-gray-300 dark:hover:border-brand-500 dark:hover:text-brand-400"
          >
            <CalendarDays size={16} />
            View Schedule
          </Link>
          <Link
            href="/signin"
            className="flex items-center gap-2 rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-brand-500/30 transition hover:bg-brand-600"
          >
            Get Started
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="bg-gray-50 py-20 dark:bg-gray-900">
        <div className="mx-auto max-w-7xl px-4 md:px-6">
          <h2 className="mb-10 text-center text-2xl font-bold text-gray-900 dark:text-white">
            Everything you need to manage rooms
          </h2>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((f) => (
              <div
                key={f.title}
                className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800"
              >
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 dark:bg-brand-500/10">
                  {f.icon}
                </div>
                <h3 className="mb-1 text-sm font-semibold text-gray-900 dark:text-white">
                  {f.title}
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 text-center">
        <h2 className="mb-3 text-2xl font-bold text-gray-900 dark:text-white">
          Ready to get started?
        </h2>
        <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">
          Log in with your MMSU account to submit reservation requests.
        </p>
        <Link
          href="/signin"
          className="inline-block rounded-xl bg-brand-500 px-8 py-3 text-sm font-semibold text-white shadow-lg shadow-brand-500/30 transition hover:bg-brand-600"
        >
          Login to ACROSS
        </Link>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-6 text-center text-xs text-gray-400 dark:border-gray-800 dark:text-gray-600">
        MMSU-CBEA © {new Date().getFullYear()} · Academic ClassRoom Occupancy Scheduling System
      </footer>
    </div>
  );
}
