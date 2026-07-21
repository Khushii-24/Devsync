import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { useCreateWorkspace } from '../../hooks/useWorkspaces';

const schema = z.object({
  name: z.string().min(1, 'Workspace name is required').max(100),
  slug: z
    .string()
    .max(50)
    .regex(/^[a-z0-9-]*$/, 'Slug must contain only lowercase letters, numbers, and hyphens')
    .optional()
    .or(z.literal('')),
});

export default function CreateWorkspaceModal({ isOpen, onClose, onCreated }) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      slug: '',
    },
  });

  const createWorkspace = useCreateWorkspace();

  const onSubmit = (data) => {
    // If slug is empty string, send undefined so the backend auto-generates it
    const payload = {
      name: data.name,
      slug: data.slug || undefined,
    };

    createWorkspace.mutate(payload, {
      onSuccess: (workspace) => {
        reset();
        onClose();
        onCreated?.(workspace);
      },
    });
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="bg-white dark:bg-gray-850 rounded-xl p-6 w-full max-w-md shadow-2xl border border-gray-150 dark:border-gray-700 text-gray-900 dark:text-gray-100"
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Create Workspace</h2>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                  Workspace Name
                </label>
                <input
                  {...register('name')}
                  placeholder="e.g. Acme Corporation"
                  className="w-full border border-gray-200 dark:border-gray-750 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:focus:ring-indigo-650"
                  autoFocus
                />
                {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                  Custom Slug (optional)
                </label>
                <input
                  {...register('slug')}
                  placeholder="e.g. acme-corp"
                  className="w-full border border-gray-200 dark:border-gray-750 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:focus:ring-indigo-650"
                />
                {errors.slug && <p className="text-red-500 text-xs mt-1">{errors.slug.message}</p>}
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-4 py-2 border border-gray-200 dark:border-gray-750 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createWorkspace.isPending}
                  className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg text-sm transition-colors disabled:opacity-50"
                >
                  {createWorkspace.isPending ? 'Creating...' : 'Create'}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
