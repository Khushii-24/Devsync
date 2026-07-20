import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "../../api/axios"; // ASSUMPTION: matches your existing Axios instance path
import { X, Loader2, Sparkles, Trash2 } from "lucide-react";

export default function SubtaskSuggestions({ task, projectId, columnId, onClose }) {
    const [suggestions, setSuggestions] = useState(null); // null = not fetched yet
    const [isDecomposing, setIsDecomposing] = useState(false);
    const [decomposeError, setDecomposeError] = useState(null);
    const queryClient = useQueryClient();

    const runDecompose = async () => {
        setIsDecomposing(true);
        setDecomposeError(null);
        try {
            const { data } = await axios.post("/ai/decompose", { task_id: task.id });
            // Give each suggestion a stable local id for React keys + edit tracking
            setSuggestions(data.subtasks.map((s, i) => ({ ...s, _localId: `s-${i}` })));
        } catch (err) {
            setDecomposeError(
                err.response?.status === 503
                    ? "AI service is unavailable — is Ollama running?"
                    : "Couldn't generate subtasks. Try again."
            );
        } finally {
            setIsDecomposing(false);
        }
    };

    const updateSuggestion = (localId, field, value) => {
        setSuggestions((prev) =>
            prev.map((s) => (s._localId === localId ? { ...s, [field]: value } : s))
        );
    };

    const removeSuggestion = (localId) => {
        setSuggestions((prev) => prev.filter((s) => s._localId !== localId));
    };

    const bulkCreate = useMutation({
        mutationFn: async (subtasksToCreate) => {
            // Sequential position isn't server-assigned here since each POST already
            // does coalesce(max,-1)+1 server-side — safe to fire concurrently.
            return Promise.all(
                subtasksToCreate.map((s) =>
                    axios.post("/tasks", {
                        column_id: columnId,
                        title: s.title,
                        description: s.description,
                    })
                )
            );
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["tasks", projectId] }); // Matches the tasks query key
            onClose();
        },
    });

    return (
        <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="border border-slate-200 rounded-lg p-4 bg-slate-50 mt-3"
        >
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                    <Sparkles size={16} className="text-indigo-500" />
                    Break down this task
                </div>
                <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
                    <X size={16} />
                </button>
            </div>

            {suggestions === null && (
                <button
                    onClick={runDecompose}
                    disabled={isDecomposing}
                    className="w-full py-2 rounded-md bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-60 flex items-center justify-center gap-2"
                >
                    {isDecomposing ? (
                        <>
                            <Loader2 size={14} className="animate-spin" /> Generating suggestions…
                        </>
                    ) : (
                        "Generate subtasks"
                    )}
                </button>
            )}

            {decomposeError && (
                <div className="text-sm text-red-600 mt-2">{decomposeError}</div>
            )}

            {suggestions !== null && (
                <>
                    <div className="space-y-2 mb-3">
                        <AnimatePresence initial={false}>
                            {suggestions.map((s) => (
                                <motion.div
                                    key={s._localId}
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: "auto" }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="bg-white border border-slate-200 rounded-md p-2.5"
                                >
                                    <div className="flex items-start gap-2">
                                        <div className="flex-1 space-y-1">
                                            <input
                                                value={s.title}
                                                onChange={(e) => updateSuggestion(s._localId, "title", e.target.value)}
                                                className="w-full text-sm font-medium border-none focus:ring-1 focus:ring-indigo-400 rounded px-1 py-0.5"
                                            />
                                            <textarea
                                                value={s.description}
                                                onChange={(e) => updateSuggestion(s._localId, "description", e.target.value)}
                                                rows={2}
                                                className="w-full text-xs text-slate-500 border-none focus:ring-1 focus:ring-indigo-400 rounded px-1 py-0.5 resize-none"
                                            />
                                        </div>
                                        <button
                                            onClick={() => removeSuggestion(s._localId)}
                                            className="text-slate-300 hover:text-red-500 mt-1"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                        {suggestions.length === 0 && (
                            <div className="text-sm text-slate-400 text-center py-2">
                                All suggestions removed.
                            </div>
                        )}
                    </div>

                    <div className="flex gap-2">
                        <button
                            onClick={runDecompose}
                            disabled={isDecomposing}
                            className="flex-1 py-2 rounded-md border border-slate-300 text-sm text-slate-600 hover:bg-slate-100"
                        >
                            Regenerate
                        </button>
                        <button
                            onClick={() => bulkCreate.mutate(suggestions)}
                            disabled={suggestions.length === 0 || bulkCreate.isPending}
                            className="flex-1 py-2 rounded-md bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {bulkCreate.isPending ? (
                                <>
                                    <Loader2 size={14} className="animate-spin" /> Creating…
                                </>
                            ) : (
                                `Create ${suggestions.length} task${suggestions.length === 1 ? "" : "s"}`
                            )}
                        </button>
                    </div>
                    {bulkCreate.isError && (
                        <div className="text-sm text-red-600 mt-2">
                            Some tasks failed to create — check the board and retry if needed.
                        </div>
                    )}
                </>
            )}
        </motion.div>
    );
}