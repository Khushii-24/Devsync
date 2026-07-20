// frontend/src/pages/DocumentPage.jsx

import { useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from '../api/axios';
import DocEditor from '../components/editor/DocEditor';
import { useAutosave } from '../hooks/useAutosave';
import { useRealtimeDoc } from '../hooks/useRealtimeDoc';
import { useState } from 'react';
import VersionHistory from '../components/editor/VersionHistory';
export default function DocumentPage() {
  const { documentId } = useParams();
  const queryClient = useQueryClient();
  const editorRef = useRef(null);
  const [showVersions, setShowVersions] = useState(false);
  const { data: document, isLoading } = useQuery({
    queryKey: ['document', documentId],
    queryFn: () => axios.get(`/documents/${documentId}`).then((r) => r.data),
  });

  const { scheduleSave, isSaving } = useAutosave(documentId);
  useRealtimeDoc(documentId, document?.project_id,editorRef);

  const titleMutation = useMutation({
    mutationFn: (title) => axios.patch(`/documents/${documentId}`, { title }).then((r) => r.data),
    onSuccess: (updatedDoc) => queryClient.setQueryData(['document', documentId], updatedDoc),
  });

  if (isLoading) return <div className="p-8 text-gray-400">Loading...</div>;

  return (
    <div className="max-w-3xl mx-auto py-8">
      <div className="flex items-center justify-between mb-4">
        <input
          defaultValue={document.title}
          onBlur={(e) => {
            if (e.target.value !== document.title) titleMutation.mutate(e.target.value);
          }}
          className="text-xl font-semibold outline-none border-b border-transparent focus:border-gray-300 px-1"
        />
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-400">{isSaving ? 'Saving...' : 'Saved'}</span>
          <button onClick={() => setShowVersions(true)} className="text-xs text-indigo-600 hover:underline">
            History
          </button>
        </div>
      </div>

      // DocumentPage.jsx — workspaceId comes straight off the fetched document, no extra call
<DocEditor
  ref={editorRef}
  content={document.content}
  onUpdate={scheduleSave}
  projectId={document.project_id}
  workspaceId={document.workspace_id}
/>
{showVersions && (
        <VersionHistory
          documentId={documentId}
          currentContent={document.content}
          onClose={() => setShowVersions(false)}
          onRolledBack={(newContent) => editorRef.current?.applyRemoteContent(newContent)}
        />
      )}
    </div>
  );
}