import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useState } from "react";
import { Sparkles } from "lucide-react";
import SubtaskSuggestions from "../ai/SubtaskSuggestions";

function TaskCard({ task, onOpenDetail }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    data: { columnId: task.column_id },
  });
  const [showBreakdown, setShowBreakdown] = useState(false);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => {
        console.log("Task clicked:", task);
        onOpenDetail(task);
      }}
      className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-3 mb-2 cursor-grab active:cursor-grabbing text-gray-900 dark:text-gray-100"
    >
      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{task.title}</p>

      {task.priority && (
        <span className="inline-block mt-2 text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
          {task.priority}
        </span>
      )}

      {task.assignee_id && (
        <div className="mt-2 w-6 h-6 rounded-full bg-blue-200 dark:bg-blue-900 text-xs flex items-center justify-center text-blue-800 dark:text-blue-200">
          {task.assignee_id.slice(0, 2).toUpperCase()}
        </div>
      )}
    </div>
  );
}

export default TaskCard;