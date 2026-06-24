import {
  createRoom,
  deleteRoom,
  getRoom,
  getRooms,
  toggleRoomStatus,
  updateRoom,
  type CreateRoomInput,
  type UpdateRoomInput,
} from '@/actions/rooms';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

export function useRooms(query?: string) {
  return useQuery({
    queryKey: ['rooms', query],
    queryFn: () => getRooms(query),
  });
}

export function useRoom(id?: string) {
  return useQuery({
    queryKey: ['room', id],
    queryFn: () => getRoom(id!),
    enabled: !!id,
  });
}

export function useCreateRoom() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateRoomInput) => createRoom(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['rooms'] }),
  });
}

export function useUpdateRoom() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateRoomInput }) => updateRoom(id, data),
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
      queryClient.invalidateQueries({ queryKey: ['room', id] });
      queryClient.invalidateQueries({ queryKey: ['reservations'] });
    },
  });
}

export function useToggleRoomStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, current }: { id: string; current: boolean }) =>
      toggleRoomStatus(id, current),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['rooms'] }),
  });
}

export function useDeleteRoom() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteRoom(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
      queryClient.invalidateQueries({ queryKey: ['reservations'] });
    },
  });
}
