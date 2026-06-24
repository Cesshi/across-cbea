import {
  createProfile,
  deleteProfile,
  getProfile,
  getProfiles,
  toggleProfileStatus,
  updateProfile,
  type CreateProfileInput,
  type UpdateProfileInput,
} from '@/actions/users';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

export function useProfiles(query?: string) {
  return useQuery({
    queryKey: ['profiles', query],
    queryFn: () => getProfiles(query),
  });
}

export function useProfile(id?: string) {
  return useQuery({
    queryKey: ['profile', id],
    queryFn: () => getProfile(id!),
    enabled: !!id,
  });
}

export function useCreateProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateProfileInput) => createProfile(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['profiles'] }),
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateProfileInput }) => updateProfile(id, data),
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['profiles'] });
      queryClient.invalidateQueries({ queryKey: ['profile', id] });
    },
  });
}

export function useToggleProfileStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, current }: { id: string; current: boolean }) =>
      toggleProfileStatus(id, current),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['profiles'] }),
  });
}

export function useDeleteProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteProfile(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['profiles'] }),
  });
}
