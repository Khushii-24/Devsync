import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  User,
  Lock,
  Moon,
  Sun,
  Bell,
  BellOff,
  ChevronLeft,
  ChevronRight,
  Activity,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

import api from '../api/axios';
import { useAuthStore } from '../stores/auth.store';
import { useThemeStore } from '../stores/themeStore';
import { useWorkspaces, useWorkspaceMuteStatus, useToggleWorkspaceMute } from '../hooks/useWorkspaces';
import Avatar from '../components/common/Avatar';
import { toast } from '../stores/toastStore';

// Password Schema Validation
const passwordSchema = z.object({
  current_password: z.string().min(1, 'Current password is required'),
  new_password: z.string().min(6, 'New password must be at least 6 characters'),
  confirm_password: z.string().min(1, 'Please confirm your new password'),
}).refine((data) => data.new_password === data.confirm_password, {
  message: 'Passwords do not match',
  path: ['confirm_password'],
});

// Workspace Mute Toggle Sub-component for clean self-contained Query state
function WorkspaceMuteRow({ workspace }) {
  const { data: muteData, isLoading } = useWorkspaceMuteStatus(workspace.id);
  const toggleMute = useToggleWorkspaceMute(workspace.id);

  if (isLoading) {
    return (
      <div className="flex items-center justify-between py-2.5 animate-pulse">
        <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-1/3" />
        <div className="h-6 bg-gray-200 dark:bg-gray-800 rounded w-10" />
      </div>
    );
  }

  const isMuted = muteData?.notifications_muted;

  return (
    <div className="flex items-center justify-between py-2.5 border-b border-gray-100 dark:border-gray-800 last:border-none">
      <div>
        <div className="text-xs font-semibold text-gray-800 dark:text-gray-200">{workspace.name}</div>
        <div className="text-[10px] text-gray-400">/{workspace.slug}</div>
      </div>
      <button
        onClick={() => toggleMute.mutate()}
        disabled={toggleMute.isPending}
        className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors ${
          isMuted
            ? 'bg-red-50 dark:bg-red-950/20 text-red-655 hover:bg-red-100'
            : 'bg-green-50 dark:bg-green-950/20 text-green-700 hover:bg-green-105'
        }`}
      >
        {isMuted ? <BellOff size={11} /> : <Bell size={11} />}
        <span>{isMuted ? 'Muted' : 'Active'}</span>
      </button>
    </div>
  );
}

export default function ProfilePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, setUser } = useAuthStore();
  const { theme, toggleTheme } = useThemeStore();
  const { data: workspaces } = useWorkspaces();

  // Activity Feed state
  const [page, setPage] = useState(1);
  const limit = 6;

  const { data: activityLogs, isLoading: logsLoading } = useQuery({
    queryKey: ['user-activity', page],
    queryFn: () =>
      api.get(`/users/me/activity?page=${page}&limit=${limit}`).then((r) => r.data),
  });

  // Password Form
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(passwordSchema),
  });

  const [passwordFeedback, setPasswordFeedback] = useState(null);

  const changePasswordMutation = useMutation({
    mutationFn: (formData) => api.patch('/users/me', formData).then((r) => r.data),
    onSuccess: () => {
      setPasswordFeedback({ type: 'success', message: 'Password changed successfully!' });
      reset();
    },
    onError: (err) => {
      const msg = err.response?.data?.detail || 'Failed to change password. Please check your credentials.';
      setPasswordFeedback({ type: 'error', message: msg });
    },
  });

  const onPasswordSubmit = (data) => {
    setPasswordFeedback(null);
    changePasswordMutation.mutate({
      current_password: data.current_password,
      new_password: data.new_password,
    });
  };

  const userInitials = (user?.username || 'US').slice(0, 2).toUpperCase();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 font-sans">
      
      {/* Header */}
      <header className="sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-150 dark:border-gray-850 px-6 py-4 flex items-center justify-between z-30 shadow-sm">
        <div className="flex items-center gap-3">
          <Link
            to="/dashboard"
            className="p-1.5 border border-gray-200 dark:border-gray-750 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 rounded-lg transition-colors"
          >
            <ChevronLeft size={16} />
          </Link>
          <div>
            <h1 className="text-sm font-bold text-gray-900 dark:text-white leading-tight">User Profile & Settings</h1>
            <p className="text-[10px] text-gray-400">Manage account information, security, theme and notifications.</p>
          </div>
        </div>
      </header>

      {/* Main Grid Panels */}
      <main className="max-w-4xl mx-auto px-6 py-8 grid grid-cols-1 md:grid-cols-3 gap-8">
        
        {/* Left Column — Account Card & Theme / Mute settings */}
        <div className="md:col-span-1 space-y-6">
          
          {/* Details Card */}
          <div className="bg-white dark:bg-gray-900 border border-gray-150 dark:border-gray-850 rounded-xl p-5 shadow-sm text-center flex flex-col items-center">
            <Avatar name={user?.username} userId={user?.id} size="xl" className="mb-3 border-4 border-indigo-100 dark:border-indigo-900" />
            <h2 className="font-bold text-gray-900 dark:text-white text-sm">{user?.username}</h2>
            <p className="text-[10px] text-gray-400 mb-4">{user?.email}</p>
            <span className="text-[9px] font-bold px-2 py-0.5 bg-gray-100 dark:bg-gray-850 text-gray-500 dark:text-gray-400 rounded-full">
              Member since {user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}
            </span>
          </div>

          {/* Preferences Card */}
          <div className="bg-white dark:bg-gray-900 border border-gray-150 dark:border-gray-850 rounded-xl p-5 shadow-sm">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Preferences</h3>
            
            {/* Theme Toggle */}
            <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800">
              <span className="text-xs text-gray-700 dark:text-gray-300">Dark Mode</span>
              <button
                onClick={toggleTheme}
                className="p-1.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:text-indigo-600 rounded-lg transition-colors"
                title="Toggle Theme"
              >
                {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
              </button>
            </div>
          </div>

          {/* Notification Preferences */}
          <div className="bg-white dark:bg-gray-900 border border-gray-150 dark:border-gray-850 rounded-xl p-5 shadow-sm">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Notification Muting</h3>
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {workspaces?.map((workspace) => (
                <WorkspaceMuteRow key={workspace.id} workspace={workspace} />
              ))}
              {workspaces?.length === 0 && (
                <div className="py-2 text-center text-xs text-gray-400">No workspaces yet.</div>
              )}
            </div>
          </div>

        </div>

        {/* Right Column — Change Password & Activity Feed */}
        <div className="md:col-span-2 space-y-6">
          
          {/* Security Form */}
          <div className="bg-white dark:bg-gray-900 border border-gray-150 dark:border-gray-850 rounded-xl p-5 shadow-sm">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Security settings</h3>
            
            <form onSubmit={handleSubmit(onPasswordSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-1">
                    Current Password
                  </label>
                  <input
                    {...register('current_password')}
                    type="password"
                    className="w-full border border-gray-200 dark:border-gray-750 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  {errors.current_password && <p className="text-red-500 text-[10px] mt-1">{errors.current_password.message}</p>}
                </div>

                <div>
                  <label className="block text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-1">
                    New Password
                  </label>
                  <input
                    {...register('new_password')}
                    type="password"
                    className="w-full border border-gray-200 dark:border-gray-750 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  {errors.new_password && <p className="text-red-500 text-[10px] mt-1">{errors.new_password.message}</p>}
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-1">
                  Confirm New Password
                </label>
                <input
                  {...register('confirm_password')}
                  type="password"
                  className="w-full border border-gray-200 dark:border-gray-750 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                {errors.confirm_password && <p className="text-red-500 text-[10px] mt-1">{errors.confirm_password.message}</p>}
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={changePasswordMutation.isPending}
                  className="bg-indigo-650 hover:bg-indigo-700 text-white font-bold px-5 py-2 rounded-lg text-xs transition-colors disabled:opacity-50"
                >
                  {changePasswordMutation.isPending ? 'Updating...' : 'Change Password'}
                </button>
              </div>
            </form>

            {passwordFeedback && (
              <div className={`mt-3 p-3 rounded-lg flex items-center gap-2 text-xs ${passwordFeedback.type === 'success' ? 'bg-green-50 dark:bg-green-950/20 text-green-800 dark:text-green-300' : 'bg-red-50 dark:bg-red-950/20 text-red-800 dark:text-red-300'}`}>
                {passwordFeedback.type === 'success' ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
                <span>{passwordFeedback.message}</span>
              </div>
            )}
          </div>

          {/* Paginated Activity Log Table */}
          <div className="bg-white dark:bg-gray-900 border border-gray-150 dark:border-gray-850 rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Recent Activity Log</h3>
              <Activity size={15} className="text-indigo-500" />
            </div>

            {logsLoading ? (
              <div className="py-8 text-center text-xs text-gray-400 animate-pulse">Loading activity logs...</div>
            ) : !activityLogs || activityLogs.length === 0 ? (
              <div className="py-8 text-center text-xs text-gray-400">No activity logs recorded.</div>
            ) : (
              <div className="space-y-3.5">
                <div className="divide-y divide-gray-100 dark:divide-gray-800">
                  {activityLogs.map((log) => (
                    <div key={log.id} className="py-3 flex justify-between gap-3 items-start text-xs border-b border-gray-100 dark:border-gray-800 last:border-none">
                      <div>
                        <div className="font-semibold text-gray-800 dark:text-gray-250">
                          {log.event_type.replace('_', ' ').toUpperCase()}
                        </div>
                        <div className="text-[10px] text-gray-400 mt-0.5">
                          {log.event_data?.task_title || log.event_data?.title || 'System action'}
                        </div>
                      </div>
                      <div className="text-[9px] text-gray-400 shrink-0 font-medium">
                        {new Date(log.created_at).toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Pagination Controls */}
                <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-800">
                  <button
                    onClick={() => setPage(Math.max(1, page - 1))}
                    disabled={page === 1}
                    className="p-1 border border-gray-200 dark:border-gray-750 rounded hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 text-gray-500"
                  >
                    <ChevronLeft size={14} />
                  </button>
                  <span className="text-[10px] text-gray-450 font-bold">Page {page}</span>
                  <button
                    onClick={() => setPage(page + 1)}
                    disabled={activityLogs.length < limit}
                    className="p-1 border border-gray-200 dark:border-gray-750 rounded hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 text-gray-500"
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </div>

        </div>

      </main>
    </div>
  );
}
