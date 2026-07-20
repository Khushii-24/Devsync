import { useMemo } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useProject } from '../hooks/useProjects';
import { useColumns } from '../hooks/useColumns';
import { useTasks } from '../hooks/useTasks';
import { useWorkspaceMembers } from '../hooks/useWorkspaceMembers';
import KanbanBoard from '../components/board/KanbanBoard';
// import TaskDetailPanel from '../components/board/TaskDetailPanel';
import FilterBar from '../components/board/FilterBar';
import WorkspaceSidebar from '../components/board/WorkspaceSidebar';
import { useRealtimeBoard } from '../hooks/useRealtimeBoard';
// import { useRealtimeStore } from "../stores/realtime.store";
import { PresenceAvatars } from "../components/board/PresenceAvatars";
import { ConnectionStatusBadge } from "../components/board/ConnectionStatusBadge";
import { useTaskPanelStore } from "../stores/taskPanelStore";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import AIChatPanel from "../components/ai/AIChatPanel";

function BoardPage() {
  const { projectId } = useParams();
  useRealtimeBoard(projectId);
  const [searchParams] = useSearchParams();
  // const [selectedTask, setSelectedTask] = useState(null);
  const { data: project, isLoading: projectLoading } = useProject(projectId);
  const { data: columns, isLoading: columnsLoading } = useColumns(projectId);
  const { data: tasks, isLoading: tasksLoading } = useTasks(projectId);
  // const openTaskId = useTaskPanelStore((s) => s.openTaskId);
  // const closeTask = useTaskPanelStore((s) => s.closeTask);
  const openTask = useTaskPanelStore((s) => s.openTask);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const { data: members } = useWorkspaceMembers(project?.workspace_id);

  const assigneeFilter = searchParams.get('assignee') || '';
  const priorityFilter = searchParams.get('priority') || '';
  const labelFilter = searchParams.get('label') || '';
  const filteredTasks = useMemo(() => {
    if (!tasks) return [];
    return tasks.filter((t) => {
      if (assigneeFilter && t.assignee_id !== assigneeFilter) return false;
      if (priorityFilter && t.priority !== priorityFilter) return false;
      if (labelFilter && !t.labels?.includes(labelFilter)) return false;
      return true;
    });
  }, [tasks, assigneeFilter, priorityFilter, labelFilter]);

  // Distinct labels across ALL tasks (not filteredTasks) — the label dropdown
  // itself shouldn't shrink its own options as filters get applied.
  const allLabels = useMemo(() => {
    if (!tasks) return [];
    const set = new Set();
    tasks.forEach((t) => t.labels?.forEach((l) => set.add(l)));
    return Array.from(set).sort();
  }, [tasks]);

  if (projectLoading || columnsLoading || tasksLoading) {
    return <div className="p-6 text-gray-500">Loading board...</div>;
  }

  return (
    <div className="flex h-screen">
      <WorkspaceSidebar workspaceId={project.workspace_id} activeProjectId={projectId} members={members} />

      <div className="flex-1 overflow-hidden flex flex-col">
        <div className="px-6 pt-6 pb-2 flex justify-between items-center">

          <div>
            <h1 className="text-xl font-semibold text-gray-900">
              {project.name}
            </h1>
          </div>

          <div className="flex items-center gap-6">
            <PresenceAvatars workspaceId={project.workspace_id} />
            <ConnectionStatusBadge />
          </div>
        </div>
        <FilterBar members={members} allLabels={allLabels} />

        <div className="flex-1 min-h-0 bg-[#eee] p-3">
          <KanbanBoard
            projectId={projectId}
            columns={columns}
            tasks={filteredTasks}
            onOpenDetail={(task) => openTask(task.id, projectId, project.workspace_id)}
          />
          <AIChatPanel
            isOpen={isChatOpen}
            onClose={() => setIsChatOpen(false)}
            projectId={projectId}
          />
          <button
            onClick={() => setIsChatOpen(true)}
            className="fixed bottom-6 right-6
               bg-blue-600
               text-white
               rounded-full
               p-4
               shadow-lg
               hover:bg-blue-700
               z-40"
          >
            <Sparkles size={22} />
          </button>
        </div>
      </div>
    </div>
  );
}

export default BoardPage;