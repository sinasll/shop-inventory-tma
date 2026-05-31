import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  AdminCreateUserInput,
  AdminListQuery,
  AdminUpdateUserInput,
  AdminUserRow,
  Paginated,
  UserProfile,
} from '@inv/shared';
import { api } from '@/lib/api.js';

export function useAdminUsers(query: AdminListQuery) {
  const qs = new URLSearchParams();
  if (query.search) qs.set('search', query.search);
  qs.set('page', String(query.page));
  qs.set('pageSize', String(query.pageSize));
  return useQuery({
    queryKey: ['admin-users', qs.toString()],
    queryFn: () => api<Paginated<AdminUserRow>>(`/admin/users?${qs.toString()}`),
    staleTime: 10_000,
  });
}

export function useCreateAdminUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: AdminCreateUserInput) =>
      api<{ profile: UserProfile }>('/admin/users', { method: 'POST', body: input }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-users'] }),
  });
}

export function useUpdateAdminUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: AdminUpdateUserInput }) =>
      api<{ profile: UserProfile }>(`/admin/users/${id}`, { method: 'PATCH', body: input }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-users'] }),
  });
}

export function useSendTestNotification() {
  return useMutation({
    mutationFn: (id: string) =>
      api<{ ok: boolean }>(`/admin/users/${id}/test-notification`, { method: 'POST' }),
  });
}
