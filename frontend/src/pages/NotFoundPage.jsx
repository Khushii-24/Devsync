import { Link } from 'react-router-dom';
import { Home, AlertTriangle } from 'lucide-react';

export default function NotFoundPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 font-sans p-6">
      <div className="max-w-md w-full text-center bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl p-8 shadow-xl">
        <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto mb-6">
          <AlertTriangle size={32} />
        </div>

        <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white mb-2">404</h1>
        <h2 className="text-base font-bold text-gray-800 dark:text-gray-200 mb-2">This page doesn't exist</h2>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-8 leading-relaxed">
          The link you followed may be broken, or the page may have been removed.
        </p>

        <Link
          to="/dashboard"
          className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-600/30 transition-all hover:scale-105 active:scale-95"
        >
          <Home size={15} />
          <span>Back to Dashboard</span>
        </Link>
      </div>
    </div>
  );
}
