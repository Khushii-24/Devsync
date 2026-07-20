// frontend/src/store/taskPanelStore.js

import { create } from 'zustand';

// Global so TaskDetailPanel can be mounted once near the app root and
// opened from anywhere — the board's drag/click handlers AND this chip's
// click handler both just call openTask(id).
export const useTaskPanelStore = create((set) => ({
  openTaskId: null,
  projectId: null,
  workspaceId: null,
  openTask: (taskId, projectId, workspaceId) => set({ openTaskId: taskId, projectId, workspaceId }),
  closeTask: () => set({ openTaskId: null, projectId: null, workspaceId: null }),
}));