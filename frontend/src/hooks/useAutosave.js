// frontend/src/hooks/useAutosave.js

import { useRef, useCallback, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import axios from '../api/axios';

export function useAutosave(documentId) {
  const queryClient = useQueryClient();
  const timeoutRef = useRef(null);
  const pendingContentRef = useRef(null);

  const mutation = useMutation({
    mutationFn: (content) =>
      axios.patch(`/documents/${documentId}`, { content }).then((r) => r.data),
    onSuccess: (updatedDoc) => {
      
      queryClient.setQueryData(['document', documentId], updatedDoc);
      pendingContentRef.current = null;
    },
  });

  const scheduleSave = useCallback(
    (content) => {
      pendingContentRef.current = content;
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        mutation.mutate(content);
        timeoutRef.current = null;
      }, 500);
    },
    [mutation]
  );

  const flushNow = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (pendingContentRef.current !== null) {
      mutation.mutate(pendingContentRef.current);
    }
  }, [mutation]);

  useEffect(() => {
    return () => {
      
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (pendingContentRef.current !== null) {
        axios.patch(`/documents/${documentId}`, { content: pendingContentRef.current });
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [documentId]);

  return {
    scheduleSave,
    flushNow,
    isSaving: mutation.isPending,
    saveError: mutation.error,
  };
}