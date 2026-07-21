import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Settings, ChevronRight, Check } from 'lucide-react';
import { useWorkspaces } from '../hooks/useWorkspaces';
import CreateWorkspaceModal from './projects/CreateWorkspaceModal';

export default function SlidingWorkspacePanel({ isOpen, onClose, activeWorkspaceId, onSelectWorkspace }) {
  const { data: workspaces } = useWorkspaces();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50"
            />

            {/* Sliding Panel (Slack-Style Left Drawer) */}
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 280 }}
              className="fixed top-0 left-0 bottom-0 w-80 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 shadow-2xl z-50 flex flex-col font-sans text-gray-900 dark:text-gray-100"
            >
              {/* Panel Header */}
              <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-gray-50/50 dark:bg-gray-950/40">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-xs shadow-sm">
                    WS
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-gray-900 dark:text-white leading-tight">Workspaces</h2>
                    <p className="text-[10px] text-gray-400">Switch workspace hub</p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Workspace List */}
              <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-3 py-1">
                  Your Workspaces ({workspaces?.length || 0})
                </div>

                {workspaces?.map((w) => {
                  const isActive = w.id === activeWorkspaceId;
                  const initials = (w.name || 'WS').slice(0, 2).toUpperCase();

                  return (
                    <motion.div
                      key={w.id}
                      whileHover={{ x: 3 }}
                      transition={{ duration: 0.1 }}
                      onClick={() => {
                        onSelectWorkspace(w.id);
                        onClose();
                      }}
                      className={`group flex items-center justify-between p-3 rounded-xl cursor-pointer border transition-all ${
                        isActive
                          ? 'bg-indigo-50/70 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800/60 text-indigo-950 dark:text-indigo-200 shadow-xs'
                          : 'bg-white dark:bg-gray-850 border-gray-150 dark:border-gray-800/80 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 shadow-xs transition-colors ${
                            isActive
                              ? 'bg-indigo-600 text-white'
                              : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 group-hover:bg-indigo-100 dark:group-hover:bg-indigo-950 dark:group-hover:text-indigo-300'
                          }`}
                        >
                          {initials}
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-bold truncate leading-snug">{w.name}</div>
                          <div className="text-[10px] text-gray-400 truncate">/{w.slug}</div>
                        </div>
                      </div>

                      {isActive ? (
                        <Check size={16} className="text-indigo-600 dark:text-indigo-400 shrink-0 ml-2" />
                      ) : (
                        <ChevronRight size={14} className="text-gray-300 dark:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-2" />
                      )}
                    </motion.div>
                  );
                })}
              </div>

              {/* Panel Footer */}
              <div className="p-3 border-t border-gray-100 dark:border-gray-800 bg-gray-50/30 dark:bg-gray-950/20">
                <button
                  onClick={() => setIsCreateModalOpen(true)}
                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md transition-colors"
                >
                  <Plus size={15} />
                  <span>Create Workspace</span>
                </button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <CreateWorkspaceModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreated={(ws) => {
          onSelectWorkspace(ws.id);
          onClose();
        }}
      />
    </>
  );
}
