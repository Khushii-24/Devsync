// frontend/src/pages/DocumentsLayout.jsx

import { Outlet, useParams } from 'react-router-dom';
import DocumentsSidebar from '../components/DocumentsSidebar';
import WorkspaceSidebar from '../components/board/WorkspaceSidebar';
import { useProject } from '../hooks/useProjects';
import { useWorkspaceMembers } from '../hooks/useWorkspaceMembers';

export default function DocumentsLayout() {
  const { projectId } = useParams();
  const { data: project, isLoading: projectLoading } = useProject(projectId);
  const { data: members } = useWorkspaceMembers(project?.workspace_id);

  if (projectLoading) {
    return <div className="p-6 text-gray-500">Loading documents...</div>;
  }

  return (
    <div className="flex h-screen w-full overflow-hidden">
      <WorkspaceSidebar 
        workspaceId={project?.workspace_id} 
        activeProjectId={projectId} 
        members={members} 
      />
      <div className="flex-1 flex min-w-0">
        <DocumentsSidebar projectId={projectId} />
        <div className="flex-1 overflow-y-auto bg-white">
          <Outlet />
        </div>
      </div>
    </div>
  );
}