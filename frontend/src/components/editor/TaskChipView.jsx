// frontend/src/components/editor/TaskChipView.jsx

import { NodeViewWrapper } from '@tiptap/react';
import { useTaskPanelStore } from '../../stores/taskPanelStore';
// NO import of `extension` — it isn't a module export anywhere

const STATUS_COLORS = { todo: 'bg-gray-400', in_progress: 'bg-blue-500', done: 'bg-green-500' };

export default function TaskChipView({ node, extension }) {
  const openTask = useTaskPanelStore((s) => s.openTask);
  const { taskId, taskTitle, taskStatus } = node.attrs;
  const { projectId, workspaceId } = extension.options;

  return (
    <NodeViewWrapper as="span" className="inline-block">
      <button
      
        onClick={() => openTask(taskId, projectId, workspaceId)}
        contentEditable={false}
        className="inline-flex items-center gap-1 px-1.5 py-0.5 mx-0.5 rounded bg-indigo-50 text-indigo-700 text-sm hover:bg-indigo-100 align-middle"
      >
        <span className={`w-1.5 h-1.5 rounded-full ${STATUS_COLORS[taskStatus] || 'bg-gray-300'}`} />
        {taskTitle}
      </button>
    </NodeViewWrapper>
  );
}