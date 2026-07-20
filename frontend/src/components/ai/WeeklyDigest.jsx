import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useMutation } from "@tanstack/react-query";
import axios from "../../api/axios";
import { CalendarDays, Loader2, RefreshCw, CheckCircle2, AlertTriangle, Trophy } from "lucide-react";

export default function WeeklyDigest({ projectId }) {
    const [digest, setDigest] = useState(null);

    const generateDigest = useMutation({
        mutationFn: async () => {
            const { data } = await axios.post("/ai/digest", { project_id: projectId });
            return data;
        },
        onSuccess: (data) => setDigest(data),
    });

    const errorMessage =
        generateDigest.error?.response?.status === 503
            ? "AI service unavailable — is Ollama running?"
            : generateDigest.isError
                ? "Couldn't generate the digest. Try again."
                : null;

    return (
        <div className="border border-slate-200 dark:border-gray-700 rounded-lg p-5 bg-white dark:bg-gray-800/40 text-gray-900 dark:text-gray-100">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2 text-slate-700 dark:text-gray-200 font-medium">
                    <CalendarDays size={18} className="text-indigo-500" />
                    Weekly Digest
                </div>
                <button
                    onClick={() => generateDigest.mutate()}
                    disabled={generateDigest.isPending}
                    className="text-sm px-3 py-1.5 rounded-md bg-indigo-600 text-white font-medium hover:bg-indigo-700 disabled:opacity-60 flex items-center gap-1.5"
                >
                    {generateDigest.isPending ? (
                        <>
                            <Loader2 size={14} className="animate-spin" /> Generating…
                        </>
                    ) : digest ? (
                        <>
                            <RefreshCw size={14} /> Refresh
                        </>
                    ) : (
                        "Generate digest"
                    )}
                </button>
            </div>

            {errorMessage && (
                <div className="text-sm text-red-600 mb-3">{errorMessage}</div>
            )}

            {!digest && !generateDigest.isPending && !errorMessage && (
                <p className="text-sm text-slate-400">
                    Generate a summary of the last 7 days of activity on this project.
                </p>
            )}

            <AnimatePresence mode="wait">
                {digest && (
                    <motion.div
                        key={digest.period_summary /* re-animate on refresh */}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        className="space-y-5"
                    >
                        <p className="text-sm text-slate-600 dark:text-gray-300 leading-relaxed">{digest.period_summary}</p>

                        <DigestSection
                            icon={<CheckCircle2 size={15} className="text-emerald-500" />}
                            title="Completed"
                            items={digest.completed_tasks}
                            emptyText="No tasks completed this week."
                        />

                        <DigestSection
                            icon={<AlertTriangle size={15} className="text-amber-500" />}
                            title="Blockers"
                            items={digest.blockers}
                            emptyText="No blockers surfaced this week."
                        />

                        <div>
                            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                                <Trophy size={14} className="text-indigo-400" />
                                Top Contributors
                            </div>
                            {digest.top_contributors.length === 0 ? (
                                <p className="text-sm text-slate-400">No contributor activity this week.</p>
                            ) : (
                                <ul className="space-y-1.5">
                                    {digest.top_contributors.map((c) => (
                                        <li key={c.name} className="flex items-center justify-between text-sm">
                                            <span className="text-slate-700 dark:text-gray-200">{c.name}</span>
                                            <span className="text-slate-400 text-xs">{c.activity_count} actions</span>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

function DigestSection({ icon, title, items, emptyText }) {
    return (
        <div>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                {icon}
                {title}
            </div>
            {items.length === 0 ? (
                <p className="text-sm text-slate-400">{emptyText}</p>
            ) : (
                <ul className="space-y-1 list-disc list-inside">
                    {items.map((item, i) => (
                        <li key={i} className="text-sm text-slate-600 dark:text-gray-300">
                            {item}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}