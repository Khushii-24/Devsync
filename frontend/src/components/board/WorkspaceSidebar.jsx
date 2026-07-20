// frontend/src/components/board/WorkspaceSidebar.jsx
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Folder,
  FileText,
  Columns,
  MoreVertical,
  Pencil,
  Trash2,
  Plus,
  X,
  BarChart2
} from 'lucide-react';
import { useProjects, useUpdateProject, useDeleteProject } from '../../hooks/useProjects';
import CreateProjectModal from '../projects/CreateProjectModal';

function WorkspaceSidebar({ workspaceId, activeProjectId, members }) {
  const navigate = useNavigate();
  const { data: projects, isLoading } = useProjects(workspaceId);
  const updateProjectMutation = useUpdateProject(activeProjectId, workspaceId);
  const deleteProjectMutation = useDeleteProject(workspaceId);

  // Modals / Dialog states
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [projectToRename, setProjectToRename] = useState(null);
  const [projectToDelete, setProjectToDelete] = useState(null);
  const [menuOpenProjectId, setMenuOpenProjectId] = useState(null);

  // Form states for renaming
  const [renameName, setRenameName] = useState('');
  const [renameDesc, setRenameDesc] = useState('');

  const handleOpenRename = (p) => {
    setProjectToRename(p);
    setRenameName(p.name);
    setRenameDesc(p.description || '');
    setMenuOpenProjectId(null);
  };

  const handleRenameSubmit = (e) => {
    e.preventDefault();
    if (!renameName.trim()) return;

    updateProjectMutation.mutate(
      { name: renameName, description: renameDesc },
      {
        onSuccess: () => {
          setProjectToRename(null);
        },
      }
    );
  };

  const handleDeleteSubmit = () => {
    if (!projectToDelete) return;

    deleteProjectMutation.mutate(projectToDelete.id, {
      onSuccess: () => {
        // If we deleted the active project, find another project to redirect to
        if (projectToDelete.id === activeProjectId) {
          const remaining = projects?.filter((p) => p.id !== projectToDelete.id);
          if (remaining && remaining.length > 0) {
            navigate(`/projects/${remaining[0].id}/board`);
          } else {
            navigate('/dashboard');
          }
        }
        setProjectToDelete(null);
      },
    });
  };

  return (
    <div className="w-64 shrink-0 border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 flex flex-col h-full font-sans select-none text-gray-900 dark:text-gray-100">
      {/* Workspace Header */}
      <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-sm">
            D
          </div>
          <div>
            <div className="text-sm font-semibold text-gray-900 dark:text-gray-100 leading-tight">Devsync</div>
            <div className="text-xs text-gray-400">Workspace</div>
          </div>
        </div>
      </div>

      {/* Projects Section */}
      <div className="flex-1 overflow-y-auto px-3 py-4 flex flex-col gap-6">
        <div>
          <div className="flex items-center justify-between px-2 mb-2">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Projects</span>
            <button
              onClick={() => setIsCreateOpen(true)}
              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
              title="New Project"
            >
              <Plus size={14} />
            </button>
          </div>

          {isLoading ? (
            <div className="px-3 py-2 text-xs text-gray-400">Loading projects...</div>
          ) : projects?.length === 0 ? (
            <div className="px-3 py-6 text-center border border-dashed border-gray-200 dark:border-gray-800 rounded-lg">
              <p className="text-xs text-gray-400 mb-2">No projects yet</p>
              <button
                onClick={() => setIsCreateOpen(true)}
                className="inline-flex items-center gap-1 text-xs text-indigo-600 font-semibold hover:text-indigo-700"
              >
                <Plus size={12} /> Create Project
              </button>
            </div>
          ) : (
            <div className="space-y-0.5">
              {projects?.map((p) => {
                const isActive = p.id === activeProjectId;
                return (
                  <div key={p.id} className="group relative">
                    <div
                      className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-all duration-150 ${isActive
                        ? 'bg-indigo-50/70 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-200 font-medium'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
                        }`}
                    >
                      <Link
                        to={`/projects/${p.id}/board`}
                        className="flex-1 flex items-center gap-2.5 truncate"
                      >
                        <Folder size={16} className={isActive ? 'text-indigo-600' : 'text-gray-400'} />
                        <span className="truncate">{p.name}</span>
                      </Link>

                      <div className="flex items-center gap-2">
                        {p.task_count > 0 && (
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${isActive ? 'bg-indigo-200/50 dark:bg-indigo-950/80 text-indigo-800 dark:text-indigo-300' : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
                            }`}>
                            {p.task_count}
                          </span>
                        )}

                        <button
                          onClick={() => setMenuOpenProjectId(menuOpenProjectId === p.id ? null : p.id)}
                          className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-gray-200 dark:hover:bg-gray-850 rounded text-gray-400 hover:text-gray-600 transition-all"
                        >
                          <MoreVertical size={14} />
                        </button>
                      </div>
                    </div>

                    {/* Actions Dropdown */}
                    {menuOpenProjectId === p.id && (
                      <div className="absolute right-2 top-8 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1 z-30 w-36">
                        <button
                          onClick={() => handleOpenRename(p)}
                          className="flex items-center gap-2 w-full px-3 py-2 text-xs text-left text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
                        >
                          <Pencil size={12} /> Rename Project
                        </button>
                        <button
                          onClick={() => {
                            setProjectToDelete(p);
                            setMenuOpenProjectId(null);
                          }}
                          className="flex items-center gap-2 w-full px-3 py-2 text-xs text-left text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 border-t border-gray-100 dark:border-gray-700"
                        >
                          <Trash2 size={12} /> Delete Project
                        </button>
                      </div>
                    )}

                    {/* Sub navigation for Active Project */}
                    {isActive && (
                      <div className="pl-8 pr-3 mt-1 space-y-1">
                        <Link
                          to={`/projects/${p.id}/board`}
                          className="flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white transition-colors"
                        >
                          <Columns size={12} />
                          <span>Board</span>
                        </Link>
                        <Link
                          to={`/projects/${p.id}/documents`}
                          className="flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white transition-colors"
                        >
                          <FileText size={12} />
                          <span>Documents</span>
                        </Link>
                        <Link
                          to={`/projects/${p.id}/analytics`}
                          className="flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white transition-colors"
                        >
                          <BarChart2 size={12} />
                          <span>Analytics</span>
                        </Link>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Members Section */}
      <div className="p-4 border-t border-gray-105 dark:border-gray-800 flex-shrink-0">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block">Members</span>
        </div>
        <div className="flex -space-x-1.5 overflow-hidden">
          {members?.slice(0, 6).map((m) => (
            <div
              key={m.user_id}
              title={m.name || m.email}
              className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-950 border-2 border-white dark:border-gray-900 text-xs font-bold text-indigo-700 dark:text-indigo-300 flex items-center justify-center shrink-0 shadow-sm"
            >
              {(m.name || m.email).slice(0, 2).toUpperCase()}
            </div>
          ))}
          {members?.length > 6 && (
            <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 border-2 border-white dark:border-gray-900 text-xs font-bold text-gray-600 dark:text-gray-400 flex items-center justify-center shrink-0 shadow-sm">
              +{members.length - 6}
            </div>
          )}
        </div>
      </div>

      {/* Create Project Modal */}
      <CreateProjectModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        workspaceId={workspaceId}
        onCreated={(project) => navigate(`/projects/${project.id}/board`)}
      />

      {/* Rename Modal */}
      {projectToRename && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-850 rounded-xl p-6 w-full max-w-md shadow-xl border border-gray-100 dark:border-gray-700 text-gray-900 dark:text-gray-100">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-base font-semibold text-gray-900 dark:text-white">Rename Project</h3>
              <button
                onClick={() => setProjectToRename(null)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleRenameSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-450 mb-1">Project Name</label>
                <input
                  type="text"
                  value={renameName}
                  onChange={(e) => setRenameName(e.target.value)}
                  className="w-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-450 mb-1">Description (Optional)</label>
                <textarea
                  value={renameDesc}
                  onChange={(e) => setRenameDesc(e.target.value)}
                  rows={3}
                  className="w-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setProjectToRename(null)}
                  className="px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-xs font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updateProjectMutation.isPending}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700 disabled:opacity-50"
                >
                  {updateProjectMutation.isPending ? 'Saving...' : 'Rename'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {projectToDelete && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-850 rounded-xl p-6 w-full max-w-sm shadow-xl border border-gray-100 dark:border-gray-700 text-center text-gray-900 dark:text-gray-100">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-2">Delete Project</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-6">
              Are you sure you want to delete <strong>{projectToDelete.name}</strong>? This action is permanent and will delete all associated columns, tasks, and documents.
            </p>
            <div className="flex justify-center gap-3">
              <button
                onClick={() => setProjectToDelete(null)}
                className="px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-xs font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteSubmit}
                disabled={deleteProjectMutation.isPending}
                className="px-4 py-2 bg-red-600 text-white rounded-lg text-xs font-semibold hover:bg-red-700 disabled:opacity-50"
              >
                {deleteProjectMutation.isPending ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default WorkspaceSidebar;