// frontend/src/pages/DocumentPage.jsx

import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from '../api/axios';
import DocEditor from '../components/editor/DocEditor';
import { useAutosave } from '../hooks/useAutosave';

export default function DocumentPage() {
  const { documentId } = useParams();
  const queryClient = useQueryClient();

  const { data: document, isLoading } = useQuery({
    queryKey: ['document', documentId],
    queryFn: () => axios.get(`/documents/${documentId}`).then((r) => r.data),
  });

  const { scheduleSave, isSaving } = useAutosave(documentId);

  const titleMutation = useMutation({
    mutationFn: (title) => axios.patch(`/documents/${documentId}`, { title }).then((r) => r.data),
    onSuccess: (updatedDoc) => queryClient.setQueryData(['document', documentId], updatedDoc),
  });

if (isLoading) {
    return <div className="p-8">Loading...</div>;
  }

  if (!document) {
    return <div className="p-8 text-red-500">Document not found.</div>;
  }
  return (
    <div className="max-w-3xl mx-auto py-8">
      <div className="flex items-center justify-between mb-4">
        <input
          defaultValue={document.title}
          
          onBlur={(e) => {
            // Title saves on blur, not debounced-per-keystroke — titles are
            // short and infrequent edits, a separate debounce would be
            // overkill. Content is the high-frequency case autosave targets.
            if (e.target.value !== document.title) titleMutation.mutate(e.target.value);
          }}
          className="text-xl font-semibold outline-none border-b border-transparent focus:border-gray-300 px-1"
        />
        <span className="text-xs text-gray-400">{isSaving ? 'Saving...' : 'Saved'}</span>
      </div>

      <DocEditor
        content={document.content}
        onUpdate={scheduleSave}
      />
    </div>
  );
}