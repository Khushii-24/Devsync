// frontend/src/components/TaskDetailPanelHost.jsx

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTaskPanelStore } from '../stores/taskPanelStore';
import TaskDetailPanel from './board/TaskDetailPanel';
import axios from '../api/axios';

// Bridges the global store to the existing prop-driven panel. Reuses
// Week 2's ['tasks', projectId] cache to look up the full task object —
// falls back to a single-task query if not present in cache (e.g. direct Docs view).
export default function TaskDetailPanelHost() {
  const queryClient = useQueryClient();
  const { openTaskId, projectId, workspaceId, closeTask } = useTaskPanelStore();

  console.log('HOST render:', { openTaskId, projectId });

  // 1. Check if the task is in the project's task list query cache
  const tasks = queryClient.getQueryData(['tasks', projectId]);
  const cachedTask = tasks?.find((t) => String(t.id) === String(openTaskId));

  console.log('HOST tasks in cache:', tasks?.length, cachedTask);

  // 2. Fallback fetch: fetch single task if not found in cache
  const { data: fetchedTask, isLoading } = useQuery({
    queryKey: ['task', openTaskId],
    queryFn: () => axios.get(`/tasks/${openTaskId}`).then((r) => r.data),
    enabled: !!openTaskId && !cachedTask,
  });

  // 3. Project fetch: get project details to resolve workspaceId if missing
  const { data: project } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => axios.get(`/projects/${projectId}`).then((r) => r.data),
    enabled: !!projectId && !workspaceId,
  });

  const task = cachedTask || fetchedTask;
  const workspaceIdToUse = workspaceId || project?.workspace_id;

  if (!openTaskId || !projectId) return null;

  // Render immediately if we have a task OR if we are currently loading it
  const taskToRender = task || { id: openTaskId, title: 'Loading task...', description: '', priority: 'medium' };

  return (
    <TaskDetailPanel
      task={taskToRender}
      projectId={projectId}
      workspaceId={workspaceIdToUse}
      isOpen={true}
      onClose={closeTask}
    />
  );
}