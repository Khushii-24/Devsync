import { DndContext, PointerSensor, KeyboardSensor, useSensor, useSensors, closestCorners } from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import KanbanColumn from './KanbanColumn';
import { useReorderTasks } from '../../hooks/useTasks';

function KanbanBoard({
  projectId,
  columns,
  tasks,
  onOpenDetail,
  dragDisabled 
}) {
  console.log("KanbanBoard projectId:", projectId);

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

  return (
    <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
      <div className="flex gap-4 overflow-x-auto p-4">
        {columns.map((column) => (
          <KanbanColumn key={column.id} column={column} tasks={tasksByColumn(column.id)} onOpenDetail={onOpenDetail} />
        ))}
      </div>
    </DndContext>
  );
}

export default KanbanBoard;