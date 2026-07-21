import { useState } from 'react';
import { Link, useParams, useLocation, useNavigate } from 'react-router-dom';
import { ChevronRight, Home, ChevronDown } from 'lucide-react';
import { useWorkspaces } from '../../hooks/useWorkspaces';
import { useProject, useProjects } from '../../hooks/useProjects';

export default function Breadcrumbs() {
  const { workspaceId, projectId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [isProjectDropdownOpen, setIsProjectDropdownOpen] = useState(false);
  const { data: workspaces } = useWorkspaces();
  const { data: project } = useProject(projectId);
  const { data: workspaceProjects } = useProjects(workspaceId);

  const activeWorkspace = workspaces?.find((w) => w.id === workspaceId);

  // Determine current page type
  let viewName = '';
  if (location.pathname.includes('/board')) viewName = 'Board';
  else if (location.pathname.includes('/documents')) viewName = 'Documents';
  else if (location.pathname.includes('/analytics')) viewName = 'Analytics';
  else if (location.pathname.includes('/settings')) viewName = 'Settings';
  else if (location.pathname.includes('/profile')) viewName = 'Profile';

  return (
    <nav className="flex items-center space-x-1.5 text-xs text-gray-500 dark:text-gray-400 select-none py-1.5 px-3 bg-gray-50/50 dark:bg-gray-950/20 rounded-lg border border-gray-100 dark:border-gray-800/40">
      <Link
        to="/dashboard"
        className="flex items-center gap-1 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
      >
        <Home size={13} />
        <span>Home</span>
      </Link>

      {activeWorkspace && (
        <>
          <ChevronRight size={12} className="text-gray-400" />
          <Link
            to={`/dashboard?workspace=${workspaceId}`}
            className="font-medium hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors max-w-[120px] truncate"
            title={activeWorkspace.name}
          >
            {activeWorkspace.name}
          </Link>
        </>
      )}

      {project && (
        <>
          <ChevronRight size={12} className="text-gray-400" />
          <div className="relative">
            <button
              onClick={() => setIsProjectDropdownOpen(!isProjectDropdownOpen)}
              className="flex items-center gap-1 font-semibold text-gray-800 dark:text-gray-200 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors max-w-[140px] truncate"
              title={project.name}
            >
              <span className="truncate">{project.name}</span>
              <ChevronDown size={11} className="text-gray-400 shrink-0" />
            </button>

            {isProjectDropdownOpen && (
              <div className="absolute left-0 mt-1.5 w-48 bg-white dark:bg-gray-850 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl py-1 z-50 text-xs font-normal">
                <div className="px-3 py-1 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                  Switch Project
                </div>
                <div className="max-h-48 overflow-y-auto">
                  {workspaceProjects?.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => {
                        setIsProjectDropdownOpen(false);
                        navigate(`/workspaces/${workspaceId}/projects/${p.id}/board`);
                      }}
                      className={`w-full text-left px-3 py-2 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800 ${
                        p.id === projectId ? 'text-indigo-600 dark:text-indigo-400 font-bold bg-indigo-50/30' : 'text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      <span className="truncate">{p.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {viewName && (
        <>
          <ChevronRight size={12} className="text-gray-400" />
          <span className="font-semibold text-gray-900 dark:text-gray-100">
            {viewName}
          </span>
        </>
      )}
    </nav>
  );
}
