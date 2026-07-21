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
import { Sparkles, Sidebar as SidebarIcon } from "lucide-react";
import AIChatPanel from "../components/ai/AIChatPanel";
import NotificationBell from "../components/notifications/NotificationBell";
import Breadcrumbs from "../components/board/Breadcrumbs";

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

  const [viewMode, setViewMode] = useState('columns'); // 'columns' or 'swimlanes'
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  if (projectLoading || columnsLoading || tasksLoading) {
    return <div className="p-6 text-gray-500">Loading board...</div>;
  }

  return (
    <div className="flex h-screen w-full overflow-hidden bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      {!isSidebarCollapsed && (
        <WorkspaceSidebar workspaceId={project.workspace_id} activeProjectId={projectId} members={members} />
      )}

      <div className="flex-1 overflow-hidden flex flex-col min-w-0 bg-white dark:bg-gray-900">
        <div className="px-4 py-3 flex justify-between items-center border-b border-gray-100 dark:border-gray-800 shrink-0">

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-750 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 transition-colors"
              title={isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              <SidebarIcon size={16} />
            </button>
            <div>
              <Breadcrumbs />
              <div className="flex items-center gap-3 mt-1">
                <h1 className="text-lg font-bold text-gray-900 dark:text-white leading-tight">
                  {project.name}
                </h1>

                {/* View Mode Toggle (Columns vs Assignee Swimlanes) */}
                <div className="flex items-center p-0.5 bg-gray-100 dark:bg-gray-800 rounded-lg text-xs font-semibold text-gray-600 dark:text-gray-300">
                  <button
                    onClick={() => setViewMode('columns')}
                    className={`px-2.5 py-1 rounded-md transition-all ${
                      viewMode === 'columns' ? 'bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-300 shadow-2xs font-bold' : 'hover:text-gray-900 dark:hover:text-white'
                    }`}
                  >
                    Columns
                  </button>
                  <button
                    onClick={() => setViewMode('swimlanes')}
                    className={`px-2.5 py-1 rounded-md transition-all ${
                      viewMode === 'swimlanes' ? 'bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-300 shadow-2xs font-bold' : 'hover:text-gray-900 dark:hover:text-white'
                    }`}
                  >
                    Assignee Swimlanes
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <NotificationBell projectId={projectId} />
            <PresenceAvatars workspaceId={project.workspace_id} />
            <ConnectionStatusBadge />
          </div>
        </div>
        <FilterBar members={members} allLabels={allLabels} />

        <div className="flex-1 min-h-0 bg-gray-100 dark:bg-gray-950 p-3">
          <KanbanBoard
            projectId={projectId}
            columns={columns}
            tasks={filteredTasks}
            onOpenDetail={(task) => openTask(task.id, projectId, project.workspace_id)}
            members={members}
            viewMode={viewMode}
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