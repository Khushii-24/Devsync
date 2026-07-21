import { useState, useEffect, useMemo } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { Plus, FolderPlus, Settings, FileText, Columns, BarChart2, PlusCircle, Folder, Clock, Bell, ChevronDown, Layers, ShieldCheck, UserCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import { useWorkspaces } from '../hooks/useWorkspaces';
import { useProjects } from '../hooks/useProjects';
import { useProjectMembers } from '../hooks/useProjectMembers';
import CreateWorkspaceModal from '../components/projects/CreateWorkspaceModal';
import CreateProjectModal from '../components/projects/CreateProjectModal';
import SlidingWorkspacePanel from '../components/SlidingWorkspacePanel';
import { useAuthStore } from '../stores/auth.store';
import { useQuery } from '@tanstack/react-query';
import api from '../api/axios';

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: workspaces, isLoading: workspacesLoading } = useWorkspaces();

  // Dialog / Modal states
  const [isWorkspaceModalOpen, setIsWorkspaceModalOpen] = useState(false);
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [isSlidingPanelOpen, setIsSlidingPanelOpen] = useState(false);

  // Section collapse states
  const [isYourProjectsOpen, setIsYourProjectsOpen] = useState(true);
  const [isSharedProjectsOpen, setIsSharedProjectsOpen] = useState(true);

  // Active workspace calculation
  const workspaceQueryId = searchParams.get('workspace');
  const [activeWorkspaceId, setActiveWorkspaceId] = useState(null);

  useEffect(() => {
    if (workspaces && workspaces.length > 0) {
      if (workspaceQueryId && workspaces.some((w) => w.id === workspaceQueryId)) {
        setActiveWorkspaceId(workspaceQueryId);
      } else {
        setActiveWorkspaceId(workspaces[0].id);
        setSearchParams({ workspace: workspaces[0].id });
      }
    }
  }, [workspaces, workspaceQueryId, setSearchParams]);

  // Fetch projects for active workspace
  const { data: projects, isLoading: projectsLoading } = useProjects(activeWorkspaceId);

  // Fetch notifications for unread badges
  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications', user?.id],
    queryFn: () => api.get('/notifications').then((r) => r.data),
    enabled: !!user?.id,
  });

  const activeWorkspace = workspaces?.find((w) => w.id === activeWorkspaceId);

  // Track recent project visits in localStorage
  const [recentProjectIds, setRecentProjectIds] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('devsync_recent_projects') || '[]');
    } catch (e) {
      return [];
    }
  });

  const handleProjectClick = (projectId) => {
    // Record visit in client-side recent list
    const updated = [projectId, ...recentProjectIds.filter((id) => id !== projectId)].slice(0, 4);
    setRecentProjectIds(updated);
    try {
      localStorage.setItem('devsync_recent_projects', JSON.stringify(updated));
    } catch (e) {}
    navigate(`/workspaces/${activeWorkspaceId}/projects/${projectId}/board`);
  };

  const recentProjects = useMemo(() => {
    if (!projects || recentProjectIds.length === 0) return [];
    return recentProjectIds
      .map((id) => projects.find((p) => p.id === id))
      .filter(Boolean);
  }, [projects, recentProjectIds]);

  const handleWorkspaceChange = (workspaceId) => {
    setActiveWorkspaceId(workspaceId);
    setSearchParams({ workspace: workspaceId });
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.05 }
    }
  };

  const itemVariants = {
    hidden: { y: 15, opacity: 0 },
    show: { y: 0, opacity: 1 }
  };

  if (workspacesLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 text-gray-400">
        <div className="animate-pulse flex flex-col items-center gap-2">
          <div className="w-10 h-10 rounded-full border-4 border-indigo-600 border-t-transparent animate-spin" />
          <span className="text-sm font-semibold">Loading workspaces...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 font-sans flex">
      
      {/* Slack-style Thin Left Rail for Workspace Avatars */}
      <aside className="w-16 bg-gray-900 dark:bg-gray-950 border-r border-gray-800 flex flex-col items-center py-4 gap-3 shrink-0 z-20">
        <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-extrabold text-sm shadow-md mb-2">
          DS
        </div>

        <div className="w-8 h-px bg-gray-800 my-1" />

        {/* Workspace Icons */}
        <div className="flex-1 space-y-2.5 overflow-y-auto w-full flex flex-col items-center">
          {workspaces?.map((w) => {
            const isActive = w.id === activeWorkspaceId;
            const initials = (w.name || 'WS').slice(0, 2).toUpperCase();
            return (
              <button
                key={w.id}
                onClick={() => handleWorkspaceChange(w.id)}
                title={w.name}
                className={`relative w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs transition-all ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-lg scale-105 ring-2 ring-indigo-400'
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white'
                }`}
              >
                {initials}
                {isActive && (
                  <span className="absolute left-0 top-2 bottom-2 w-1 rounded-r bg-white" />
                )}
              </button>
            );
          })}
        </div>

        {/* Add Workspace Button */}
        <button
          onClick={() => setIsWorkspaceModalOpen(true)}
          className="w-10 h-10 rounded-xl bg-gray-800 hover:bg-indigo-600 text-gray-400 hover:text-white flex items-center justify-center transition-colors"
          title="Add Workspace"
        >
          <Plus size={18} />
        </button>
      </aside>

      {/* Main Content Body */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* Header */}
        <header className="sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-150 dark:border-gray-850 px-6 py-4 flex items-center justify-between z-30 shadow-sm">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsSlidingPanelOpen(true)}
              className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl border border-gray-200 dark:border-gray-750 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors group"
            >
              <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-xs shadow-xs">
                {(activeWorkspace?.name || 'WS').slice(0, 2).toUpperCase()}
              </div>
              <span className="text-sm font-bold text-gray-900 dark:text-white truncate max-w-[160px]">
                {activeWorkspace?.name || 'DevSync'}
              </span>
              <ChevronDown size={14} className="text-gray-400 group-hover:text-indigo-600 transition-colors" />
            </button>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/profile"
              className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-250 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
            >
              <div className="w-7 h-7 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-bold text-xs flex items-center justify-center border border-indigo-200 dark:border-indigo-800">
                {(user?.username || 'U').slice(0, 2).toUpperCase()}
              </div>
              <span className="hidden md:inline font-medium">{user?.username}</span>
            </Link>
            <button
              onClick={handleLogout}
              className="px-3.5 py-1.5 border border-gray-200 dark:border-gray-750 hover:bg-red-50 dark:hover:bg-red-950/20 text-gray-600 dark:text-gray-300 hover:text-red-600 rounded-lg text-xs font-semibold transition-colors"
            >
              Sign out
            </button>
          </div>
        </header>

        {/* Main Dashboard Content */}
        <main className="max-w-6xl mx-auto px-6 py-8 w-full flex-1">
          
          {/* Workspace header & action buttons */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Workspace Dashboard</h2>
              <p className="text-xs text-gray-400">Select a project to access real-time kanban boards, tasks, and documentation.</p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsWorkspaceModalOpen(true)}
                className="flex items-center gap-1.5 px-4 py-2 border border-gray-200 dark:border-gray-750 hover:bg-gray-100 dark:hover:bg-gray-850 rounded-lg text-xs font-bold text-gray-700 dark:text-gray-300 transition-all shrink-0"
              >
                <FolderPlus size={14} />
                <span>New Workspace</span>
              </button>
              {activeWorkspaceId && (
                <button
                  onClick={() => setIsProjectModalOpen(true)}
                  className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-md transition-all shrink-0"
                >
                  <Plus size={14} />
                  <span>New Project</span>
                </button>
              )}
            </div>
          </div>

          {/* Recent Projects Row (Slack-inspired) */}
          {recentProjects.length > 0 && (
            <div className="mb-8 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-wider">
                <Clock size={13} className="text-indigo-500" />
                <span>Recent Projects</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                {recentProjects.map((rp) => (
                  <div
                    key={rp.id}
                    onClick={() => handleProjectClick(rp.id)}
                    className="p-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl hover:border-indigo-500 dark:hover:border-indigo-400 hover:shadow-md cursor-pointer transition-all flex items-center justify-between group"
                  >
                    <div className="min-w-0 pr-2">
                      <div className="text-xs font-bold text-gray-900 dark:text-white truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                        {rp.name}
                      </div>
                      <div className="text-[10px] text-gray-400 mt-0.5">{rp.task_count} Tasks</div>
                    </div>
                    <span className="p-1.5 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-400 group-hover:bg-indigo-50 dark:group-hover:bg-indigo-950 group-hover:text-indigo-600 transition-colors">
                      <ChevronDown size={12} className="-rotate-90" />
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* First-Run Onboarding Screen for accounts with ZERO workspaces */}
          {workspaces?.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              className="py-16 px-8 text-center border border-indigo-100 dark:border-indigo-900/50 rounded-3xl bg-gradient-to-b from-indigo-50/50 via-white to-white dark:from-indigo-950/20 dark:via-gray-900 dark:to-gray-900 shadow-xl max-w-xl mx-auto my-6"
            >
              <div className="w-16 h-16 rounded-2xl bg-indigo-600 text-white flex items-center justify-center mx-auto mb-6 shadow-lg shadow-indigo-500/20 font-black text-xl">
                DS
              </div>
              
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Welcome to DevSync! 👋</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-8 max-w-md mx-auto leading-relaxed">
                You're logged in with a fresh account. Create your first workspace to start collaborating on real-time Kanban boards, documents, and team workflows.
              </p>

              <div className="grid grid-cols-3 gap-3 text-left mb-8 max-w-md mx-auto">
                <div className="p-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700/80 shadow-2xs">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 mb-2" />
                  <div className="text-[11px] font-bold text-gray-800 dark:text-gray-200">Kanban Boards</div>
                  <div className="text-[9px] text-gray-400">Real-time task sync</div>
                </div>
                <div className="p-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700/80 shadow-2xs">
                  <div className="w-2 h-2 rounded-full bg-blue-500 mb-2" />
                  <div className="text-[11px] font-bold text-gray-800 dark:text-gray-200">Shared Docs</div>
                  <div className="text-[9px] text-gray-400">Collaborative editor</div>
                </div>
                <div className="p-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700/80 shadow-2xs">
                  <div className="w-2 h-2 rounded-full bg-purple-500 mb-2" />
                  <div className="text-[11px] font-bold text-gray-800 dark:text-gray-200">Team RBAC</div>
                  <div className="text-[9px] text-gray-400">Granular overrides</div>
                </div>
              </div>

              <button
                onClick={() => setIsWorkspaceModalOpen(true)}
                className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-lg shadow-indigo-600/30 transition-all hover:scale-105"
              >
                + Create Your First Workspace
              </button>
            </motion.div>
          ) : (
            <div className="space-y-6">
              
              <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-800 pb-3">
                <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                  <Layers size={16} className="text-indigo-500" />
                  <span>Projects in {activeWorkspace?.name || 'Workspace'}</span>
                </h3>
                {activeWorkspaceId && (
                  <Link
                    to={`/workspaces/${activeWorkspaceId}/settings`}
                    className="flex items-center gap-1.5 text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-semibold"
                  >
                    <Settings size={13} />
                    <span>Manage Members & Overrides</span>
                  </Link>
                )}
              </div>

              {projectsLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[1, 2].map((i) => (
                    <div key={i} className="h-36 rounded-xl bg-white dark:bg-gray-900 border border-gray-150 dark:border-gray-850 p-4 animate-pulse flex flex-col justify-between">
                      <div className="space-y-2">
                        <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-2/3" />
                        <div className="h-3 bg-gray-200 dark:bg-gray-800 rounded w-1/2" />
                      </div>
                      <div className="h-3 bg-gray-200 dark:bg-gray-800 rounded w-1/4" />
                    </div>
                  ))}
                </div>
              ) : !projects || projects.length === 0 ? (
                <div className="py-12 text-center border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-2xl bg-white dark:bg-gray-900 shadow-sm">
                  <Folder size={32} className="mx-auto text-gray-400 mb-3" />
                  <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-1">Create your first project</h4>
                  <p className="text-xs text-gray-400 mb-4 max-w-xs mx-auto">
                    Get started by creating a project for this workspace to track columns, tasks, and documentation.
                  </p>
                  <button
                    onClick={() => setIsProjectModalOpen(true)}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg transition-colors shadow-sm"
                  >
                    Create Project
                  </button>
                </div>
              ) : (
                <div className="space-y-6">
                  
                  {/* Collapsible Section: Workspace Projects */}
                  <div>
                    <button
                      onClick={() => setIsYourProjectsOpen(!isYourProjectsOpen)}
                      className="flex items-center gap-2 text-xs font-bold text-gray-500 dark:text-gray-400 mb-3 hover:text-gray-900 dark:hover:text-white transition-colors"
                    >
                      <ChevronDown size={14} className={`transition-transform ${isYourProjectsOpen ? '' : '-rotate-90'}`} />
                      <span>Workspace Projects ({projects.length})</span>
                    </button>

                    {isYourProjectsOpen && (
                      <motion.div
                        className="grid grid-cols-1 md:grid-cols-2 gap-4"
                        variants={containerVariants}
                        initial="hidden"
                        animate="show"
                      >
                        {projects.map((project) => {
                          const projectUnreadCount = notifications.filter(
                            (n) => n.project_id === project.id && !n.is_read
                          ).length;

                          return (
                            <motion.div
                              key={project.id}
                              variants={itemVariants}
                              whileHover={{ y: -3, transition: { duration: 0.15 } }}
                              onClick={() => handleProjectClick(project.id)}
                              className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5 flex flex-col justify-between shadow-sm hover:shadow-md hover:border-indigo-400 dark:hover:border-indigo-600 transition-all cursor-pointer relative overflow-hidden group"
                            >
                              <div>
                                <div className="flex items-center justify-between mb-1.5">
                                  <h4 className="font-bold text-gray-900 dark:text-white text-sm truncate pr-4 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                                    {project.name}
                                  </h4>

                                  {/* Unread Activity Badge */}
                                  {projectUnreadCount > 0 && (
                                    <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 shrink-0">
                                      <Bell size={10} />
                                      <span>{projectUnreadCount} new</span>
                                    </span>
                                  )}
                                </div>

                                <p className="text-xs text-gray-400 dark:text-gray-500 line-clamp-2 mb-4 leading-relaxed">
                                  {project.description || 'No description provided.'}
                                </p>
                              </div>

                              <div className="flex items-center justify-between border-t border-gray-100 dark:border-gray-800 pt-3">
                                <div className="flex items-center gap-2">
                                  <span className="text-[10px] font-bold px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 rounded-full">
                                    {project.task_count} Tasks
                                  </span>
                                  <span className="text-[10px] text-gray-400">
                                    Created {new Date(project.created_at).toLocaleDateString()}
                                  </span>
                                </div>
                                
                                <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                                  <Link
                                    to={`/workspaces/${activeWorkspaceId}/projects/${project.id}/board`}
                                    className="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-950 text-indigo-700 dark:text-indigo-400 rounded-lg text-[10px] font-bold transition-colors"
                                  >
                                    Board
                                  </Link>
                                  <Link
                                    to={`/workspaces/${activeWorkspaceId}/projects/${project.id}/documents`}
                                    className="px-2.5 py-1.5 bg-gray-50 hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-750 text-gray-700 dark:text-gray-300 rounded-lg text-[10px] font-bold transition-colors"
                                  >
                                    Docs
                                  </Link>
                                </div>
                              </div>
                            </motion.div>
                          );
                        })}
                      </motion.div>
                    )}
                  </div>

                </div>
              )}
            </div>
          )}

        </main>
      </div>

      {/* Sliding Workspace Drawer (Slack-style) */}
      <SlidingWorkspacePanel
        isOpen={isSlidingPanelOpen}
        onClose={() => setIsSlidingPanelOpen(false)}
        activeWorkspaceId={activeWorkspaceId}
        onSelectWorkspace={handleWorkspaceChange}
      />

      {/* Workspace Creation Modal */}
      <CreateWorkspaceModal
        isOpen={isWorkspaceModalOpen}
        onClose={() => setIsWorkspaceModalOpen(false)}
        onCreated={(ws) => {
          handleWorkspaceChange(ws.id);
        }}
      />

      {/* Project Creation Modal */}
      <CreateProjectModal
        isOpen={isProjectModalOpen}
        onClose={() => setIsProjectModalOpen(false)}
        workspaceId={activeWorkspaceId}
        onCreated={(p) => {
          navigate(`/workspaces/${activeWorkspaceId}/projects/${p.id}/board`);
        }}
      />

    </div>
  );
}