import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useState } from "react";
import Avatar from '../common/Avatar';

function TaskCard({ task, onOpenDetail, members }) {
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

  const assignee = members?.find((m) => m.user_id === task.assignee_id);
  const assigneeName = assignee ? assignee.username || assignee.email : 'Assigned';

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
      className="bg-white dark:bg-gray-800 rounded-lg shadow-2xs hover:shadow-md border border-gray-200 dark:border-gray-700/80 hover:border-indigo-400 dark:hover:border-indigo-500 p-3 mb-2 cursor-grab active:cursor-grabbing text-gray-900 dark:text-gray-100 transition-all group"
    >
      <p className="text-sm font-medium text-gray-900 dark:text-gray-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-300 transition-colors">{task.title}</p>

      <div className="mt-2.5 flex items-center justify-between">
        {task.priority ? (
          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-750 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700">
            {task.priority}
          </span>
        ) : <span />}

        {task.assignee_id && (
          <Avatar
            name={assigneeName}
            userId={task.assignee_id}
            size="sm"
          />
        )}
      </div>
    </div>
  );
}

export default TaskCard;