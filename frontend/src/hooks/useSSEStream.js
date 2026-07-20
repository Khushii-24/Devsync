// frontend/src/hooks/useSSEStream.js
import { useState, useCallback, useRef } from "react";
import api from "../api/axios"; // reused for baseURL/auth header config, not for the actual stream call
import { useAuthStore } from "../stores/auth.store";

export function useSSEStream() {
    const [messages, setMessages] = useState([]); // [{ role, content, sources, isError }]
    const [isStreaming, setIsStreaming] = useState(false);
    const abortRef = useRef(null);
    const timeoutRef = useRef(null);

    const clearStreamTimeout = useCallback(() => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
        }
    }, []);

    const resetTimeout = useCallback((controller) => {
        clearStreamTimeout();
        timeoutRef.current = setTimeout(() => {
            controller.abort();
            setMessages((prev) => {
                const next = [...prev];
                next[next.length - 1] = {
                    ...next[next.length - 1],
                    content: "Response timed out.",
                    isError: true,
                };
                return next;
            });
            setIsStreaming(false);
        }, 8000);
    }, [clearStreamTimeout]);

    const sendMessage = useCallback(async (query, projectId) => {
        setMessages((prev) => [...prev, { role: "user", content: query }]);
        setMessages((prev) => [...prev, { role: "assistant", content: "", sources: [] }]);
        setIsStreaming(true);

        const controller = new AbortController();
        abortRef.current = controller;

        resetTimeout(controller);

        try {
            const token = useAuthStore.getState().accessToken;
            const response = await fetch(`${api.defaults.baseURL}/ai/chat`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ project_id: projectId, query }),
                signal: controller.signal,
            });

            // If we got a response, reset/feed the watchdog timeout
            resetTimeout(controller);

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = "";

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                // Reset timeout on receiving data
                resetTimeout(controller);

                buffer += decoder.decode(value, { stream: true });
                const events = buffer.split("\n\n");
                buffer = events.pop(); // keep incomplete trailing chunk for next read

                for (const raw of events) {
                    if (!raw.trim()) continue;
                    const eventMatch = raw.match(/^event: (\w+)/m);
                    const dataMatch = raw.match(/^data: (.+)$/m);
                    if (!eventMatch || !dataMatch) continue;

                    const eventType = eventMatch[1];
                    const data = JSON.parse(dataMatch[1]);

                    if (eventType === "sources") {
                        setMessages((prev) => {
                            const next = [...prev];
                            next[next.length - 1] = { ...next[next.length - 1], sources: data };
                            return next;
                        });
                    } else if (eventType === "token") {
                        setMessages((prev) => {
                            const next = [...prev];
                            const last = next[next.length - 1];
                            next[next.length - 1] = { ...last, content: last.content + data.text };
                            return next;
                        });
                    } else if (eventType === "error") {
                        setMessages((prev) => {
                            const next = [...prev];
                            next[next.length - 1] = {
                                ...next[next.length - 1],
                                content: data.message || "An error occurred.",
                                isError: true,
                            };
                            return next;
                        });
                        setIsStreaming(false);
                        controller.abort();
                        clearStreamTimeout();
                        return;
                    } else if (eventType === "done") {
                        setIsStreaming(false);
                        clearStreamTimeout();
                    }
                }
            }
            clearStreamTimeout();
        } catch (err) {
            clearStreamTimeout();
            if (err.name !== "AbortError") {
                setMessages((prev) => {
                    const next = [...prev];
                    next[next.length - 1] = {
                        ...next[next.length - 1],
                        content: "Something went wrong. Please try again.",
                        isError: true,
                    };
                    return next;
                });
            }
            setIsStreaming(false);
        }
    }, [resetTimeout, clearStreamTimeout]);

    const stopStream = useCallback(() => {
        clearStreamTimeout();
        abortRef.current?.abort();
        setIsStreaming(false);
    }, [clearStreamTimeout]);

    return { messages, setMessages, isStreaming, sendMessage, stopStream };
}