// frontend/src/pages/DocumentsEmptyState.jsx — rendered at /projects/:projectId/documents (no doc selected)

import { FileText } from 'lucide-react';

export default function DocumentsEmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-gray-400">
      <FileText size={32} className="mb-2" />
      <p className="text-sm">Select a document, or create a new one</p>
    </div>
  );
}