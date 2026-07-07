import { Link } from 'react-router-dom';
import { useProjects } from '../../hooks/useProjects';

function WorkspaceSidebar({ workspaceId, activeProjectId, members }) {
  const { data: projects, isLoading } = useProjects(workspaceId);

  return (
    <div className="w-56 shrink-0 border-r border-gray-100 flex flex-col">
      <div className="p-4">
        <span className="text-xs font-medium text-gray-400 uppercase">Projects</span>
      </div>

      <div className="flex-1 overflow-y-auto px-2">
        {isLoading && <div className="px-2 text-sm text-gray-400">Loading...</div>}
        {projects?.map((p) => (
          <Link
            key={p.id}
            to={`/projects/${p.id}/board`}
            className={`block px-2 py-1.5 rounded-md text-sm mb-0.5 ${
              p.id === activeProjectId
                ? 'bg-gray-900 text-white'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            {p.name}
          </Link>
        ))}
      </div>

      {/* Member avatars — stacked/overlapping circle row, common pattern for "who's on this workspace" */}
      <div className="p-4 border-t border-gray-100">
        <span className="text-xs font-medium text-gray-400 uppercase block mb-2">Members</span>
        <div className="flex -space-x-2">
          {members?.slice(0, 6).map((m) => (
            <div
              key={m.user_id}
              title={m.name || m.email}
              className="w-7 h-7 rounded-full bg-blue-200 border-2 border-white text-[10px] flex items-center justify-center"
            >
              {(m.name || m.email).slice(0, 2).toUpperCase()}
            </div>
          ))}
          {members?.length > 6 && (
            <div className="w-7 h-7 rounded-full bg-gray-200 border-2 border-white text-[10px] flex items-center justify-center">
              +{members.length - 6}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default WorkspaceSidebar;