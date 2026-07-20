// frontend/src/components/ai/AIChatPanel.jsx
import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Send, Sparkles } from "lucide-react";
import { useSSEStream } from "../../hooks/useSSEStream";
import ChatMessage from "./ChatMessage";
import WeeklyDigest from "./WeeklyDigest";

export default function AIChatPanel({ isOpen, onClose, projectId }) {
    const [input, setInput] = useState("");
    const { messages, setMessages, isStreaming, sendMessage, stopStream } = useSSEStream();
    const scrollRef = useRef(null);

    useEffect(() => {
        scrollRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    useEffect(() => {
        if (!isOpen) stopStream(); // stop any in-flight stream if panel closes mid-response
    }, [isOpen, stopStream]);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!input.trim() || isStreaming) return;
        sendMessage(input.trim(), projectId);
        setInput("");
    };

    const handleRetry = () => {
        const lastUser = [...messages].reverse().find((m) => m.role === "user");
        if (!lastUser) return;

        // Clean up last failed messages from state before retrying
        setMessages((prev) => {
            const next = [...prev];
            if (next.length > 0 && next[next.length - 1].role === "assistant") {
                next.pop();
            }
            if (next.length > 0 && next[next.length - 1].role === "user") {
                next.pop();
            }
            return next;
        });

        sendMessage(lastUser.content, projectId);
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    className="fixed right-0 top-0 h-full w-96 bg-white dark:bg-gray-900 border-l border-gray-100 dark:border-gray-850 shadow-xl z-50 flex flex-col text-gray-900 dark:text-gray-100"
                    initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
                    transition={{ type: "tween", duration: 0.25 }}
                >
                    <div className="flex justify-between items-center p-4 border-b border-gray-100 dark:border-gray-800">
                        <h2 className="font-semibold flex items-center gap-2">
                             <Sparkles size={16} className="text-blue-600 dark:text-blue-400" /> AI Assistant
                        </h2>
                        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-250"><X size={18} /></button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-5">
                        <WeeklyDigest projectId={projectId} />

                        <div className="border-t border-gray-100 dark:border-gray-850 pt-4">
                            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                                <Sparkles size={13} className="text-blue-500" /> Chat History
                            </h3>
                            {messages.length === 0 && (
                                <p className="text-sm text-gray-400">Ask me anything about this project's tasks and documents.</p>
                            )}
                            <div className="space-y-4">
                                {messages.map((msg, i) => (
                                    <ChatMessage
                                        key={i}
                                        message={msg}
                                        onRetry={i === messages.length - 1 ? handleRetry : undefined}
                                    />
                                ))}
                            </div>
                            <div ref={scrollRef} />
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="p-3 border-t border-gray-100 dark:border-gray-850 flex gap-2 bg-gray-50 dark:bg-gray-950">
                        <input
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="Ask about this project..."
                            className="flex-1 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-855 text-gray-900 dark:text-gray-100 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            disabled={isStreaming}
                        />
                        <button
                            type="submit"
                            disabled={isStreaming || !input.trim()}
                            className="bg-blue-600 text-white rounded px-3 disabled:opacity-50"
                        >
                            <Send size={16} />
                        </button>
                    </form>
                </motion.div>
            )}
        </AnimatePresence>
    );
}