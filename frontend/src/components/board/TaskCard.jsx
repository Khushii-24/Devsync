import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

function TaskCard({ task, onOpenDetail  }) {
  // useSortable wraps useDraggable + useDroppable together, and additionally
  // tracks this item's INDEX within its SortableContext (see KanbanColumn) —
  // that index awareness is what Day 4's plain useDraggable didn't have.
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    data: { columnId: task.column_id }, // stashed on the drag event so onDragEnd
    // can tell which column a task STARTED in without a lookup
  });

  const style = {
    transform: CSS.Transform.toString(transform), // Transform (not Translate) — sortable
    // items also need to visually shift/shrink to make room, not just follow the pointer
    transition, // smooth animation when OTHER cards slide to make space — this comes free from useSortable
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
      className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 mb-2 cursor-grab active:cursor-grabbing"
    >
      <p className="text-sm font-medium text-gray-900">{task.title}</p>

      {task.priority && (
        <span className="inline-block mt-2 text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
          {task.priority}
        </span>
      )}

      {task.assignee_id && (
        <div className="mt-2 w-6 h-6 rounded-full bg-blue-200 text-xs flex items-center justify-center">
          {task.assignee_id.slice(0, 2).toUpperCase()}
        </div>
      )}
    </div>
  );
}

export default TaskCard;