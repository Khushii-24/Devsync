import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";

import TaskCard from "./TaskCard";
import { useCreateTask } from "../../hooks/useTasks";

import { useState, useEffect } from "react";
import { Plus, Trash2, ChevronLeft, ChevronRight, Check, X } from "lucide-react";
import { useDroppable } from "@dnd-kit/core";
import { useUpdateColumn, useDeleteColumn } from "../../hooks/useColumns";
import { toast } from "../../stores/toastStore";

function KanbanColumn({
  column,
  tasks,
  projectId,
  onOpenDetail,
  members,
}) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id });
  const createTask = useCreateTask(projectId);
  const updateColumnMutation = useUpdateColumn(projectId);
  const deleteColumnMutation = useDeleteColumn(projectId);

  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(column.name);

  // Column collapse persistence in localStorage
  const [isCollapsed, setIsCollapsed] = useState(() => {
    try {
      const stored = localStorage.getItem(`col_collapsed_${column.id}`);
      return stored === 'true';
    } catch (e) {
      return false;
    }
  });

  const toggleCollapse = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(`col_collapsed_${column.id}`, String(next));
      } catch (e) {}
      return next;
    });
  };

  // Inline Quick-Add Task state
  const [isQuickAdding, setIsQuickAdding] = useState(false);
  const [quickTitle, setQuickTitle] = useState("");

  const taskIds = tasks.map((t) => t.id);

  const handleQuickAddSubmit = (e) => {
    e.preventDefault();
    if (!quickTitle.trim()) return;

    createTask.mutate(
      {
        title: quickTitle.trim(),
        description: "",
        column_id: column.id,
        project_id: projectId,
      },
      {
        onSuccess: () => {
          toast.success(`Task "${quickTitle.trim()}" created!`);
          setQuickTitle("");
          setIsQuickAdding(false);
        },
      }
    );
  };

  const handleAddTask = () => {
    createTask.mutate({
      title: "New Task",
      description: "",
      column_id: column.id,
      project_id: projectId,
    }, {
      onSuccess: (newTask) => {
        toast.success("New task created!");
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
          toast.success("Column renamed!");
          setIsEditing(false);
        },
      }
    );
  };

  const handleDeleteColumn = () => {
    if (window.confirm(`Are you sure you want to delete the column "${column.name}"?`)) {
      deleteColumnMutation.mutate(column.id, {
        onSuccess: () => toast.success("Column deleted!"),
      });
    }
  };

  if (isCollapsed) {
    return (
      <div className="flex-shrink-0 w-12 bg-gray-100 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-2 flex flex-col items-center h-full select-none">
        <button
          onClick={toggleCollapse}
          className="p-1 hover:bg-gray-200 dark:hover:bg-gray-800 rounded text-gray-500 dark:text-gray-400 mb-4 transition-colors"
          title="Expand column"
        >
          <ChevronRight size={16} />
        </button>
        <div className="writing-mode-vertical text-xs font-bold text-gray-600 dark:text-gray-400 tracking-wider truncate flex-1 flex items-center justify-center">
          {column.name} ({tasks.length})
        </div>
      </div>
    );
  }

  return (
    <div className="flex-shrink-0 w-72 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl p-3 flex flex-col h-full max-h-full">
      <div className="flex items-center justify-between mb-3 px-1 flex-shrink-0 group">
        <button
          onClick={toggleCollapse}
          className="p-1 mr-1 hover:bg-gray-200 dark:hover:bg-gray-800 rounded text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
          title="Collapse column"
        >
          <ChevronLeft size={14} />
        </button>

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
            className="text-sm font-semibold text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 flex-1 mr-2"
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
          <span className="text-xs font-bold px-1.5 py-0.5 rounded-full bg-gray-200 dark:bg-gray-800 text-gray-600 dark:text-gray-400">{tasks.length}</span>
          <button
            onClick={() => setIsQuickAdding(true)}
            disabled={createTask.isPending}
            className="p-1 hover:bg-gray-200 dark:hover:bg-gray-800 rounded text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors disabled:opacity-50"
            aria-label="Add task"
            title="Quick add task"
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
          {tasks.length === 0 ? (
            <div className="h-32 border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-lg flex flex-col items-center justify-center p-3 text-center my-1">
              <span className="text-xs text-gray-400 font-medium">No tasks yet</span>
              <button
                onClick={() => setIsQuickAdding(true)}
                disabled={createTask.isPending}
                className="mt-1.5 text-[11px] text-indigo-600 dark:text-indigo-400 font-semibold hover:underline"
              >
                + Add first task
              </button>
            </div>
          ) : (
            tasks.map((task) => (
              <TaskCard key={task.id} task={task} onOpenDetail={onOpenDetail} members={members} />
            ))
          )}
        </SortableContext>
      </div>

      {/* Inline Quick-Add Task Bottom Form */}
      {isQuickAdding ? (
        <form onSubmit={handleQuickAddSubmit} className="mt-2 pt-2 border-t border-gray-100 dark:border-gray-800 flex flex-col gap-1.5">
          <input
            type="text"
            placeholder="Task title... (Enter to add, Esc to cancel)"
            value={quickTitle}
            onChange={(e) => setQuickTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                setIsQuickAdding(false);
                setQuickTitle("");
              }
            }}
            className="w-full border border-indigo-300 dark:border-indigo-700 bg-white dark:bg-gray-850 text-gray-900 dark:text-gray-100 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
            autoFocus
          />
          <div className="flex justify-end gap-1">
            <button
              type="button"
              onClick={() => {
                setIsQuickAdding(false);
                setQuickTitle("");
              }}
              className="p-1 rounded text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <X size={14} />
            </button>
            <button
              type="submit"
              disabled={createTask.isPending}
              className="px-2 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-[11px] font-semibold transition-colors disabled:opacity-50"
            >
              Add
            </button>
          </div>
        </form>
      ) : (
        <button
          onClick={() => setIsQuickAdding(true)}
          className="mt-2 text-left px-2 py-1.5 rounded-lg text-xs font-semibold text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-white dark:hover:bg-gray-850 transition-colors flex items-center gap-1.5"
        >
          <Plus size={13} />
          <span>Quick Add Task</span>
        </button>
      )}
    </div>
  );
}

export default KanbanColumn;