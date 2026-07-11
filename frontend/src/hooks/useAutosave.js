// frontend/src/hooks/useAutosave.js

import { useRef, useCallback, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import axios from '../api/axios';
// Debounced autosave: collapses rapid keystrokes into one PATCH request
// 500ms after typing stops, rather than firing a request per keystroke.
// We use a plain setTimeout ref (not lodash.debounce) to keep this
// dependency-free and to make the flush-on-unmount behavior explicit below.
export function useAutosave(documentId) {
  const queryClient = useQueryClient();
  const timeoutRef = useRef(null);
  // Holds the latest pending content so flushNow() (unmount/tab-switch case)
  // always sends the freshest value, not a stale closure from when the
  // timeout was scheduled.
  const pendingContentRef = useRef(null);

  const mutation = useMutation({
    mutationFn: (content) =>
      axios.patch(`/documents/${documentId}`, { content }).then((r) => r.data),
    onSuccess: (updatedDoc) => {
      // Write straight into the query cache instead of invalidating —
      // avoids a refetch round-trip for a doc we already have the
      // authoritative new state for (same reasoning as Week 2's optimistic
      // update onSettled step, just skipping straight to the end state
      // since the server response IS the new truth here).
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

  // Flush immediately, bypassing the debounce — used when the user navigates
  // away mid-debounce so we don't lose up to 500ms of unsaved edits.
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
      // Cleanup on unmount (route change) — clear timer, flush what's pending.
      // Fire-and-forget: mutation firing after unmount is harmless since
      // it doesn't touch component state, only the query cache.
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