import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from "../api/axios";// Query key convention: array form so React Query can invalidate by prefix.
// ['projects', workspaceId] means "invalidate all project queries for this workspace"
// without needing to know every exact key that's been fetched.
const projectKeys = {
  all: (workspaceId) => ['projects', workspaceId],
  detail: (projectId) => ['project', projectId],
};

export function useProjects(workspaceId) {
  return useQuery({
    queryKey: projectKeys.all(workspaceId),
    queryFn: async () => {
      const { data } = await api.get(`/workspaces/${workspaceId}/projects`);
      return data;
    },
    enabled: !!workspaceId, // don't fire until we actually have a workspaceId (e.g. before route params resolve)
  });
}

export function useProject(projectId) {
  return useQuery({
    queryKey: projectKeys.detail(projectId),
    queryFn: async () => {
      const { data } = await api.get(`/projects/${projectId}`);
      return data;
    },
    enabled: !!projectId,
  });
}

export function useCreateProject(workspaceId) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload) => {
      const { data } = await api.post(`/workspaces/${workspaceId}/projects`, payload);
      return data;
    },
    onSuccess: () => {
      // simplest-correct approach for now: invalidate → React Query refetches the list
      // in the background and every subscribed component re-renders with fresh data.
      // No optimistic insert yet — that's a Day 5-style pattern we're deferring.
      queryClient.invalidateQueries({ queryKey: projectKeys.all(workspaceId) });
    },
  });
}

export function useUpdateProject(projectId, workspaceId) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload) => {
      const { data } = await api.patch(`/projects/${projectId}`, payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectKeys.detail(projectId) });
      queryClient.invalidateQueries({ queryKey: projectKeys.all(workspaceId) });
    },
  });
}

export function useDeleteProject(workspaceId) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (projectId) => {
      await api.delete(`/projects/${projectId}`);
      return projectId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectKeys.all(workspaceId) });
    },
  });
}