'use client';

import { PageBreadcrumb, ScheduleGrid } from '@/components/common';
import { useApprovedReservations } from '@/components/hooks/use-reservations';
import { useRooms } from '@/components/hooks/use-rooms';

export default function AdminSchedulePage() {
  const { data: reservations = [], isPending } = useApprovedReservations();
  const { data: rooms = [] } = useRooms();

  return (
    <div className="space-y-6">
      <PageBreadcrumb pageTitle="Schedule" />
      <ScheduleGrid
        reservations={reservations}
        rooms={rooms}
        isLoading={isPending}
        maxHeight="calc(100vh - 180px)"
      />
    </div>
  );
}
