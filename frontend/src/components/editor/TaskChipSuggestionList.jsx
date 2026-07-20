// frontend/src/components/editor/TaskChipSuggestionList.jsx

import { forwardRef, useState, useEffect, useImperativeHandle } from 'react';

const STATUS_COLORS = { todo: 'bg-gray-400', in_progress: 'bg-blue-500', done: 'bg-green-500' };

const TaskChipSuggestionList = forwardRef((props, ref) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  useEffect(() => setSelectedIndex(0), [props.items]);

  const selectItem = (index) => {
    const item = props.items[index];
    if (item) props.command({ id: item.id, title: item.title, status: item.status });
  };

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }) => {
      if (event.key === 'ArrowUp') { setSelectedIndex((i) => (i + props.items.length - 1) % props.items.length); return true; }
      if (event.key === 'ArrowDown') { setSelectedIndex((i) => (i + 1) % props.items.length); return true; }
      if (event.key === 'Enter') { selectItem(selectedIndex); return true; }
      return false;
    },
  }));

  if (!props.items.length) return <div className="px-3 py-2 text-sm text-gray-400">No tasks found</div>;

  return (
    <div className="bg-white shadow-lg rounded-md border border-gray-200 py-1 min-w-[220px] max-h-64 overflow-y-auto">
      {props.items.map((item, i) => (
        <button
          key={item.id}
          onClick={() => selectItem(i)}
          className={`flex items-center gap-2 w-full text-left px-3 py-1.5 text-sm ${
            i === selectedIndex ? 'bg-indigo-50 text-indigo-600' : 'text-gray-700'
          }`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${STATUS_COLORS[item.status] || 'bg-gray-300'}`} />
          <span className="truncate">{item.title}</span>
        </button>
      ))}
    </div>
  );
});

export default TaskChipSuggestionList;