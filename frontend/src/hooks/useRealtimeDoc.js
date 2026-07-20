// frontend/src/hooks/useRealtimeDoc.js

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { wsManager } from '../lib/websocket'; // your Week 3 singleton
import { useAuthStore } from '../stores/auth.store'; 
export function useRealtimeDoc(documentId, projectId,editorRef) {
  const queryClient = useQueryClient();
  const currentUserId = useAuthStore((s) => s.user?.id);

  useEffect(() => {
  console.log("Realtime hook mounted");

  if (!documentId || !projectId) return;

  const token = useAuthStore.getState().accessToken;

  // THIS WAS MISSING
  wsManager.connect(projectId, token);

  const unsubscribe = wsManager.onMessage((event) => {
    console.log("Realtime event received:", event);

    if (event.type !== "document.updated") return;
    if (event.payload.document_id !== documentId) return;
    
    console.log("Triggered by:", event.triggered_by);
  console.log("Current user:", currentUserId);

  if (event.triggered_by === currentUserId) {
    console.log("Ignoring own event");
    return;
  }

    queryClient.setQueryData(["document", documentId], (old) =>
      old
        ? {
            ...old,
            title: event.payload.title,
            content: event.payload.content,
          }
        : old
    );

    // editorRef.current?.applyRemoteContent(event.payload.content);

    if (event.payload.version_number !== null) {
      queryClient.invalidateQueries({
        queryKey: ["document-versions", documentId],
      });
    }
  });

  return () => {
    unsubscribe();
    wsManager.disconnect();
  };
}, [documentId, projectId, currentUserId, queryClient, editorRef]);
}