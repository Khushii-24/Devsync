// frontend/src/components/DocumentsSidebar.jsx

import { useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, FileText, MoreHorizontal, Trash2, Pencil } from 'lucide-react';
import axios from '../api/axios';
import NotificationBell from './notifications/NotificationBell';

export default function DocumentsSidebar({ projectId }) {
  const { documentId: activeId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [renamingId, setRenamingId] = useState(null);
  const [menuOpenId, setMenuOpenId] = useState(null);

  const { data: documents, isLoading } = useQuery({
    queryKey: ['documents', projectId],
    queryFn: () => axios.get(`/projects/${projectId}/documents`).then((r) => r.data),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['documents', projectId] });

  const createMutation = useMutation({
    mutationFn: () => axios.post(`/projects/${projectId}/documents`, { title: 'Untitled' }).then((r) => r.data),
    onSuccess: (doc) => {
      invalidate();
      navigate(`/projects/${projectId}/documents/${doc.id}`);
    },
  });

  const renameMutation = useMutation({
    mutationFn: ({ id, title }) => axios.patch(`/documents/${id}`, { title }),
    onSuccess: () => { invalidate(); setRenamingId(null); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => axios.delete(`/documents/${id}`),
    onSuccess: (_data, deletedId) => {
      invalidate();
      // If the doc being deleted is the one currently open, navigate away —
      // otherwise the page keeps rendering a now-404ing document.
      if (deletedId === activeId) navigate(`/projects/${projectId}/documents`);
    },
  });

  return (
    <div className="w-56 border-r border-gray-200 dark:border-gray-800 h-full flex flex-col bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-950/30">
        <span className="text-xs font-semibold text-gray-500 uppercase">Documents</span>
        <div className="flex items-center gap-2">
          <NotificationBell projectId={projectId} />
          <button
            onClick={() => createMutation.mutate()}
            disabled={createMutation.isPending}
            className="text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400"
          >
            <Plus size={16} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-1">
        {isLoading && <div className="px-3 py-2 text-xs text-gray-400">Loading...</div>}

        {documents?.map((doc) => (
          <div
            key={doc.id}
            className={`group flex items-center gap-1.5 px-3 py-1.5 text-sm cursor-pointer relative ${
              doc.id === activeId ? 'bg-indigo-50/70 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-200 font-medium' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-850'
            }`}
          >
            <FileText size={14} className="shrink-0 text-gray-400" />

            {renamingId === doc.id ? (
              <input
                autoFocus
                defaultValue={doc.title}
                onBlur={(e) => renameMutation.mutate({ id: doc.id, title: e.target.value })}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') e.target.blur();
                  if (e.key === 'Escape') setRenamingId(null);
                }}
                className="flex-1 min-w-0 text-sm outline-none border-b border-indigo-300 dark:border-indigo-500 bg-transparent text-gray-900 dark:text-gray-100"
              />
            ) : (
              <Link to={`/projects/${projectId}/documents/${doc.id}`} className="flex-1 min-w-0 truncate">
                {doc.title}
              </Link>
            )}

            <button
              onClick={(e) => { e.preventDefault(); setMenuOpenId(menuOpenId === doc.id ? null : doc.id); }}
              className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 shrink-0"
            >
              <MoreHorizontal size={14} />
            </button>

            {menuOpenId === doc.id && (
              <div className="absolute right-2 top-7 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg py-1 z-10 w-32">
                <button
                  onClick={() => { setRenamingId(doc.id); setMenuOpenId(null); }}
                  className="flex items-center gap-2 w-full px-3 py-1.5 text-xs text-left text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  <Pencil size={12} /> Rename
                </button>
                <button
                  onClick={() => { deleteMutation.mutate(doc.id); setMenuOpenId(null); }}
                  className="flex items-center gap-2 w-full px-3 py-1.5 text-xs text-left text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20"
                >
                  <Trash2 size={12} /> Delete
                </button>
              </div>
            )}
          </div>
        ))}

        {documents?.length === 0 && (
          <div className="px-3 py-4 text-xs text-gray-400 text-center">
            No documents yet
          </div>
        )}
      </div>
    </div>
  );
}