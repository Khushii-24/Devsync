// frontend/src/components/editor/MentionList.jsx

import { forwardRef, useState, useEffect, useImperativeHandle } from 'react';

// Imperative handle exposes onKeyDown to the suggestion.render() callback
// above — TipTap's suggestion plugin needs to forward arrow/enter keys from
// the editor into this dropdown, which React refs handle naturally here.
const MentionList = forwardRef((props, ref) => {
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => setSelectedIndex(0), [props.items]);

  const selectItem = (index) => {
    const item = props.items[index];
    if (item) props.command({ id: item.user_id, label: item.username });
  };

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }) => {
      if (event.key === 'ArrowUp') {
        setSelectedIndex((i) => (i + props.items.length - 1) % props.items.length);
        return true;
      }
      if (event.key === 'ArrowDown') {
        setSelectedIndex((i) => (i + 1) % props.items.length);
        return true;
      }
      if (event.key === 'Enter') {
        selectItem(selectedIndex);
        return true;
      }
      return false;
    },
  }));

  if (!props.items.length) return null;

  return (
    <div className="bg-white shadow-lg rounded-md border border-gray-200 py-1 min-w-[160px]">
      {props.items.map((item, i) => (
        <button
          key={item.user_id}
          onClick={() => selectItem(i)}
          className={`block w-full text-left px-3 py-1.5 text-sm ${
            i === selectedIndex ? 'bg-indigo-50 text-indigo-600' : 'text-gray-700'
          }`}
        >
          {item.username}
        </button>
      ))}
    </div>
  );
});

export default MentionList;