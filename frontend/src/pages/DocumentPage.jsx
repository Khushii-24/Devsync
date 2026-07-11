// frontend/src/pages/DocumentPage.jsx

import { useState } from 'react';
import DocEditor from '../components/editor/DocEditor';

// Placeholder page just to visually confirm the editor renders end-to-end.
// Day 4 replaces the local useState with a React Query fetch + the
// useAutosave hook — this file will look quite different by end of day.
export default function DocumentPage() {
  const [content, setContent] = useState({ type: 'doc', content: [] });

  return (
    <div className="max-w-3xl mx-auto py-8">
      <DocEditor content={content} onUpdate={setContent} />
    </div>
  );
}