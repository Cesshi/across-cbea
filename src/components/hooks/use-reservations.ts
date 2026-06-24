import {
  approveReservation,
  batchImport,
  clearAllReservations,
  createReservation,
  deleteReservation,
  detectAllConflicts,
  detectConflict,
  getApprovedReservations,
  getPendingCount,
  getReservation,
  getReservations,
  getReservationsByStatus,
  previewImport,
  rejectReservation,
  updateReservation,
  type CreateReservationInput,
  type ImportRow,
  type UpdateReservationInput,
} from '@/actions/reservations';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

export function useReservations(query?: string) {
  return useQuery({
    queryKey: ['reservations', query],
    queryFn: () => getReservations(query),
  });
}

export function useReservationsByStatus(status: string, query?: string) {
  return useQuery({
    queryKey: ['reservations', status, query],
    queryFn: () => getReservationsByStatus(status, query),
  });
}

export function useApprovedReservations() {
  return useQuery({
    queryKey: ['reservations', 'approved'],
    queryFn: () => getApprovedReservations(),
  });
}

export function usePendingCount() {
  return useQuery({
    queryKey: ['reservations', 'pending-count'],
    queryFn: () => getPendingCount(),
  });
}

export function useReservation(id?: string) {
  return useQuery({
    queryKey: ['reservation', id],
    queryFn: () => getReservation(id!),
    enabled: !!id,
  });
}

export function useAllConflicts() {
  return useQuery({
    queryKey: ['conflicts'],
    queryFn: () => detectAllConflicts(),
  });
}

export function useDetectConflict(
  room: string,
  day: string,
  time_slot: string,
  excludeId?: string
) {
  return useQuery({
    queryKey: ['conflict-check', room, day, time_slot, excludeId],
    queryFn: () => detectConflict(room, day, time_slot, excludeId),
    enabled: !!(room && day && time_slot),
  });
}

export function useCreateReservation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateReservationInput) => createReservation(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reservations'] });
      queryClient.invalidateQueries({ queryKey: ['conflicts'] });
    },
  });
}

export function useUpdateReservation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateReservationInput }) =>
      updateReservation(id, data),
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['reservations'] });
      queryClient.invalidateQueries({ queryKey: ['reservation', id] });
      queryClient.invalidateQueries({ queryKey: ['conflicts'] });
    },
  });
}

export function useDeleteReservation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteReservation(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reservations'] });
      queryClient.invalidateQueries({ queryKey: ['conflicts'] });
    },
  });
}

export function useApproveReservation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => approveReservation(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reservations'] });
      queryClient.invalidateQueries({ queryKey: ['conflicts'] });
    },
  });
}

export function useRejectReservation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => rejectReservation(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['reservations'] }),
  });
}

export function usePreviewImport() {
  return useMutation({
    mutationFn: (rows: ImportRow[]) => previewImport(rows),
  });
}

export function useBatchImport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (rows: ImportRow[]) => batchImport(rows),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reservations'] });
      queryClient.invalidateQueries({ queryKey: ['conflicts'] });
    },
  });
}

export function useClearAllReservations() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => clearAllReservations(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reservations'] });
      queryClient.invalidateQueries({ queryKey: ['conflicts'] });
    },
  });
}
