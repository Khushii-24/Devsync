// frontend/src/components/editor/VersionHistory.jsx

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { diffWords } from 'diff';
import axios from '../../api/axios';
import { docToText } from '../../lib/docToText';
import { formatDistanceToNow } from 'date-fns';

export default function VersionHistory({ documentId, currentContent, onClose, onRolledBack }) {
  const queryClient = useQueryClient();
  const [selectedVersionId, setSelectedVersionId] = useState(null);

  const { data: versions, isLoading } = useQuery({
    queryKey: ['document-versions', documentId],
    queryFn: () => axios.get(`/documents/${documentId}/versions`).then((r) => r.data),
  });

  // Fetches full content only for the version being previewed — list view
  // intentionally omits content (Day 2's DocumentVersionSummary), so this
  // is a separate on-demand fetch, not wasted bandwidth for rows never opened.
  const { data: selectedVersion } = useQuery({
    queryKey: ['document-version', documentId, selectedVersionId],
    queryFn: () => axios.get(`/documents/${documentId}/versions/${selectedVersionId}`).then((r) => r.data),
    enabled: !!selectedVersionId,
  });

  const rollbackMutation = useMutation({
    mutationFn: (versionId) => axios.post(`/documents/${documentId}/rollback/${versionId}`).then((r) => r.data),
    onSuccess: (updatedDoc) => {
      // Update local cache directly rather than waiting on the WS event —
      // Day 5's useRealtimeDoc skips self-triggered events by design, so
      // the ACTING tab needs its own state update here; OTHER tabs get it
      // via the broadcast as usual.
      queryClient.setQueryData(['document', documentId], updatedDoc);
      queryClient.invalidateQueries({ queryKey: ['document-versions', documentId] });
      onRolledBack?.(updatedDoc.content);
      setSelectedVersionId(null);
    },
  });

  const diffParts = selectedVersion
    ? diffWords(docToText(selectedVersion.content), docToText(currentContent))
    : null;

  return (
    <div className="fixed inset-y-0 right-0 w-96 bg-white border-l border-gray-200 shadow-xl flex flex-col z-40">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
        <h3 className="font-semibold text-sm">Version History</h3>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-sm">✕</button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {isLoading && <div className="p-4 text-sm text-gray-400">Loading versions...</div>}

        {versions?.map((v) => (
          <button
            key={v.id}
            onClick={() => setSelectedVersionId(v.id === selectedVersionId ? null : v.id)}
            className={`w-full text-left px-4 py-2.5 border-b border-gray-100 hover:bg-gray-50 ${
              v.id === selectedVersionId ? 'bg-indigo-50' : ''
            }`}
          >
            <div className="text-sm font-medium">Version {v.version_number}</div>
            <div className="text-xs text-gray-500">
              {v.created_by_name} · {formatDistanceToNow(new Date(v.created_at), { addSuffix: true })}
            </div>
          </button>
        ))}
      </div>

      {selectedVersion && (
        <div className="border-t border-gray-200 p-4 max-h-80 overflow-y-auto">
          <div className="text-xs text-gray-400 mb-2">
            Diff vs. current (green = added, red = removed)
          </div>
          <div className="text-sm leading-relaxed whitespace-pre-wrap">
            {diffParts.map((part, i) => (
              <span
                key={i}
                className={
                  part.added ? 'bg-green-100 text-green-800'
                    : part.removed ? 'bg-red-100 text-red-800 line-through'
                    : 'text-gray-700'
                }
              >
                {part.value}
              </span>
            ))}
          </div>
          <button
            onClick={() => rollbackMutation.mutate(selectedVersion.id)}
            disabled={rollbackMutation.isPending}
            className="mt-3 w-full py-1.5 text-sm bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50"
          >
            {rollbackMutation.isPending ? 'Rolling back...' : `Rollback to v${selectedVersion.version_number}`}
          </button>
        </div>
      )}
    </div>
  );
}