// frontend/src/components/editor/DocEditor.jsx
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import EditorToolbar from './EditorToolbar';
import Mention from '@tiptap/extension-mention';
import { ReactRenderer } from '@tiptap/react';
import tippy from 'tippy.js';
import MentionList from './MentionList';
import api from '../../api/axios';
import { TaskChip } from './TaskChipExtension';
import { forwardRef, useImperativeHandle } from 'react';
import { useRef } from 'react';
import { useEffect } from 'react';
function buildMentionSuggestion(workspaceId) {
  return {
    items: async ({ query }) => {
      const { data } = await api.get(`/workspaces/${workspaceId}/members`);
      return data
        .filter((m) => m.username.toLowerCase().includes(query.toLowerCase()))
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

const DocEditor = forwardRef(function DocEditor(
  { content, onUpdate, editable = true, workspaceId, projectId,},
  ref
) {
  const isApplyingRemote = useRef(false);
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),

      Placeholder.configure({
        placeholder: "Start writing...",
      }),

      Mention.configure({
        HTMLAttributes: {
          class: "mention text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/30 rounded px-1",
        },
        suggestion: buildMentionSuggestion(workspaceId),
      }),
      console.log("PROJECT ID:", projectId),
      TaskChip.configure({
  fetchProjectTasks: () => api.get(`/projects/${projectId}/tasks`),
  projectId,
  workspaceId,
}),
    ],

    content,

    editable,

    onUpdate: ({ editor }) => {
  if (isApplyingRemote.current) return;

  onUpdate?.(editor.getJSON());
},

    editorProps: {
      attributes: {
        class: "ProseMirror min-h-[400px] p-4 focus:outline-none text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-900",
      },
    },
  });
  useImperativeHandle(
    ref,
    () => ({
      applyRemoteContent(newContent) {
  if (!editor) return;

  isApplyingRemote.current = true;

  editor.commands.setContent(newContent);

  requestAnimationFrame(() => {
    isApplyingRemote.current = false;
  });
}
    }),
    [editor]
  );

  useEffect(() => {
  if (!editor || !content) return;

  // Don't replace the document if it's already identical.
  if (JSON.stringify(editor.getJSON()) === JSON.stringify(content)) {
    return;
  }

  isApplyingRemote.current = true;

  editor.commands.setContent(content);

  requestAnimationFrame(() => {
    isApplyingRemote.current = false;
  });
}, [content, editor]);

  return (
    <div className="border border-gray-200 dark:border-gray-800 rounded-lg bg-white dark:bg-gray-900 overflow-hidden">
      <EditorToolbar editor={editor} />
      <EditorContent editor={editor} />
    </div>
  );
});

export default DocEditor;