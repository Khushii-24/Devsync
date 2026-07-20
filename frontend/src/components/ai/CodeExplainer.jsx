import { useState } from "react";
import { BubbleMenu } from "@tiptap/react/menus";
import { useMutation } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { X, Sparkles, Loader2 } from "lucide-react";
import axios from "../../api/axios";

export default function CodeExplainer({ editor, task }) {
    const [explanation, setExplanation] = useState("");

    const explainMutation = useMutation({
        mutationFn: async (code) => {
            const { data } = await axios.post("/ai/explain-code", {
                task_id: task.id,
                code: code,
            });
            return data;
        },
        onSuccess: (data) => {
            setExplanation(data.explanation);
        },
    });

    const handleExplain = () => {
        if (!editor) return;
        const { selection } = editor.state;
        let codeText = "";
        editor.state.doc.nodesBetween(selection.from, selection.to, (node) => {
            if (node.type.name === "codeBlock") {
                codeText = node.textContent;
            }
        });

        // Fallback if nodesBetween didn't catch it
        if (!codeText) {
            codeText = editor.state.doc.textBetween(selection.from, selection.to, "\n");
        }

        if (!codeText.trim()) return;
        explainMutation.mutate(codeText);
    };

    const errorMessage =
        explainMutation.error?.response?.status === 503
            ? "AI service unavailable — is Ollama running?"
            : explainMutation.isError
                ? "An error occurred while explaining the code."
                : null;

    return (
        <>
            {editor && (
                <BubbleMenu
                    editor={editor}
                    tippyOptions={{ duration: 100 }}
                    shouldShow={({ editor }) => editor.isActive("codeBlock")}
                >
                     <button
                        onClick={handleExplain}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-slate-900 dark:bg-gray-850 text-white rounded-md shadow-md hover:bg-slate-800 dark:hover:bg-gray-750 transition-colors border border-slate-700 dark:border-gray-600 cursor-pointer"
                    >
                        <Sparkles size={12} className="text-amber-400" />
                        Explain this
                    </button>
                </BubbleMenu>
            )}

            <AnimatePresence>
                {(explanation || explainMutation.isPending || errorMessage) && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden mt-4"
                    >
                        <div className="bg-slate-50 dark:bg-gray-800/50 border border-slate-200 dark:border-gray-700 rounded-md p-4 relative">
                            <button
                                onClick={() => {
                                    setExplanation("");
                                    explainMutation.reset();
                                }}
                                className="absolute top-2 right-2 text-slate-400 hover:text-slate-600 dark:hover:text-gray-300 transition-colors cursor-pointer"
                            >
                                <X size={16} />
                            </button>

                            <div className="flex items-center gap-2 mb-2">
                                <Sparkles size={16} className="text-indigo-500 animate-pulse" />
                                <span className="text-xs font-semibold text-slate-700 dark:text-gray-200 uppercase tracking-wide">
                                    AI Code Explanation
                                </span>
                            </div>

                            {explainMutation.isPending && (
                                <div className="flex items-center gap-2 text-sm text-slate-500">
                                    <Loader2 size={14} className="animate-spin" />
                                    Analyzing code...
                                </div>
                            )}

                            {errorMessage && (
                                <p className="text-sm text-red-600 font-medium">
                                    {errorMessage}
                                </p>
                            )}

                            {!explainMutation.isPending && explanation && (
                                <p className="text-sm text-slate-600 dark:text-gray-300 leading-relaxed pr-6">
                                    {explanation}
                                </p>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
