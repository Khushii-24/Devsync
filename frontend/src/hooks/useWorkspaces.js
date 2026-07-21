import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api/axios';

export function useWorkspaces() {
  return useQuery({
    queryKey: ['workspaces'],
    queryFn: () => api.get('/workspaces').then((r) => r.data),
  });
}

export function useCreateWorkspace() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (newWorkspace) =>
      api.post('/workspaces', newWorkspace).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspaces'] });
    },
  });
}

export function useWorkspaceMembers(workspaceId) {
  return useQuery({
    queryKey: ['workspace-members', workspaceId],
    queryFn: () => api.get(`/workspaces/${workspaceId}/members`).then((r) => r.data),
    enabled: !!workspaceId,
  });
}

export function useInviteMember(workspaceId) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload) =>
      api.post(`/workspaces/${workspaceId}/invite`, payload).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspace-members', workspaceId] });
    },
  });
}

export function useUpdateMemberRole(workspaceId) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, role }) =>
      api.patch(`/workspaces/${workspaceId}/members/${userId}?role=${role}`).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspace-members', workspaceId] });
    },
  });
}

export function useRemoveMember(workspaceId) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId) =>
      api.delete(`/workspaces/${workspaceId}/members/${userId}`).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspace-members', workspaceId] });
    },
  });
}

export function useWorkspaceMuteStatus(workspaceId) {
  return useQuery({
    queryKey: ['workspace-mute', workspaceId],
    queryFn: () => api.get(`/workspaces/${workspaceId}/mute-status`).then((r) => r.data),
    enabled: !!workspaceId,
  });
}

export function useToggleWorkspaceMute(workspaceId) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.post(`/workspaces/${workspaceId}/mute`).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspace-mute', workspaceId] });
    },
  });
}
