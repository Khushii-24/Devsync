import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Bell, Check, Loader2 } from "lucide-react";
import api from "../../api/axios";
import { useAuthStore } from "../../stores/auth.store";
import { wsManager } from "../../lib/websocket";

export default function NotificationBell({ projectId }) {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);
    const queryClient = useQueryClient();
    const currentUserId = useAuthStore((s) => s.user?.id);

    // Fetch notifications list
    const { data: notifications = [], isLoading } = useQuery({
        queryKey: ["notifications", currentUserId],
        queryFn: () => api.get("/notifications").then((res) => res.data),
        enabled: !!currentUserId,
    });

    // Fetch unread count
    const { data: unreadData } = useQuery({
        queryKey: ["notifications", "unread-count", currentUserId],
        queryFn: () => api.get("/notifications/unread-count").then((res) => res.data),
        enabled: !!currentUserId,
    });

    const unreadCount = unreadData?.count ?? 0;

    // Mutation: mark all as read
    const markAllReadMutation = useMutation({
        mutationFn: () => api.post("/notifications/mark-all-read"),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["notifications"] });
            queryClient.invalidateQueries({ queryKey: ["notifications", "unread-count"] });
        },
    });

    // Mutation: mark single read
    const markReadMutation = useMutation({
        mutationFn: (id) => api.post(`/notifications/${id}/read`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["notifications"] });
            queryClient.invalidateQueries({ queryKey: ["notifications", "unread-count"] });
        },
    });

    // Listen to real-time notification push over existing WebSocket
    useEffect(() => {
        if (!projectId) return;

        const unsubscribe = wsManager.onMessage((event) => {
            if (event.type === "notification") {
                // If it is meant for the logged-in user
                if (event.payload?.recipient_id === currentUserId) {
                    queryClient.invalidateQueries({ queryKey: ["notifications", currentUserId] });
                    queryClient.invalidateQueries({ queryKey: ["notifications", "unread-count", currentUserId] });
                }
            }
        });

        return () => {
            unsubscribe();
        };
    }, [projectId, currentUserId, queryClient]);

    // Close dropdown on click outside
    useEffect(() => {
        function handleClickOutside(event) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const formatNotificationText = (notif) => {
        const payload = notif.payload;
        const actor = payload.actor_name || "Someone";
        if (notif.type === "mention") {
            return (
                <span>
                    <strong>{actor}</strong> mentioned you in document <strong>{payload.document_title}</strong>
                </span>
            );
        }
        if (notif.type === "assigned") {
            return (
                <span>
                    <strong>{actor}</strong> assigned you to task <strong>{payload.task_title}</strong>
                </span>
            );
        }
        if (notif.type === "task_done") {
            return (
                <span>
                    Task <strong>{payload.task_title}</strong> was moved to Done by <strong>{actor}</strong>
                </span>
            );
        }
        return "New update received";
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-all focus:outline-none"
            >
                <Bell size={20} />
                {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white ring-2 ring-white dark:ring-gray-900">
                        {unreadCount > 99 ? "99+" : unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-80 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-xl z-50 overflow-hidden transform origin-top-right transition-all">
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
                        <span className="text-sm font-semibold text-gray-900 dark:text-white">Notifications</span>
                        {unreadCount > 0 && (
                            <button
                                onClick={() => markAllReadMutation.mutate()}
                                className="flex items-center gap-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300"
                            >
                                <Check size={14} />
                                Mark all read
                            </button>
                        )}
                    </div>

                    {/* Notification list */}
                    <div className="max-h-72 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-700">
                        {isLoading ? (
                            <div className="flex items-center justify-center py-8">
                                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                            </div>
                        ) : notifications.length === 0 ? (
                            <div className="py-12 text-center text-sm text-gray-400 dark:text-gray-500">
                                All quiet here! No notifications.
                            </div>
                        ) : (
                            notifications.map((notif) => (
                                <div
                                    key={notif.id}
                                    onClick={() => {
                                        if (!notif.is_read) {
                                            markReadMutation.mutate(notif.id);
                                        }
                                    }}
                                    className={`px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer flex items-start gap-3 ${
                                        !notif.is_read ? "bg-indigo-50/30 dark:bg-indigo-950/10" : ""
                                    }`}
                                >
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs text-gray-700 dark:text-gray-200 leading-normal">
                                            {formatNotificationText(notif)}
                                        </p>
                                        <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">
                                            {new Date(notif.created_at).toLocaleTimeString([], {
                                                hour: "2-digit",
                                                minute: "2-digit",
                                            })}
                                        </p>
                                    </div>
                                    {!notif.is_read && (
                                        <span className="h-2 w-2 rounded-full bg-indigo-600 dark:bg-indigo-400 mt-1.5 shrink-0" />
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
