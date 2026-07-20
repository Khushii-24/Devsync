import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from "../api/axios";

export function useColumns(projectId) {
  return useQuery({
    queryKey: ['columns', projectId],
    queryFn: async () => {
      const { data } = await api.get(`/projects/${projectId}/columns`);
      return data; // already ordered by position from the backend
    },
    enabled: !!projectId,
  });
}

export function useCreateColumn(projectId) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload) => {
      const { data } = await api.post(`/projects/${projectId}/columns`, payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['columns', projectId] });
    },
  });
}

export function useUpdateColumn(projectId) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ columnId, ...payload }) => {
      const { data } = await api.patch(`/columns/${columnId}`, payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['columns', projectId] });
    },
  });
}

export function useDeleteColumn(projectId) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (columnId) => {
      await api.delete(`/columns/${columnId}`);
      return columnId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['columns', projectId] });
    },
  });
}