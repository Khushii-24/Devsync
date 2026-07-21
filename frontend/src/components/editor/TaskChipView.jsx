import { NodeViewWrapper } from '@tiptap/react';
import { useTaskPanelStore } from '../../stores/taskPanelStore';
import Avatar from '../common/Avatar';

const STATUS_COLORS = {
  todo: 'bg-amber-400',
  in_progress: 'bg-blue-500',
  done: 'bg-emerald-500',
  'to do': 'bg-amber-400',
  'in progress': 'bg-blue-500',
  completed: 'bg-emerald-500',
};

export default function TaskChipView({ node, extension }) {
  const openTask = useTaskPanelStore((s) => s.openTask);
  const { taskId, taskTitle, taskStatus, assigneeName } = node.attrs;
  const { projectId, workspaceId } = extension.options;

  const normalizedStatus = (taskStatus || 'todo').toLowerCase();

  return (
    <NodeViewWrapper as="span" className="inline-block">
      <button
        type="button"
        onClick={() => openTask(taskId, projectId, workspaceId)}
        contentEditable={false}
        className="inline-flex items-center gap-1.5 px-2 py-0.5 mx-0.5 rounded-lg bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60 text-indigo-950 dark:text-indigo-200 text-xs font-semibold hover:bg-indigo-100 dark:hover:bg-indigo-900 transition-colors shadow-2xs align-middle"
      >
        <span className={`w-2 h-2 rounded-full shrink-0 ${STATUS_COLORS[normalizedStatus] || 'bg-gray-400'}`} />
        <span className="truncate max-w-[150px]">{taskTitle || `Task #${taskId.slice(0, 4)}`}</span>
        {assigneeName && (
          <Avatar name={assigneeName} userId={assigneeName} size="xs" className="shrink-0" />
        )}
      </button>
    </NodeViewWrapper>
  );
}