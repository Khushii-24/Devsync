import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from "../api/axios";

const taskKeys = {
  all: (projectId) => ['tasks', projectId],
};

export function useTasks(projectId) {
  return useQuery({
    queryKey: taskKeys.all(projectId),
    queryFn: async () => {
      const { data } = await api.get(`/projects/${projectId}/tasks`);
      return data;
    },
    enabled: !!projectId,
  });
}

export function useCreateTask(projectId) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload) => {
      const { data } = await api.post('/tasks', payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.all(projectId) });
    },
  });
}

export function useUpdateTask(projectId) {
  const queryClient = useQueryClient();
  return useMutation({
    // taskId is separated from the patch body here (rather than baked into payload)
    // because the detail panel (Day 6) will call this with just { priority: 'high' }
    // etc., and the URL needs the id regardless of which fields changed.
    mutationFn: async ({ taskId, ...payload }) => {
      const { data } = await api.patch(`/tasks/${taskId}`, payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.all(projectId) });
    },
  });
}

export function useDeleteTask(projectId) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (taskId) => {
      await api.delete(`/tasks/${taskId}`);
      return taskId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.all(projectId) });
    },
  });
}

// This is the one that matters most for Week 2. Today it's a plain mutation —
// fire, wait, invalidate. On Day 5 we rewrite its onMutate/onError/onSettled
// to do the optimistic snapshot-and-rollback dance around a drag event.
// The shape (mutationFn signature, query key it targets) stays identical —
// only the lifecycle callbacks around it change. That's deliberate: your
// drag-and-drop component code that CALLS this hook won't need to change on Day 5.
export function useReorderTasks(projectId) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (reorderPayload) => {
      const { data } = await api.patch('/tasks/reorder', reorderPayload);
      return data;
    },

    // Runs BEFORE the network call. `newArrangement` is the full new task list
    // we've already computed on the client (see KanbanBoard below) — not just
    // the raw reorder payload, but the complete updated tasks array ready to
    // drop straight into the cache.
    onMutate: async ({ newArrangement }) => {
      const queryKey = taskKeys.all(projectId);

      // Prevents a background refetch from overwriting our optimistic write
      // mid-flight — without this, an in-flight refetch could land AFTER our
      // optimistic update and silently stomp it with stale data.
      await queryClient.cancelQueries({ queryKey });

      const previousTasks = queryClient.getQueryData(queryKey); // the rollback snapshot

      queryClient.setQueryData(queryKey, newArrangement); // instant UI update

      // Returned value becomes `context` in onError below — this is the only
      // way data survives between these two lifecycle callbacks.
      return { previousTasks };
    },

    onError: (err, variables, context) => {
      // Something went wrong (network fail, 400 from a bad payload, etc.) —
      // put the cache back exactly how it was before the optimistic write.
      if (context?.previousTasks) {
        queryClient.setQueryData(taskKeys.all(projectId), context.previousTasks);
      }
    },

    onSettled: () => {
      // Runs whether it succeeded or failed. Refetches from the server as the
      // final source of truth — catches anything the optimistic math got
      // slightly wrong (e.g. another user moved a task in the same column
      // at the same time).
      queryClient.invalidateQueries({ queryKey: taskKeys.all(projectId) });
    },
  });
}