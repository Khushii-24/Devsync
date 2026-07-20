// frontend/src/components/projects/CreateProjectModal.jsx
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { useCreateProject } from "../../hooks/useProjects";
import api from "../../api/axios";

const schema = z.object({
    name: z.string().min(1, "Project name is required").max(100),
    description: z.string().max(500).optional(),
});

export default function CreateProjectModal({ isOpen, onClose, workspaceId, onCreated }) {
    const { register, handleSubmit, reset, formState: { errors } } = useForm({
        resolver: zodResolver(schema),
    });
    const createProject = useCreateProject(workspaceId);

    const onSubmit = (data) => {
        createProject.mutate(data, {
            onSuccess: async (project) => {
                try {
                    // Automatically create default columns (To Do, In Progress, Done)
                    await api.post(`/projects/${project.id}/columns`, { name: "To Do" });
                    await api.post(`/projects/${project.id}/columns`, { name: "In Progress" });
                    await api.post(`/projects/${project.id}/columns`, { name: "Done" });
                } catch (err) {
                    console.error("Failed to create default columns:", err);
                }
                reset();
                onClose();
                onCreated?.(project);
            },
        });
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    onClick={onClose}
                >
                    <motion.div
                        className="bg-white rounded-lg p-6 w-full max-w-md"
                        initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-lg font-semibold">New Project</h2>
                            <button onClick={onClose}><X size={18} /></button>
                        </div>

                        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
                            <div>
                                <input {...register("name")} placeholder="Project name" className="w-full border rounded px-3 py-2" autoFocus />
                                {errors.name && <p className="text-red-500 text-sm">{errors.name.message}</p>}
                            </div>
                            <div>
                                <textarea {...register("description")} placeholder="Description (optional)" rows={3} className="w-full border rounded px-3 py-2" />
                            </div>
                            <button type="submit" disabled={createProject.isPending} className="w-full bg-blue-600 text-white rounded py-2 disabled:opacity-50">
                                {createProject.isPending ? "Creating..." : "Create Project"}
                            </button>
                        </form>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}