import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import TaskCard from './TaskCard';

function KanbanColumn({ column, tasks, onOpenDetail }) {
  // Still needed even with SortableContext: an EMPTY column has no sortable
  // items inside it to drop onto, so it needs its own droppable zone for the
  // "drag into an empty column" case. SortableContext alone doesn't cover this.
  const { setNodeRef, isOver } = useDroppable({ id: column.id });

  const taskIds = tasks.map((t) => t.id);

  return (
    <div className="flex-shrink-0 w-72 bg-gray-50 rounded-xl p-3">
      <div className="flex items-center justify-between mb-3 px-1">
        <h3 className="text-sm font-semibold text-gray-700">{column.name}</h3>
        <span className="text-xs text-gray-400">{tasks.length}</span>
      </div>

      <div
        ref={setNodeRef}
        className={`min-h-[200px] rounded-lg transition-colors ${
          isOver ? 'bg-blue-50 ring-2 ring-blue-200' : ''
        }`}
      >
        {/* verticalListSortingStrategy tells dnd-kit cards are stacked top-to-bottom —
            it uses this to calculate where the "gap" preview should appear while dragging */}
        <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
          {tasks.map((task) => (
            <TaskCard key={task.id} task={task} onOpenDetail={onOpenDetail} />
          ))}
        </SortableContext>
      </div>
    </div>
  );
}

export default KanbanColumn;