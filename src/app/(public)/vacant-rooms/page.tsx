'use client';

import { useApprovedReservations } from '@/components/hooks/use-reservations';
import { useRooms } from '@/components/hooks/use-rooms';
import { ROOM_TYPES } from '@/lib/constants';
import { Building2, CalendarDays, Search } from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState } from 'react';

export default function VacantRoomsPage() {
  const { data: rooms = [], isPending: roomsPending } = useRooms();
  const { data: reservations = [] } = useApprovedReservations();

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [floorFilter, setFloorFilter] = useState('');

  const occupiedRooms = useMemo(() => new Set(reservations.map((r) => r.room)), [reservations]);

  const floors = useMemo(
    () => [...new Set(rooms.map((r) => r.floor).filter(Boolean))].sort() as string[],
    [rooms]
  );

  const filtered = useMemo(() => {
    return rooms.filter((r) => {
      if (!r.is_active) return false;
      if (search && !r.name.toLowerCase().includes(search.toLowerCase())) return false;
      if (typeFilter && r.type !== typeFilter) return false;
      if (floorFilter && r.floor !== floorFilter) return false;
      return true;
    });
  }, [rooms, search, typeFilter, floorFilter]);

  const vacant = filtered.filter((r) => !occupiedRooms.has(r.name));
  const occupied = filtered.filter((r) => occupiedRooms.has(r.name));

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 md:px-6">
          <div>
            <h1 className="text-lg font-bold text-gray-900 dark:text-white">Vacant Rooms</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              MMSU CBEA — Room Availability
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/schedule"
              className="flex items-center gap-1.5 text-sm text-brand-500 hover:text-brand-600"
            >
              <CalendarDays size={16} />
              View Schedule
            </Link>
            <Link
              href="/signin"
              className="rounded-lg bg-brand-500 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-brand-600"
            >
              Login
            </Link>
          </div>
        </div>
      </header>

      {/* Filters */}
      <div className="mx-auto max-w-7xl px-4 pt-6 pb-4 md:px-6">
        <div className="flex flex-wrap gap-3">
          <div className="relative min-w-48 flex-1">
            <Search size={15} className="absolute top-1/2 left-3 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search room name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-10 w-full rounded-lg border border-gray-300 bg-white pl-9 pr-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-500/30 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
            />
          </div>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-500/30 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
          >
            <option value="">All Types</option>
            {ROOM_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <select
            value={floorFilter}
            onChange={(e) => setFloorFilter(e.target.value)}
            className="h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-500/30 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
          >
            <option value="">All Floors</option>
            {floors.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        </div>

        <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
          <span className="font-semibold text-green-600">{vacant.length} vacant</span> ·{' '}
          <span className="font-semibold text-red-500">{occupied.length} occupied</span> ·{' '}
          {filtered.length} total
        </p>
      </div>

      {/* Room Grid */}
      <div className="mx-auto max-w-7xl px-4 pb-10 md:px-6">
        {roomsPending ? (
          <div className="flex h-40 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex h-40 flex-col items-center justify-center text-gray-400">
            <Building2 size={32} className="mb-2" />
            <p className="text-sm">No rooms match your filters</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {[...vacant, ...occupied].map((room) => {
              const isVacant = !occupiedRooms.has(room.name);
              return (
                <div
                  key={room.id}
                  className={`rounded-xl border p-4 transition ${
                    isVacant
                      ? 'border-green-200 bg-green-50 dark:border-green-500/20 dark:bg-green-500/5'
                      : 'border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800'
                  }`}
                >
                  <div className="mb-2 flex items-start justify-between">
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-white">{room.name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{room.type}</p>
                    </div>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        isVacant
                          ? 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400'
                          : 'bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400'
                      }`}
                    >
                      {isVacant ? 'Vacant' : 'Occupied'}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                    <span>{room.capacity} pax</span>
                    {room.floor && <span>· {room.floor}</span>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
