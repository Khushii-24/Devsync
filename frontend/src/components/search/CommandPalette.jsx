import { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Search, FileText, CheckSquare, Loader2, CornerDownLeft, PlusCircle, LayoutGrid, User, FolderPlus, Zap } from "lucide-react";
import api from "../../api/axios";
import { useTaskPanelStore } from "../../stores/taskPanelStore";

export default function CommandPalette() {
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState("");
    const [selectedIndex, setSelectedIndex] = useState(0);
    const containerRef = useRef(null);
    const inputRef = useRef(null);
    const navigate = useNavigate();
    const { workspaceId, projectId } = useParams();

    const quickActions = useMemo(() => [
        { id: "act-dash", kind: "action", title: "Go to Workspace Dashboard", action: () => navigate("/dashboard") },
        { id: "act-profile", kind: "action", title: "Go to User Profile & Settings", action: () => navigate("/profile") },
        { id: "act-settings", kind: "action", title: "Workspace Settings & Members", action: () => workspaceId && navigate(`/workspaces/${workspaceId}/settings`) },
    ].filter(a => a.action), [navigate, workspaceId]);

    // Key listener: Ctrl/Cmd + K
    useEffect(() => {
        const handleKeyDown = (e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "k") {
                e.preventDefault();
                setIsOpen((prev) => !prev);
            }
            if (e.key === "Escape") {
                setIsOpen(false);
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, []);

    // Focus input on open
    useEffect(() => {
        if (isOpen) {
            setQuery("");
            setSelectedIndex(0);
            setTimeout(() => inputRef.current?.focus(), 50);
        }
    }, [isOpen]);

    // Fetch search results
    const { data, isLoading } = useQuery({
        queryKey: ["search", query, projectId],
        queryFn: () => {
            const params = { q: query };
            if (projectId) {
                params.project_id = projectId;
            }
            return api.get("/search", { params }).then((res) => res.data);
        },
        enabled: isOpen && query.trim().length > 0,
    });

    const tasks = data?.tasks ?? [];
    const documents = data?.documents ?? [];

    const searchResults = [
        ...tasks.map((t) => ({ ...t, kind: "task" })),
        ...documents.map((d) => ({ ...d, kind: "document" })),
    ];

    const flatResults = query.trim().length === 0
        ? quickActions
        : [...quickActions, ...searchResults];

    // Keyboard navigation inside list
    useEffect(() => {
        const handleKeys = (e) => {
            if (!isOpen || flatResults.length === 0) return;

            if (e.key === "ArrowDown") {
                e.preventDefault();
                setSelectedIndex((prev) => (prev + 1) % flatResults.length);
            } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setSelectedIndex((prev) => (prev - 1 + flatResults.length) % flatResults.length);
            } else if (e.key === "Enter") {
                e.preventDefault();
                goToResult(flatResults[selectedIndex]);
            }
        };

        window.addEventListener("keydown", handleKeys);
        return () => window.removeEventListener("keydown", handleKeys);
    }, [isOpen, flatResults, selectedIndex]);

    const goToResult = (item) => {
        if (!item) return;
        setIsOpen(false);
        if (item.kind === "action") {
            item.action();
        } else if (item.kind === "task") {
            navigate(`/projects/${item.project_id}/board`);
            setTimeout(() => {
                useTaskPanelStore.getState().openTask(item.id, item.project_id);
            }, 200);
        } else if (item.kind === "document") {
            navigate(`/projects/${item.project_id}/documents/${item.id}`);
        }
    };

    // Close on click outside
    useEffect(() => {
        function handleClickOutside(event) {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        }
        if (isOpen) {
            document.addEventListener("mousedown", handleClickOutside);
        }
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-start justify-center pt-20 px-4">
            <div
                ref={containerRef}
                className="w-full max-w-2xl bg-white dark:bg-gray-850 rounded-xl border border-gray-200 dark:border-gray-700 shadow-2xl overflow-hidden flex flex-col max-h-[480px] font-sans"
            >
                {/* Search Input */}
                <div className="flex items-center gap-3 px-4 border-b border-gray-100 dark:border-gray-750">
                    <Search className="w-5 h-5 text-gray-400 shrink-0" />
                    <input
                        ref={inputRef}
                        type="text"
                        placeholder="Search tasks, documents, or run quick actions... (ESC to close)"
                        value={query}
                        onChange={(e) => {
                            setQuery(e.target.value);
                            setSelectedIndex(0);
                        }}
                        className="w-full py-4 text-sm bg-transparent border-none focus:outline-none text-gray-900 dark:text-white placeholder-gray-400"
                    />
                    {isLoading && <Loader2 className="w-4 h-4 animate-spin text-indigo-500 shrink-0" />}
                </div>

                {/* Results list */}
                <div className="overflow-y-auto p-2 divide-y divide-gray-50 dark:divide-gray-800">
                    
                    {/* Quick Actions section */}
                    {query.trim().length === 0 && (
                        <div className="px-3 py-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                            Quick Actions
                        </div>
                    )}

                    {flatResults.map((item, index) => {
                        const isSelected = index === selectedIndex;
                        return (
                            <div
                                key={item.id}
                                onClick={() => goToResult(item)}
                                className={`flex items-center justify-between px-3 py-2.5 rounded-lg cursor-pointer transition-colors text-left ${
                                    isSelected
                                        ? "bg-indigo-50 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-200 font-medium"
                                        : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                                }`}
                            >
                                <div className="flex items-center gap-3 min-w-0">
                                    {item.kind === "action" ? (
                                        <Zap className="w-4 h-4 text-amber-500 shrink-0" />
                                    ) : item.kind === "task" ? (
                                        <CheckSquare className="w-4 h-4 text-emerald-500 shrink-0" />
                                    ) : (
                                        <FileText className="w-4 h-4 text-blue-500 shrink-0" />
                                    )}
                                    <div className="truncate">
                                        <p className="text-sm font-medium truncate">{item.title}</p>
                                        <p className="text-[10px] text-gray-400 capitalize">
                                            {item.kind}
                                        </p>
                                    </div>
                                </div>
                                {isSelected && (
                                    <div className="flex items-center gap-1 text-[10px] text-indigo-600 dark:text-indigo-400 font-medium">
                                        <span>Select</span>
                                        <CornerDownLeft className="w-3 h-3" />
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
