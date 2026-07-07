import { useQuery } from '@tanstack/react-query';
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