import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";

import TaskCard from "./TaskCard";
import { useCreateTask } from "../../hooks/useTasks";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { useDroppable } from "@dnd-kit/core";
import { useUpdateColumn, useDeleteColumn } from "../../hooks/useColumns";

function KanbanColumn({
  column,
  tasks,
  projectId,
  onOpenDetail,
}) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id });
  const createTask = useCreateTask(projectId);
  const updateColumnMutation = useUpdateColumn(projectId);
  const deleteColumnMutation = useDeleteColumn(projectId);

  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(column.name);

  const taskIds = tasks.map((t) => t.id);

  const handleAddTask = () => {
    createTask.mutate({
      title: "New Task",
      description: "",
      column_id: column.id,
      project_id: projectId,
    }, {
      onSuccess: (newTask) => {
        onOpenDetail(newTask);
      }
    });
  };

  const handleRenameSubmit = () => {
    if (!name.trim() || name === column.name) {
      setIsEditing(false);
      return;
    }

    updateColumnMutation.mutate(
      { columnId: column.id, name: name.trim() },
      {
        onSuccess: () => {
          setIsEditing(false);
        },
      }
    );
  };

  const handleDeleteColumn = () => {
    if (window.confirm(`Are you sure you want to delete the column "${column.name}"?`)) {
      deleteColumnMutation.mutate(column.id);
    }
  };

  return (
    <div className="flex-shrink-0 w-72 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl p-3 flex flex-col h-full max-h-full">
      <div className="flex items-center justify-between mb-3 px-1 flex-shrink-0 group">
        {isEditing ? (
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={handleRenameSubmit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleRenameSubmit();
              if (e.key === 'Escape') {
                setName(column.name);
                setIsEditing(false);
              }
            }}
            className="text-sm font-semibold text-gray-705 dark:text-gray-200 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 flex-1 mr-2"
            autoFocus
          />
        ) : (
          <h3
            onDoubleClick={() => setIsEditing(true)}
            className="text-sm font-semibold text-gray-700 dark:text-gray-300 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 rounded px-1.5 py-0.5 transition-colors flex-1 truncate"
            title="Double click to rename"
          >
            {column.name}
          </h3>
        )}

        <div className="flex items-center gap-1.5">
          <span className="text-xs text-gray-400">{tasks.length}</span>
          <button
            onClick={handleAddTask}
            disabled={createTask.isPending}
            className="p-1 hover:bg-gray-200 dark:hover:bg-gray-800 rounded text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors disabled:opacity-50"
            aria-label="Add task"
          >
            <Plus size={14} />
          </button>
          <button
            onClick={handleDeleteColumn}
            disabled={deleteColumnMutation.isPending}
            className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-50 dark:hover:bg-red-950/20 rounded text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-all duration-150"
            title="Delete column"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      <div
        ref={setNodeRef}
        className={`flex-1 overflow-y-auto min-h-[200px] rounded-lg transition-colors p-1 ${isOver ? 'bg-blue-50/20 dark:bg-blue-950/20 ring-2 ring-blue-200 dark:ring-blue-800' : ''
          }`}
      >
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