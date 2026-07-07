import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import { useUpdateTask } from '../../hooks/useTasks';
import { useWorkspaceMembers } from '../../hooks/useWorkspaceMembers';

const PRIORITIES = ['low', 'medium', 'high', 'urgent'];

function TaskDetailPanel({ task, projectId, workspaceId, isOpen, onClose }) {
  const updateTask = useUpdateTask(projectId);
  const { data: members } = useWorkspaceMembers(workspaceId);

  // Local form state, not React Hook Form here — this panel autosaves per-field
  // on blur/change rather than one big submit, so RHF's "submit the whole form"
  // model doesn't fit as naturally as it did for Login/Register.
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assigneeId, setAssigneeId] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [priority, setPriority] = useState('medium');
  const [labels, setLabels] = useState([]);
  const [labelInput, setLabelInput] = useState('');
  const [showPreview, setShowPreview] = useState(false);

  // Re-sync local state whenever a DIFFERENT task is opened. Without this effect,
  // opening task B while task A's fields are still in state would show stale
  // values for a flash before anything re-renders correctly.
  useEffect(() => {
  if (!task) return;

  setTitle((prev) => (prev !== (task.title ?? "") ? task.title ?? "" : prev));

  setDescription((prev) =>
    prev !== (task.description ?? "") ? task.description ?? "" : prev
  );

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
                <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">
                  &times;
                </button>
              </div>

              {/* Title */}
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={() => saveField('title', title)}
                className="text-lg font-semibold text-gray-900 border-none outline-none focus:ring-2 focus:ring-blue-200 rounded px-1 -mx-1"
                placeholder="Task title"
              />

              {/* Description — markdown edit/preview toggle */}
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

                {showPreview ? (
                  // prose classes assume you have @tailwindcss/typography installed;
                  // if not, ReactMarkdown still renders correctly, just unstyled
                  <div className="prose prose-sm max-w-none border border-gray-200 rounded-md p-2 min-h-[100px]">
                    <ReactMarkdown>{description || '*No description*'}</ReactMarkdown>
                  </div>
                ) : (
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    onBlur={() => saveField('description', description)}
                    rows={5}
                    className="w-full text-sm border border-gray-200 rounded-md p-2 outline-none focus:ring-2 focus:ring-blue-200"
                    placeholder="Add a description (markdown supported)..."
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
    </AnimatePresence>
  );
}

export default TaskDetailPanel;