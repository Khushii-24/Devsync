import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { wsManager } from '../lib/websocket';
import { useRealtimeStore } from '../stores/realtime.store';
import { useAuthStore } from '../stores/auth.store'; // adjust path to your actual Week 1 auth store

export function useRealtimeBoard(projectId) {
  const queryClient = useQueryClient();
  const setConnectionStatus = useRealtimeStore((s) => s.setConnectionStatus);
  const setOnlineUsers = useRealtimeStore((s) => s.setOnlineUsers);
  const addOnlineUser = useRealtimeStore((s) => s.addOnlineUser);
  const removeOnlineUser = useRealtimeStore((s) => s.removeOnlineUser);
  const currentUserId = useAuthStore((s) => s.user?.id);

  useEffect(() => {
    if (!projectId) return;

    const token = useAuthStore.getState().accessToken;
    wsManager.connect(projectId, token);

    const unsubscribeStatus = wsManager.onStatusChange(setConnectionStatus);

    const unsubscribeMessages = wsManager.onMessage((event) => {
      // Presence events: always apply, regardless of who triggered them.
      if (event.type === 'presence.sync') {
        setOnlineUsers(event.payload.user_ids);
        return;
      }
      if (event.type === 'user.joined') {
        addOnlineUser(event.payload.user_id);
        return;
      }
      if (event.type === 'user.left') {
        removeOnlineUser(event.payload.user_id);
        return;
      }

      // Task/column events: skip our own, as established Day 5.
      if (event.triggered_by === currentUserId) return;
      handleRealtimeEvent(event, queryClient, projectId);
    });


    return () => {
      unsubscribeStatus();
      unsubscribeMessages();
      wsManager.disconnect();
      setOnlineUsers([]);
    };
  }, [projectId, currentUserId]); // eslint-disable-line react-hooks/exhaustive-deps
}

function handleRealtimeEvent(event, queryClient, projectId) {
  console.log("Handling:", event.type);
  const tasksKey = ['tasks', projectId];
  const columnsKey = ['columns', projectId];

  switch (event.type) {
    case 'task.created': {
      
      queryClient.setQueryData(tasksKey, (old) => {
        if (!old) return old; // cache not populated yet (e.g. board still
                               // loading) — nothing to append to; the
                               // eventual initial fetch will include it anyway
        return [...old, event.payload];
      });
      break;
    }

    case 'task.updated': {
      queryClient.setQueryData(tasksKey, (old) => {
        if (!old) return old;
        return old.map((task) =>
          task.id === event.payload.id ? event.payload : task
        );
      });
      break;
    }

    case 'task.deleted': {
      queryClient.setQueryData(tasksKey, (old) => {
        if (!old) return old;
        return old.filter((task) => task.id !== event.payload.task_id);
      });
      break;
    }

    case 'task.reordered': {
      
      queryClient.setQueryData(tasksKey, (old) => {
        if (!old) return old;
        const updates = new Map(
          event.payload.tasks.map((t) => [t.task_id, t])
        );
        return old.map((task) => {
          const update = updates.get(task.id);
          if (!update) return task;
          return { ...task, column_id: update.column_id, position: update.position };
        });
      });
      break;
    }

    case 'column.created': {
      queryClient.setQueryData(columnsKey, (old) => {
        if (!old) return old;
        return [...old, event.payload];
      });
      break;
    }

    case 'column.updated': {
      queryClient.setQueryData(columnsKey, (old) => {
        if (!old) return old;
        return old.map((col) =>
          col.id === event.payload.id ? event.payload : col
        );
      });
      break;
    }
    case 'column.deleted': {
  queryClient.setQueryData(columnsKey, (old) => {
    if (!old) return old;

    return old.filter(
      (column) => column.id !== event.payload.column_id
    );
  });
  break;
}
    default:
    
      console.warn('Unhandled realtime event type:', event.type);
  }
}