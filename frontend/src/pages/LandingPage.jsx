import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/auth.store';
import { useThemeStore } from '../stores/themeStore';
import { useMutation } from '@tanstack/react-query';
import api from '../api/axios';
import { toast } from '../stores/toastStore';
import {
  Sparkles,
  Columns,
  MessageSquareCode,
  FileText,
  ShieldCheck,
  Sun,
  Moon,
  ArrowRight,
  Zap
} from 'lucide-react';

export default function LandingPage() {
  const navigate = useNavigate();
  const { setTokens, setUser } = useAuthStore();
  const { theme, toggleTheme } = useThemeStore();

  const demoMutation = useMutation({
    mutationFn: (formData) => api.post('/auth/login', formData).then((r) => r.data),
    onSuccess: async (data) => {
      setTokens(data.access_token, data.refresh_token);
      const { data: user } = await api.get('/users/me');
      setUser(user);
      toast.success(`Logged into demo account as ${user.username || user.email}!`);
      navigate('/dashboard');
    },
    onError: () => {
      toast.error('Demo login failed. Make sure test data is seeded.');
      navigate('/login');
    },
  });

  const handleDemoClick = () => {
    // Uses seeded demo account created by seed_test_data.py
    demoMutation.mutate({
      email: 'alex_morgan@devsync.com',
      password: 'password123',
    });
  };

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 font-sans selection:bg-indigo-500 selection:text-white flex flex-col">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 bg-gray-950/80 backdrop-blur-md border-b border-gray-850 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-black text-sm shadow-lg shadow-indigo-600/30">
            DS
          </div>
          <span className="text-base font-extrabold tracking-tight text-white">DevSync</span>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={toggleTheme}
            className="p-2 rounded-xl border border-gray-800 bg-gray-900 text-gray-300 hover:text-white transition-colors"
            title="Toggle theme"
          >
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          <Link
            to="/login"
            className="px-4 py-2 bg-gray-900 hover:bg-gray-800 text-gray-200 hover:text-white font-bold text-xs rounded-xl border border-gray-800 transition-colors"
          >
            Sign In
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 max-w-5xl mx-auto px-6 pt-20 pb-16 text-center flex flex-col items-center justify-center">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-950/60 border border-indigo-800/50 text-indigo-300 text-xs font-semibold mb-8">
          <Sparkles size={14} className="text-indigo-400" />
          <span>Real-time Engineering Collaboration Platform</span>
        </div>

        <h1 className="text-4xl md:text-6xl font-black text-white tracking-tight max-w-3xl leading-tight mb-6">
          Synchronize tasks, docs, and code with AI context.
        </h1>

        <p className="text-sm md:text-base text-gray-400 max-w-xl mb-10 leading-relaxed">
          DevSync brings real-time Kanban boards, collaborative markdown editor, and project-aware AI assistance into a unified workspace.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-4">
          <button
            onClick={handleDemoClick}
            disabled={demoMutation.isPending}
            className="px-7 py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs rounded-2xl shadow-xl shadow-indigo-600/30 transition-all hover:scale-105 active:scale-95 flex items-center gap-2 disabled:opacity-50"
          >
            <span>{demoMutation.isPending ? 'Logging into Demo...' : 'Try Live Demo'}</span>
            <ArrowRight size={16} />
          </button>
          <Link
            to="/login"
            className="px-7 py-3.5 bg-gray-900 hover:bg-gray-800 text-gray-200 font-bold text-xs rounded-2xl border border-gray-800 transition-all"
          >
            Sign In to Account
          </Link>
        </div>

        {/* Feature Highlights Grid */}
        <section className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-24 text-left w-full">
          <div className="p-5 bg-gray-900/60 border border-gray-850 rounded-2xl space-y-3">
            <div className="w-9 h-9 rounded-xl bg-blue-950/60 text-blue-400 flex items-center justify-center border border-blue-900/40">
              <Columns size={18} />
            </div>
            <h3 className="text-sm font-bold text-white">Real-Time Board Sync</h3>
            <p className="text-xs text-gray-400 leading-relaxed">
              Instant column moves and task state updates broadcasted via WebSockets.
            </p>
          </div>

          <div className="p-5 bg-gray-900/60 border border-gray-850 rounded-2xl space-y-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-950/60 text-indigo-400 flex items-center justify-center border border-indigo-900/40">
              <Zap size={18} />
            </div>
            <h3 className="text-sm font-bold text-white">AI Task Decomposition</h3>
            <p className="text-xs text-gray-400 leading-relaxed">
              Decompose complex engineering epics into subtasks with one click.
            </p>
          </div>

          <div className="p-5 bg-gray-900/60 border border-gray-850 rounded-2xl space-y-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-950/60 text-emerald-400 flex items-center justify-center border border-emerald-900/40">
              <MessageSquareCode size={18} />
            </div>
            <h3 className="text-sm font-bold text-white">RAG Project Chat</h3>
            <p className="text-xs text-gray-400 leading-relaxed">
              Ask questions about your project scope backed by contextual AI retrieval.
            </p>
          </div>

          <div className="p-5 bg-gray-900/60 border border-gray-850 rounded-2xl space-y-3">
            <div className="w-9 h-9 rounded-xl bg-purple-950/60 text-purple-400 flex items-center justify-center border border-purple-900/40">
              <ShieldCheck size={18} />
            </div>
            <h3 className="text-sm font-bold text-white">Granular Team RBAC</h3>
            <p className="text-xs text-gray-400 leading-relaxed">
              Workspace role management with project-level permission overrides.
            </p>
          </div>
        </section>

        {/* Screenshot Strip */}
        <section className="mt-16 w-full">
          <div className="p-3 bg-gray-900/80 border border-gray-800 rounded-3xl shadow-2xl">
            <div className="aspect-video w-full rounded-2xl bg-gray-950 border border-gray-850 flex flex-col items-center justify-center text-center p-8">
              <Columns size={48} className="text-indigo-500 mb-4 animate-pulse" />
              <div className="text-sm font-bold text-white mb-1">Interactive Kanban Board Interface</div>
              <div className="text-xs text-gray-500 max-w-sm">
                Real-time WebSocket presence, task detail drawer, TipTap markdown editor, and AI task breakdown.
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Tech Stack Badge Footer */}
      <footer className="border-t border-gray-900 py-8 px-6 text-center text-xs text-gray-500 mt-auto">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>© 2026 DevSync Platform. All rights reserved.</div>
          <div className="flex flex-wrap justify-center gap-2 text-[10px] font-bold uppercase tracking-wider text-gray-400">
            <span className="px-2.5 py-1 rounded-md bg-gray-900 border border-gray-800">FastAPI</span>
            <span className="px-2.5 py-1 rounded-md bg-gray-900 border border-gray-800">React</span>
            <span className="px-2.5 py-1 rounded-md bg-gray-900 border border-gray-800">TailwindCSS</span>
            <span className="px-2.5 py-1 rounded-md bg-gray-900 border border-gray-800">TanStack Query</span>
            <span className="px-2.5 py-1 rounded-md bg-gray-900 border border-gray-800">Zustand</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
