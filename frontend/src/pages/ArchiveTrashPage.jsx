import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import WorkspaceSidebar from '../components/board/WorkspaceSidebar';
import Breadcrumbs from '../components/board/Breadcrumbs';
import { useWorkspaceMembers } from '../hooks/useWorkspaces';
import { useTasks } from '../hooks/useTasks';
import { useProjects } from '../hooks/useProjects';
import Avatar from '../components/common/Avatar';
import { toast } from '../stores/toastStore';
import { Trash2, RotateCcw, Filter, AlertCircle, Layers, CheckSquare } from 'lucide-react';

import { useWorkspaceArchive, useRestoreTask, useRestoreProject } from '../hooks/useArchiveAndAudit';

export default function ArchiveTrashPage() {
  const { workspaceId, projectId } = useParams();
  const { data: members } = useWorkspaceMembers(workspaceId);

  const [filterType, setFilterType] = useState('all'); // 'all' | 'task' | 'project'

  const { data: archiveItems, isLoading } = useWorkspaceArchive(workspaceId);
  const restoreTaskMutation = useRestoreTask();
  const restoreProjectMutation = useRestoreProject();

  const handleRestore = (item) => {
    if (item.type === 'task') {
      restoreTaskMutation.mutate(item.id, {
        onSuccess: () => toast.success(`Restored task "${item.name}"`),
        onError: (err) => toast.error(err.response?.data?.detail || "Failed to restore task"),
      });
    } else {
      restoreProjectMutation.mutate(item.id, {
        onSuccess: () => toast.success(`Restored project "${item.name}"`),
        onError: (err) => toast.error(err.response?.data?.detail || "Failed to restore project"),
      });
    }
  };

  const filteredItems = (archiveItems || []).filter((item) => {
    if (filterType === 'task') return item.type === 'task';
    if (filterType === 'project') return item.type === 'project';
    return true;
  });

  return (
    <div className="flex h-screen bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-sans overflow-hidden">
      <WorkspaceSidebar workspaceId={workspaceId} activeProjectId={projectId} members={members} />

      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <div className="px-6 pt-6 pb-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-950 dark:text-white flex items-center gap-2">
              <Trash2 size={20} className="text-red-500" />
              <span>Archive & Trash</span>
            </h1>
            <p className="text-xs text-gray-400 mt-1">Review soft-deleted tasks and projects for this workspace.</p>
          </div>
          <Breadcrumbs />
        </div>

        <div className="p-6 space-y-6 max-w-5xl">
          {/* Note Banner */}
          <div className="p-3.5 bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 rounded-xl flex items-center gap-3 text-xs text-amber-900 dark:text-amber-300">
            <AlertCircle size={16} className="shrink-0 text-amber-500" />
            <span>Items in Trash are permanently deleted after 30 days. You can restore items at any time before then.</span>
          </div>

          {/* Filter Bar */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                <Filter size={13} /> Filter:
              </span>
              <div className="flex items-center p-0.5 bg-gray-100 dark:bg-gray-800 rounded-lg text-xs font-semibold text-gray-600 dark:text-gray-300">
                <button
                  onClick={() => setFilterType('all')}
                  className={`px-3 py-1 rounded-md transition-all ${
                    filterType === 'all' ? 'bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-300 shadow-2xs font-bold' : 'hover:text-gray-900'
                  }`}
                >
                  All Items
                </button>
                <button
                  onClick={() => setFilterType('task')}
                  className={`px-3 py-1 rounded-md transition-all ${
                    filterType === 'task' ? 'bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-300 shadow-2xs font-bold' : 'hover:text-gray-900'
                  }`}
                >
                  Tasks
                </button>
                <button
                  onClick={() => setFilterType('project')}
                  className={`px-3 py-1 rounded-md transition-all ${
                    filterType === 'project' ? 'bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-300 shadow-2xs font-bold' : 'hover:text-gray-900'
                  }`}
                >
                  Projects
                </button>
              </div>
            </div>

            <span className="text-xs text-gray-400 font-semibold">{filteredItems.length} items in trash</span>
          </div>

          {/* Trash Table */}
          <div className="bg-white dark:bg-gray-850 border border-gray-150 dark:border-gray-800 rounded-2xl overflow-hidden shadow-sm">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/40 text-gray-400 font-semibold">
                  <th className="py-3 px-4">Item Name</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Deleted Date</th>
                  <th className="py-3 px-4">Deleted By</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {filteredItems.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors text-gray-800 dark:text-gray-200">
                    <td className="py-3.5 px-4 font-bold text-gray-900 dark:text-white">
                      {item.name}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                        item.type === 'task' ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800/50' : 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800/50'
                      }`}>
                        {item.type === 'task' ? <CheckSquare size={11} /> : <Layers size={11} />}
                        {item.type}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-gray-400">
                      {item.deleted_at ? `${new Date(item.deleted_at).toLocaleDateString()} ${new Date(item.deleted_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : '—'}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <Avatar name={item.deleted_by} userId={item.deleted_by_user_id} size="xs" />
                        <span className="font-medium">{item.deleted_by}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => handleRestore(item)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 dark:hover:bg-indigo-900 text-indigo-600 dark:text-indigo-300 rounded-lg text-xs font-semibold transition-colors border border-indigo-200 dark:border-indigo-800/60"
                      >
                        <RotateCcw size={13} />
                        <span>Restore</span>
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredItems.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-xs text-gray-400 italic">
                      No soft-deleted items found in Trash.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
