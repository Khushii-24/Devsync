import { useQuery } from '@tanstack/react-query';
import api from '../api/axios';

export function useWorkspaceMembers(workspaceId) {
  return useQuery({
    queryKey: ['workspace-members', workspaceId],
    queryFn: async () => {
      const { data } = await api.get(`/workspaces/${workspaceId}/members`);
      return data;
    },
    enabled: !!workspaceId,
  });
}