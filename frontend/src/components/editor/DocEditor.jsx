// frontend/src/components/editor/DocEditor.jsx

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import EditorToolbar from './EditorToolbar';

// `content` is the TipTap JSON tree from the Document row (or the default
// empty doc). `onUpdate` receives the full JSON on every change — Day 4 wires
// this into the debounced autosave hook, so this component stays "dumb"
// about persistence.
export default function DocEditor({ content, onUpdate, editable = true }) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        // StarterKit includes a basic Heading; we cap levels at 1-3 to match
        // typical doc-editor UX (h4-h6 rarely used, keeps toolbar simpler).
        heading: { levels: [1, 2, 3] },
      }),
      Placeholder.configure({
        placeholder: 'Start writing...',
      }),
    ],
    content,
    editable,
    // getJSON() returns the ProseMirror doc as a plain JS object — this is
    // exactly the shape our JSONB column expects, no transformation needed.
    onUpdate: ({ editor }) => {
      onUpdate?.(editor.getJSON());
    },
    editorProps: {
  attributes: {
    class: "ProseMirror min-h-[400px] p-4 focus:outline-none",
  },
},
  });

  // TipTap's `content` prop is only used on FIRST mount — it does NOT
  // resync if the prop changes later (e.g. when a WebSocket doc_updated
  // event arrives on Day 5). We handle that resync explicitly rather than
  // relying on the prop, since editor.commands.setContent() needs care to
  // avoid wiping local cursor position — deferred to Day 5.

  if (!editor) return null;

  return (
    <div className="border border-gray-200 rounded-lg bg-white">
      <EditorToolbar editor={editor} />
      <EditorContent editor={editor} />
    </div>
  );
}