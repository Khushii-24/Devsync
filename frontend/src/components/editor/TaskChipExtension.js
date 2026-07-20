// frontend/src/components/editor/TaskChipExtension.js

import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import Suggestion from '@tiptap/suggestion';
import TaskChipView from './TaskChipView';
import TaskChipSuggestionList from './TaskChipSuggestionList';
import { ReactRenderer } from '@tiptap/react';
import tippy from 'tippy.js';
import { PluginKey } from "@tiptap/pm/state";

// `atom: true` means TipTap treats this as a single indivisible unit for
// cursor movement/selection/backspace — you can't place a cursor "inside"
// a chip, only before or after it, same as an image or a mention.
const taskChipPluginKey = new PluginKey("taskChip");
export const TaskChip = Node.create({
  name: 'taskChip',
  group: 'inline',
  inline: true,
  atom: true,

  addAttributes() {
    return {
      taskId: { default: null },
      taskTitle: { default: '' },
      taskStatus: { default: null }, // cached at insert time, for the chip's color dot
    };
  },

  // parseHTML/renderHTML round-trip through data-* attrs — this is what
  // makes the chip survive a save→reload cycle: JSONB stores the node's
  // attrs directly (not HTML), so this pair matters more for copy/paste
  // and any future HTML export than for our own persistence.
  parseHTML() {
    return [{ tag: 'span[data-task-chip]' }];
  },

  renderHTML({ node, HTMLAttributes }) {
    return [
      'span',
      mergeAttributes(HTMLAttributes, {
        'data-task-chip': '',
        'data-task-id': node.attrs.taskId,
      }),
      `#${node.attrs.taskTitle}`,
    ];
  },

  addNodeView() {
    // ReactNodeViewRenderer lets the chip be a real React component (needed
    // for the click handler + status-color styling) instead of raw HTML.
    return ReactNodeViewRenderer(TaskChipView);
  },

  addProseMirrorPlugins() {
    return [
      Suggestion({
        editor: this.editor,
        char: '[[',
        pluginKey: taskChipPluginKey,
        allowSpaces: true,
        items: async ({ query }) => {
          // Reuses Week 2's task list — filtered client-side, same
          // small-scale reasoning as Day 4's member search.
          const { data } = await this.options.fetchProjectTasks();
          return data
            .filter((t) => t.title.toLowerCase().includes(query.toLowerCase()))
            .slice(0, 6);
        },
        command: ({ editor, range, props }) => {
          editor
            .chain()
            .focus()
            .insertContentAt(range, [
              {
                type: 'taskChip',
                attrs: { taskId: props.id, taskTitle: props.title, taskStatus: props.status },
              },
              { type: 'text', text: ' ' }, // trailing space so typing continues naturally after the chip
            ])
            .run();
        },
        render: () => {
          let component;
          let popup;
          return {
            onStart: (props) => {
              component = new ReactRenderer(TaskChipSuggestionList, { props, editor: props.editor });
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
      }),
    ];
  },
});