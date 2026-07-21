import { motion, AnimatePresence } from 'framer-motion';
import { X, Command, Keyboard } from 'lucide-react';

export default function ShortcutsModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  const shortcuts = [
    { key: 'Cmd / Ctrl + K', description: 'Open Command Palette (Quick Search & Actions)' },
    { key: '?', description: 'Open Keyboard Shortcuts Cheatsheet' },
    { key: 'Double Click Column', description: 'Rename Kanban column inline' },
    { key: 'Drag Card', description: 'Reorder or move task between columns' },
    { key: 'Esc', description: 'Close active modal, drawer, or palette' },
    { key: 'Enter', description: 'Submit active inline form or task' },
  ];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="w-full max-w-md bg-white dark:bg-gray-850 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-2xl p-6 text-gray-900 dark:text-gray-100 font-sans"
        >
          <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-3 mb-4">
            <div className="flex items-center gap-2">
              <Keyboard className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <h2 className="text-base font-bold text-gray-900 dark:text-white">Keyboard Shortcuts</h2>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
            {shortcuts.map((s, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-2.5 rounded-xl bg-gray-50 dark:bg-gray-900/60 border border-gray-100 dark:border-gray-800/60"
              >
                <span className="text-xs text-gray-600 dark:text-gray-300 font-medium">{s.description}</span>
                <kbd className="px-2 py-1 rounded bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-[10px] font-mono font-bold text-indigo-600 dark:text-indigo-300 shadow-2xs shrink-0">
                  {s.key}
                </kbd>
              </div>
            ))}
          </div>

          <div className="mt-5 pt-3 border-t border-gray-100 dark:border-gray-800 text-center">
            <span className="text-[11px] text-gray-400">Press <kbd className="font-mono text-gray-600 dark:text-gray-300">Esc</kbd> anytime to dismiss</span>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
