// frontend/src/components/projects/ProjectSwitcher.jsx
import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Plus, ChevronDown } from "lucide-react";
import { useProjects } from "../../hooks/useProjects";
import CreateProjectModal from "./CreateProjectModal";

export default function ProjectSwitcher() {
    const { workspaceId, projectId } = useParams(); // flagged below if workspaceId isn't in your route params
    const { data: projects, isLoading } = useProjects(workspaceId);
    const navigate = useNavigate();
    const [isOpen, setIsOpen] = useState(false);
    const [isCreateOpen, setIsCreateOpen] = useState(false);

    if (isLoading) return null;

    const currentProject = projects?.find((p) => p.id === projectId) ?? projects?.[0];

    return (
        <div className="relative">
            <button onClick={() => setIsOpen(!isOpen)} className="flex items-center gap-2 px-3 py-2 border rounded">
                <span className="font-medium">{currentProject?.name ?? "Select project"}</span>
                <ChevronDown size={14} />
            </button>

            {isOpen && (
                <div className="absolute top-full mt-1 w-56 bg-white border rounded shadow-lg z-40">
                    {projects?.map((p) => (
                        <button
                            key={p.id}
                            onClick={() => { navigate(`/workspaces/${workspaceId}/projects/${p.id}/board`); setIsOpen(false); }}
                            className={`block w-full text-left px-3 py-2 hover:bg-gray-100 ${p.id === projectId ? "bg-gray-50 font-medium" : ""}`}
                        >
                            {p.name}
                        </button>
                    ))}
                    <button
                        onClick={() => { setIsCreateOpen(true); setIsOpen(false); }}
                        className="flex items-center gap-2 w-full text-left px-3 py-2 hover:bg-gray-100 text-blue-600 border-t"
                    >
                        <Plus size={14} /> New Project
                    </button>
                </div>
            )}

            <CreateProjectModal
                isOpen={isCreateOpen}
                onClose={() => setIsCreateOpen(false)}
                workspaceId={workspaceId}
                onCreated={(project) => navigate(`/workspaces/${workspaceId}/projects/${project.id}/board`)}
            />
        </div>
    );
}