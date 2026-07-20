import SourceChip from "./SourceChip";
import { RotateCcw } from "lucide-react";

export default function ChatMessage({ message, onRetry }) {
    const isUser = message.role === "user";
    const isError = message.isError;

    // Deduplicate sources by source_id
    const uniqueSources = [];
    const seenIds = new Set();
    if (message.sources) {
        for (const src of message.sources) {
            if (!seenIds.has(src.source_id)) {
                seenIds.add(src.source_id);
                uniqueSources.push(src);
            }
        }
    }

    const bubbleClass = isUser
        ? "bg-blue-600 text-white"
        : isError
        ? "bg-red-50 text-red-700 border border-red-200"
        : "bg-gray-100 text-gray-900";

    return (
        <div className={`flex flex-col ${isUser ? "items-end" : "items-start"} gap-1`}>
            <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
                <div
                    className={`max-w-[85%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap ${bubbleClass}`}
                >
                    {message.content || (!isUser && !isError && <span className="text-gray-400">Thinking...</span>)}
                    {isError && !message.content && "An error occurred."}
                </div>
            </div>
            {!isUser && uniqueSources.length > 0 && (
                <div className="flex flex-wrap gap-1 px-1">
                    {uniqueSources.map((src, idx) => (
                        <SourceChip key={idx} source={src} />
                    ))}
                </div>
            )}
            {!isUser && isError && onRetry && (
                <button
                    onClick={onRetry}
                    className="mt-1 text-xs text-blue-600 hover:underline flex items-center gap-1 px-1"
                >
                    <RotateCcw size={10} /> Retry
                </button>
            )}
        </div>
    );
}