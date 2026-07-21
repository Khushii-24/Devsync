import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api/axios';

export function useWorkspaceArchive(workspaceId) {
  return useQuery({
    queryKey: ['workspace-archive', workspaceId],
    queryFn: () => api.get(`/workspaces/${workspaceId}/archive`).then((r) => r.data),
    enabled: !!workspaceId,
  });
}

export function useRestoreTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (taskId) => api.post(`/tasks/${taskId}/restore`).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspace-archive'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}

export function useRestoreProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (projectId) => api.post(`/projects/${projectId}/restore`).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspace-archive'] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });
}

export function useWorkspaceAuditLog(workspaceId, filters = {}) {
  const params = new URLSearchParams();
  if (filters.actor_id) params.append('actor_id', filters.actor_id);
  if (filters.event_type) params.append('event_type', filters.event_type);
  if (filters.start_date) params.append('start_date', filters.start_date);
  if (filters.end_date) params.append('end_date', filters.end_date);
  if (filters.page) params.append('page', filters.page);
  if (filters.limit) params.append('limit', filters.limit);

  return useQuery({
    queryKey: ['workspace-audit-log', workspaceId, filters],
    queryFn: () => api.get(`/workspaces/${workspaceId}/audit-log?${params.toString()}`).then((r) => r.data),
    enabled: !!workspaceId,
  });
}
