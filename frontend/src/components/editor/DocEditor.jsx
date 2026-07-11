// frontend/src/components/editor/DocEditor.jsx
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import EditorToolbar from './EditorToolbar';
import Mention from '@tiptap/extension-mention';
import { ReactRenderer } from '@tiptap/react';
import tippy from 'tippy.js';
import MentionList from './MentionList';
import axios from '../../api/axios';
function buildMentionSuggestion(workspaceId) {
  return {
    items: async ({ query }) => {
      const { data } = await axios.get(`/workspaces/${workspaceId}/members`);
      return data
        .filter((m) => m.user.name.toLowerCase().includes(query.toLowerCase()))
        .slice(0, 5);
    },
    render: () => {
      let component;
      let popup;
      return {
        onStart: (props) => {
          component = new ReactRenderer(MentionList, { props, editor: props.editor });
          popup = tippy(document.body, {
            getReferenceClientRect: props.clientRect,
            content: component.element,
            showOnCreate: true,
            interactive: true,
            trigger: 'manual',
            placement: 'bottom-start',
          });
        },
        onUpdate: (props) => {
          component.updateProps(props);
          popup[0]?.setProps({ getReferenceClientRect: props.clientRect });
        },
        onKeyDown: (props) => component.ref?.onKeyDown(props),
        onExit: () => {
          popup[0]?.destroy();
          component.destroy();
        },
      };
    },
  };
}

export default function DocEditor({ content, onUpdate, editable = true, workspaceId }) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      Placeholder.configure({ placeholder: 'Start writing...' }),
      Mention.configure({
        HTMLAttributes: { class: 'mention text-indigo-600 bg-indigo-50 rounded px-1' },
        suggestion: buildMentionSuggestion(workspaceId),
      }),
    ],
    content,
    editable,
    
    onUpdate: ({ editor }) => {
      onUpdate?.(editor.getJSON());
    },
    editorProps: {
  attributes: {
    class: "ProseMirror min-h-[400px] p-4 focus:outline-none",
  },
},
  });
  
  if (!editor) return null;
  return (
    <div className="border border-gray-200 rounded-lg bg-white">
      <EditorToolbar editor={editor} />
      <EditorContent editor={editor} />
    </div>
  );
}