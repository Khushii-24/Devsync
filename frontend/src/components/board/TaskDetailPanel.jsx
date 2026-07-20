import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUpdateTask, useDeleteTask } from '../../hooks/useTasks';
import { useWorkspaceMembers } from '../../hooks/useWorkspaceMembers';
import { Trash2 } from 'lucide-react';
import SubtaskSuggestions from '../ai/SubtaskSuggestions';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import CodeExplainer from '../ai/CodeExplainer';
const PRIORITIES = ['low', 'medium', 'high', 'urgent'];

function TaskDetailPanel({ task, projectId, workspaceId, isOpen, onClose }) {
  const updateTask = useUpdateTask(projectId);
  const { data: members } = useWorkspaceMembers(workspaceId);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assigneeId, setAssigneeId] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [priority, setPriority] = useState('medium');
  const [labels, setLabels] = useState([]);
  const [labelInput, setLabelInput] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showBreakdown, setShowBreakdown] = useState(false);
  const deleteMutation = useDeleteTask(projectId);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Placeholder.configure({
        placeholder: "Add a description (markdown supported)...",
      }),
    ],
    content: description,
    editable: !showPreview,
    onBlur: ({ editor }) => {
      saveField('description', editor.getHTML());
    },
  });

  useEffect(() => {
    if (editor) {
      editor.setEditable(!showPreview);
    }
  }, [showPreview, editor]);


  const confirmDelete = () => {
    deleteMutation.mutate(task.id, {
      onSuccess: () => {
        setShowConfirm(false);
        onClose();
      },
    });
  };

  useEffect(() => {
  if (!task) return;

  setShowBreakdown(false);
  setTitle((prev) =>
    prev !== (task.title ?? '') ? task.title ?? '' : prev
  );
  setDescription((prev) => {
    const next = task.description ?? "";
    if (prev !== next) {
      if (editor && editor.getHTML() !== next) {
        editor.commands.setContent(next);
      }
      return next;
    }
    return prev;
  });
  setAssigneeId((prev) =>
    prev !== (task.assignee_id ?? "") ? task.assignee_id ?? "" : prev
  );
  setDueDate((prev) =>
    prev !== (task.due_date ?? "") ? task.due_date ?? "" : prev
  );
  setPriority((prev) =>
    prev !== (task.priority ?? "medium") ? task.priority ?? "medium" : prev
  );
  setLabels((prev) => {
    const next = task.labels ?? [];
    return JSON.stringify(prev) !== JSON.stringify(next) ? next : prev;
  });
}, [task?.id]);

  // Generic autosave helper — every field calls this on blur (text fields) or
  // onChange (select/date, since there's no meaningful "blur" moment for those).
  function saveField(field, value) {
    updateTask.mutate({ taskId: task.id, [field]: value });
  }

  function addLabel(e) {
    e.preventDefault();
    const trimmed = labelInput.trim();
    if (!trimmed || labels.includes(trimmed)) return; // no empty or duplicate labels
    const next = [...labels, trimmed];
    setLabels(next);
    setLabelInput('');
    saveField('labels', next);
  }

  function removeLabel(label) {
    const next = labels.filter((l) => l !== label);
    setLabels(next);
    saveField('labels', next);
  }

  if (!task) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop — click to close, fades in/out */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 z-40"
          />

          {/* Panel — slides in from the right edge of the screen */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'tween', duration: 0.25, ease: 'easeOut' }}
            className="fixed right-0 top-0 h-full w-full sm:w-[420px] bg-white shadow-xl z-50 overflow-y-auto"
          >
            <div className="p-5 flex flex-col gap-5">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400 uppercase tracking-wide">Task Details</span>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setShowConfirm(true)}
                    className="text-red-500 hover:text-red-700 p-1.5 rounded hover:bg-red-50 transition-colors"
                    title="Delete Task"
                  >
                    <Trash2 size={16} />
                  </button>
                  <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">
                    &times;
                  </button>
                </div>
              </div>

              {/* Title */}
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={() => saveField('title', title)}
                className="text-lg font-semibold text-gray-900 border-none outline-none focus:ring-2 focus:ring-blue-200 rounded px-1 -mx-1"
                placeholder="Task title"
              />

              {/* Description — edit/preview toggle */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-medium text-gray-500 uppercase">Description</label>
                  <button
                    onClick={() => setShowPreview((p) => !p)}
                    className="text-xs text-blue-600 hover:underline"
                  >
                    {showPreview ? 'Edit' : 'Preview'}
                  </button>
                </div>

                <div className={showPreview 
                  ? "prose prose-sm max-w-none border border-gray-200 rounded-md p-2 min-h-[100px] bg-slate-50 [&_.ProseMirror]:focus:outline-none" 
                  : "w-full border border-gray-200 rounded-md p-2 outline-none focus-within:ring-2 focus-within:ring-blue-200 min-h-[100px] [&_.ProseMirror]:focus:outline-none"
                }>
                  <EditorContent editor={editor} />
                </div>
                <CodeExplainer editor={editor} task={task} />
              </div>

              {/* AI Subtask Decomposition */}
              <div className="border-t border-gray-100 pt-4">
                {!showBreakdown ? (
                  <button
                    onClick={() => setShowBreakdown(true)}
                    className="flex items-center gap-2 text-sm font-medium text-indigo-600 hover:text-indigo-700 transition-colors"
                  >
                    ✨ Break down into subtasks
                  </button>
                ) : (
                  <SubtaskSuggestions
                    task={task}
                    projectId={projectId}
                    columnId={task.column_id}
                    onClose={() => setShowBreakdown(false)}
                  />
                )}
              </div>

              {/* Assignee */}
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase block mb-1">Assignee</label>
                <select
                  value={assigneeId}
                  onChange={(e) => {
                    setAssigneeId(e.target.value);
                    saveField('assignee_id', e.target.value || null); // empty string → null, "unassigned"
                  }}
                  className="w-full text-sm border border-gray-200 rounded-md p-2"
                >
                  <option value="">Unassigned</option>
                  {members?.map((m) => (
                    <option key={m.user_id} value={m.user_id}>
                      {m.username || m.email}
                    </option>
                  ))}
                </select>
              </div>

              {/* Due date */}
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase block mb-1">Due date</label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => {
                    setDueDate(e.target.value);
                    saveField('due_date', e.target.value || null);
                  }}
                  className="w-full text-sm border border-gray-200 rounded-md p-2"
                />
              </div>

              {/* Priority */}
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase block mb-1">Priority</label>
                <select
                  value={priority}
                  onChange={(e) => {
                    setPriority(e.target.value);
                    saveField('priority', e.target.value);
                  }}
                  className="w-full text-sm border border-gray-200 rounded-md p-2"
                >
                  {PRIORITIES.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>

              {/* Labels — chip list + add input */}
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase block mb-1">Labels</label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {labels.map((label) => (
                    <span
                      key={label}
                      className="inline-flex items-center gap-1 text-xs bg-gray-100 text-gray-700 rounded-full px-2 py-0.5"
                    >
                      {label}
                      <button onClick={() => removeLabel(label)} className="text-gray-400 hover:text-gray-600">
                        &times;
                      </button>
                    </span>
                  ))}
                </div>
                <form onSubmit={addLabel} className="flex gap-2">
                  <input
                    value={labelInput}
                    onChange={(e) => setLabelInput(e.target.value)}
                    placeholder="Add label..."
                    className="flex-1 text-sm border border-gray-200 rounded-md p-2"
                  />
                  <button type="submit" className="text-sm bg-gray-900 text-white rounded-md px-3">
                    Add
                  </button>
                </form>
              </div>
            </div>
          </motion.div>
        </>
      )}
      <AnimatePresence>
        {showConfirm && (
          <motion.div
            className="fixed inset-0 bg-black/40 flex items-center justify-center z-[60]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowConfirm(false)}
          >
            <motion.div
              className="bg-white rounded-lg p-6 w-full max-w-sm shadow-xl"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-semibold mb-2 text-gray-900">Delete Task</h3>
              <p className="text-sm text-gray-500 mb-4">
                Are you sure you want to delete this task? This action cannot be undone.
              </p>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setShowConfirm(false)}
                  className="px-4 py-2 text-sm text-gray-500 hover:bg-gray-100 rounded"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  disabled={deleteMutation.isPending}
                  className="px-4 py-2 text-sm bg-red-600 hover:bg-red-700 text-white rounded disabled:opacity-50"
                >
                  {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </AnimatePresence>
  );
}

export default TaskDetailPanel;