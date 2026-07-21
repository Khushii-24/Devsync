import { useState } from 'react';
import { DndContext, PointerSensor, KeyboardSensor, useSensor, useSensors, closestCorners } from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import { Plus } from 'lucide-react';
import KanbanColumn from './KanbanColumn';
import { useReorderTasks } from '../../hooks/useTasks';
import { useCreateColumn } from '../../hooks/useColumns';

import TaskCard from './TaskCard';
import Avatar from '../common/Avatar';

function KanbanBoard({
  projectId,
  columns,
  tasks,
  onOpenDetail,
  dragDisabled,
  members,
  viewMode = 'columns'
}) {
  console.log("KanbanBoard projectId:", projectId);

  const [isAdding, setIsAdding] = useState(false);
  const [newColumnName, setNewColumnName] = useState('');
  const createColumnMutation = useCreateColumn(projectId);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: dragDisabled
        ? { distance: 999999 } // effectively disables drag activation without removing the hooks/handlers
        : { distance: 8 },
    }),
    useSensor(KeyboardSensor)
  );

  const reorderMutation = useReorderTasks(projectId);

  const tasksByColumn = (columnId) =>
    tasks.filter((t) => t.column_id === columnId).sort((a, b) => a.position - b.position);

  const handleAddColumnSubmit = (e) => {
    e.preventDefault();
    if (!newColumnName.trim()) return;

    createColumnMutation.mutate(
      { name: newColumnName.trim() },
      {
        onSuccess: () => {
          setNewColumnName('');
          setIsAdding(false);
        },
      }
    );
  };

  function handleDragEnd(event) {
    const { active, over } = event;
    if (!over) return; // dropped outside any valid target — do nothing, card stays put

    const activeTask = tasks.find((t) => t.id === active.id);
    if (!activeTask) return;

    // `over.id` is either another TASK's id (dropped ON a card — sortable case)
    // or a COLUMN's id (dropped into empty space in a column, via useDroppable).
    // We normalize both to "which column, which index" before doing anything else.
    const overTask = tasks.find((t) => t.id === over.id);
    const targetColumnId = overTask ? overTask.column_id : over.id;

    const sourceColumnId = activeTask.column_id;
    const sourceTasks = tasksByColumn(sourceColumnId);
    const targetTasks = sourceColumnId === targetColumnId ? sourceTasks : tasksByColumn(targetColumnId);

    const oldIndex = sourceTasks.findIndex((t) => t.id === active.id);
    // If dropped on a task, insert at that task's index. If dropped on empty
    // column space, append to the end (targetTasks.length).
    const newIndex = overTask
      ? targetTasks.findIndex((t) => t.id === over.id)
      : targetTasks.length;

    let updatedSourceTasks;
    let updatedTargetTasks;

    if (sourceColumnId === targetColumnId) {
      // Same-column reorder — arrayMove handles the index shuffle for us
      // (this is exactly why @dnd-kit/sortable exists instead of hand-rolling this).
      updatedSourceTasks = arrayMove(sourceTasks, oldIndex, newIndex);
      updatedTargetTasks = updatedSourceTasks;
    } else {
      // Cross-column move — remove from source, insert into target at newIndex
      updatedSourceTasks = sourceTasks.filter((t) => t.id !== active.id);
      updatedTargetTasks = [
        ...targetTasks.slice(0, newIndex),
        { ...activeTask, column_id: targetColumnId },
        ...targetTasks.slice(newIndex),
      ];
    }

    // Re-derive position (0, 1, 2...) from array order — this is the payload
    // shape /tasks/reorder expects, and also what we write into the cache.
    const reorderItems = [
      ...updatedSourceTasks.map((t, i) => ({ task_id: t.id, column_id: sourceColumnId, position: i })),
      ...(sourceColumnId !== targetColumnId
        ? updatedTargetTasks.map((t, i) => ({ task_id: t.id, column_id: targetColumnId, position: i }))
        : []),
    ];

    // Build the FULL updated tasks array (all columns, not just the affected
    // ones) — this is what gets written straight into the React Query cache
    // in onMutate, so the board re-renders immediately with zero flicker.
    const untouchedTasks = tasks.filter(
      (t) => t.column_id !== sourceColumnId && t.column_id !== targetColumnId
    );
    const newArrangement = [
      ...untouchedTasks,
      ...updatedSourceTasks,
      ...(sourceColumnId !== targetColumnId ? updatedTargetTasks : []),
    ];
    console.log("projectId:", projectId);

    console.log({
      newArrangement,
      project_id: projectId,
      tasks: reorderItems,
    });
    reorderMutation.mutate({
      newArrangement,
      project_id: projectId,
      tasks: reorderItems,
    });
  }

  if (viewMode === 'swimlanes') {
    const safeColumns = Array.isArray(columns) ? columns : [];
    const safeTasks = Array.isArray(tasks) ? tasks : [];
    const safeMembers = Array.isArray(members) ? members : [];

    // Group members + unassigned
    const swimlaneRows = [
      ...safeMembers.map((m) => ({
        id: m?.user_id ? String(m.user_id) : null,
        label: m?.username || m?.email || 'Unknown User',
        member: m,
      })).filter((r) => r.id !== null),
      { id: null, label: 'Unassigned', member: null },
    ];

    return (
      <div className="h-full overflow-auto p-2 space-y-4 font-sans">
        {swimlaneRows.map((row, idx) => {
          const userTasks = safeTasks.filter((t) => {
            if (!t) return false;
            if (!t.assignee_id && !row.id) return true;
            if (t.assignee_id && row.id) return String(t.assignee_id) === String(row.id);
            return false;
          });

          const rowKey = row.id || `unassigned-${idx}`;

          return (
            <div key={rowKey} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-3.5 space-y-3 shadow-xs">
              <div className="flex items-center gap-2.5 pb-2 border-b border-gray-100 dark:border-gray-800">
                <Avatar name={row.label} userId={row.id || 'unassigned'} size="sm" />
                <h3 className="text-xs font-bold text-gray-900 dark:text-white">{row.label}</h3>
                <span className="text-[10px] text-gray-400 font-bold px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800">
                  {userTasks.length} tasks
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                {safeColumns.map((col) => {
                  const colTasks = userTasks.filter((t) => t && String(t.column_id) === String(col.id));
                  return (
                    <div key={col.id} className="bg-gray-50/70 dark:bg-gray-950/60 p-2.5 rounded-xl border border-gray-150 dark:border-gray-800/80 min-h-[110px] flex flex-col">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2 flex items-center justify-between">
                        <span>{col.name}</span>
                        <span className="text-[9px] text-gray-400 font-normal">({colTasks.length})</span>
                      </div>
                      <div className="space-y-2 flex-1">
                        {colTasks.map((task) => (
                          <TaskCard key={task.id} task={task} onOpenDetail={onOpenDetail} members={safeMembers} />
                        ))}
                        {colTasks.length === 0 && (
                          <div className="h-16 border border-dashed border-gray-200 dark:border-gray-800/60 rounded-lg flex items-center justify-center text-[10px] text-gray-400 italic">
                            No tasks
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
      <div className="h-full flex gap-4 overflow-x-auto p-2 items-start">
        {columns.map((column) => (
          <KanbanColumn key={column.id} column={column} tasks={tasksByColumn(column.id)} projectId={projectId} onOpenDetail={onOpenDetail} members={members} />
        ))}

        {/* Add Column Flow */}
        {isAdding ? (
          <form onSubmit={handleAddColumnSubmit} className="w-72 shrink-0 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-850 rounded-xl p-3 flex flex-col gap-2">
            <input
              type="text"
              placeholder="Column name..."
              value={newColumnName}
              onChange={(e) => setNewColumnName(e.target.value)}
              className="w-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-850 text-gray-900 dark:text-gray-100 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              autoFocus
            />
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={createColumnMutation.isPending}
                className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-3 py-1.5 rounded disabled:opacity-50"
              >
                Add
              </button>
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                className="border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 text-xs px-3 py-1.5 rounded"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <button
            onClick={() => setIsAdding(true)}
            className="w-72 shrink-0 h-12 border-2 border-dashed border-gray-300 dark:border-gray-700 hover:border-indigo-500 dark:hover:border-indigo-400 rounded-xl flex items-center justify-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-indigo-600 hover:bg-white/50 dark:hover:bg-gray-800/35 cursor-pointer transition-all duration-150"
          >
            <Plus size={16} />
            <span>Add Column</span>
          </button>
        )}
      </div>
    </DndContext>
  );
}

export default KanbanBoard;