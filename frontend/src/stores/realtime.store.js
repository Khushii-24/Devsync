// frontend/src/stores/realtime.store.js
import { create } from 'zustand';

export const useRealtimeStore = create((set) => ({
  connectionStatus: 'disconnected',
  onlineUsers: [],   // array of user_id strings

  setConnectionStatus: (status) => set({ connectionStatus: status }),

  setOnlineUsers: (userIds) => set({ onlineUsers: userIds }),

  addOnlineUser: (userId) =>
    set((state) =>
      state.onlineUsers.includes(userId)
        ? state // no-op if somehow already present — avoids a duplicate
                 // entry if a user.joined event ever arrived twice
        : { onlineUsers: [...state.onlineUsers, userId] }
    ),

  removeOnlineUser: (userId) =>
    set((state) => ({
      onlineUsers: state.onlineUsers.filter((id) => id !== userId),
    })),
}));