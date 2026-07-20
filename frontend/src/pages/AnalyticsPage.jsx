import { useQuery } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import api from "../api/axios";
import VelocityChart from "../components/analytics/VelocityChart";
import AssigneeChart from "../components/analytics/AssigneeChart";
import CycleTimeCard from "../components/analytics/CycleTimeCard";
import WorkspaceSidebar from "../components/board/WorkspaceSidebar";
import { useProject } from "../hooks/useProjects";
import { useWorkspaceMembers } from "../hooks/useWorkspaceMembers";
import NotificationBell from "../components/notifications/NotificationBell";

export default function AnalyticsPage() {
    const { projectId } = useParams();
    const { data: project, isLoading: projectLoading } = useProject(projectId);
    const { data: members } = useWorkspaceMembers(project?.workspace_id);

    // Three independent queries — no reason to gate one chart's paint on another's fetch.
    const velocityQ = useQuery({
        queryKey: ["analytics", projectId, "velocity"],
        queryFn: () => api.get(`/projects/${projectId}/analytics/velocity?days=30`).then((r) => r.data),
    });

    const assigneeQ = useQuery({
        queryKey: ["analytics", projectId, "by-assignee"],
        queryFn: () => api.get(`/projects/${projectId}/analytics/by-assignee`).then((r) => r.data),
    });

    const cycleTimeQ = useQuery({
        queryKey: ["analytics", projectId, "cycle-time"],
        queryFn: () => api.get(`/projects/${projectId}/analytics/cycle-time`).then((r) => r.data),
    });

    if (projectLoading) {
        return <div className="p-6 text-gray-500">Loading analytics...</div>;
    }

    return (
        <div className="flex h-screen w-full overflow-hidden">
            <WorkspaceSidebar
                workspaceId={project?.workspace_id}
                activeProjectId={projectId}
                members={members}
            />
            <div className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900 p-6 space-y-6">
                <div className="max-w-5xl mx-auto space-y-6">
                    <div className="flex justify-between items-center">
                        <h1 className="text-xl font-semibold text-gray-950 dark:text-white">Analytics</h1>
                        <NotificationBell projectId={projectId} />
                    </div>

                    <section className="rounded-lg border border-gray-200 dark:border-gray-700 p-4 bg-white dark:bg-gray-800">
                        <h2 className="text-sm font-medium mb-2 text-gray-900 dark:text-gray-100">Velocity — last 30 days</h2>
                        {velocityQ.isLoading ? (
                            <div className="h-72 animate-pulse bg-gray-100 dark:bg-gray-700 rounded" />
                        ) : velocityQ.isError ? (
                            <div className="text-sm text-red-500">Couldn't load velocity data.</div>
                        ) : (
                            <VelocityChart points={velocityQ.data.points} />
                        )}
                    </section>

                    <section className="rounded-lg border border-gray-200 dark:border-gray-700 p-4 bg-white dark:bg-gray-800">
                        <h2 className="text-sm font-medium mb-2 text-gray-900 dark:text-gray-100">Tasks by assignee</h2>
                        {assigneeQ.isLoading ? (
                            <div className="h-72 animate-pulse bg-gray-100 dark:bg-gray-700 rounded" />
                        ) : assigneeQ.isError ? (
                            <div className="text-sm text-red-500">Couldn't load assignee data.</div>
                        ) : (
                            <AssigneeChart stats={assigneeQ.data.stats} />
                        )}
                    </section>

                    <section className="rounded-lg border border-gray-200 dark:border-gray-700 p-4 bg-white dark:bg-gray-800">
                        <h2 className="text-sm font-medium mb-2 text-gray-900 dark:text-gray-100">Avg cycle time per column</h2>
                        {cycleTimeQ.isLoading ? (
                            <div className="h-24 animate-pulse bg-gray-100 dark:bg-gray-700 rounded" />
                        ) : cycleTimeQ.isError ? (
                            <div className="text-sm text-red-500">Couldn't load cycle-time data.</div>
                        ) : (
                            <CycleTimeCard columns={cycleTimeQ.data.columns} />
                        )}
                    </section>
                </div>
            </div>
        </div>
    );
}