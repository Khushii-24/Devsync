import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api/axios';

export function useProjectMembers(projectId) {
  return useQuery({
    queryKey: ['project-members', projectId],
    queryFn: () => api.get(`/projects/${projectId}/members`).then((r) => r.data),
    enabled: !!projectId,
  });
}

export function useCreateProjectOverride(projectId) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (override) =>
      api.post(`/projects/${projectId}/members`, override).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-members', projectId] });
    },
  });
}

export function useDeleteProjectOverride(projectId) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId) =>
      api.delete(`/projects/${projectId}/members/${userId}`).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-members', projectId] });
    },
  });
}
