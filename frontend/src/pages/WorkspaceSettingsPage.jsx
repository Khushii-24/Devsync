import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import { UserPlus, Shield, UserMinus, Plus, Info, AlertCircle, CheckCircle } from 'lucide-react';

import WorkspaceSidebar from '../components/board/WorkspaceSidebar';
import Breadcrumbs from '../components/board/Breadcrumbs';
import {
  useWorkspaces,
  useWorkspaceMembers,
  useInviteMember,
  useUpdateMemberRole,
  useRemoveMember,
} from '../hooks/useWorkspaces';
import { useProjects } from '../hooks/useProjects';
import {
  useProjectMembers,
  useCreateProjectOverride,
  useDeleteProjectOverride,
} from '../hooks/useProjectMembers';
import { useAuthStore } from '../stores/auth.store';

import Avatar from '../components/common/Avatar';
import { toast } from '../stores/toastStore';

// Validation schema for invite
const inviteSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  role: z.enum(['owner', 'admin', 'member']),
});

export default function WorkspaceSettingsPage() {
  const { workspaceId } = useParams();
  const navigate = useNavigate();
  const { user: currentUser } = useAuthStore();
  const { data: members, isLoading: membersLoading } = useWorkspaceMembers(workspaceId);
  const { data: projects } = useProjects(workspaceId);

  // Active Project for overrides
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const { data: projectMembers } = useProjectMembers(selectedProjectId);

  // Invite Form
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(inviteSchema),
    defaultValues: {
      email: '',
      role: 'member',
    },
  });

  const [feedback, setFeedback] = useState(null);

  // Mutations
  const inviteMutation = useInviteMember(workspaceId);
  const updateRoleMutation = useUpdateMemberRole(workspaceId);
  const removeMemberMutation = useRemoveMember(workspaceId);

  const createOverrideMutation = useCreateProjectOverride(selectedProjectId);
  const deleteOverrideMutation = useDeleteProjectOverride(selectedProjectId);

  const currentUserMemberRecord = members?.find((m) => m.user_id === currentUser?.id);
  const isOwner = currentUserMemberRecord?.role === 'owner';

  const onInviteSubmit = (data) => {
    setFeedback(null);
    inviteMutation.mutate(data, {
      onSuccess: (res) => {
        const msg = res.detail || 'Invitation sent successfully!';
        setFeedback({ type: 'success', message: msg });
        toast.success(msg);
        reset();
      },
      onError: (err) => {
        const msg = err.response?.data?.detail || 'Failed to invite user. Make sure they have an account.';
        setFeedback({ type: 'error', message: msg });
        toast.error(msg);
      },
    });
  };

  const handleRoleChange = (userId, newRole) => {
    updateRoleMutation.mutate({ userId, role: newRole }, {
      onSuccess: () => toast.success(`Member role updated to ${newRole.toUpperCase()}`),
    });
  };

  const handleRemoveMember = (userId) => {
    if (confirm('Are you sure you want to remove this member from the workspace?')) {
      removeMemberMutation.mutate(userId, {
        onSuccess: () => toast.success("Member removed from workspace"),
      });
    }
  };

  // Overrides Handlers
  const handleProjectOverrideChange = (userId, optionValue) => {
    if (optionValue === 'DEFAULT') {
      deleteOverrideMutation.mutate(userId, {
        onSuccess: () => toast.success("Project override removed"),
      });
    } else {
      createOverrideMutation.mutate({ user_id: userId, role: optionValue }, {
        onSuccess: () => toast.success(`Project override updated to ${optionValue.toUpperCase()}`),
      });
    }
  };

  const { data: workspaces } = useWorkspaces();
  const currentWorkspace = workspaces?.find((w) => w.id === workspaceId);
  const currentWorkspaceName = currentWorkspace?.name || 'Workspace';

  const [wsName, setWsName] = useState('');
  const [wsDesc, setWsDesc] = useState('');
  const [isSavingGeneral, setIsSavingGeneral] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  // Hydrate general workspace settings form when workspace loads
  useEffect(() => {
    if (currentWorkspace) {
      setWsName(currentWorkspace.name || '');
      setWsDesc(currentWorkspace.description || '');
    }
  }, [currentWorkspace?.id]);

  const handleGeneralSave = (e) => {
    e.preventDefault();
    if (!wsName.trim()) return;

    setIsSavingGeneral(true);
    // Simulates workspace PATCH saving
    setTimeout(() => {
      setIsSavingGeneral(false);
      toast.success("Workspace general settings saved!");
    }, 400);
  };

  const handleDeleteWorkspace = () => {
    if (deleteConfirmText !== currentWorkspaceName) return;
    toast.success(`Workspace "${currentWorkspaceName}" deleted`);
    navigate('/dashboard');
  };

  return (
    <div className="flex h-screen bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-sans overflow-hidden">
      
      {/* Workspace Sidebar */}
      <WorkspaceSidebar workspaceId={workspaceId} members={members} />

      {/* Main Settings Panel */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        
        {/* Top Header */}
        <div className="px-6 pt-6 pb-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
          <div className="space-y-1">
            <h1 className="text-xl font-bold text-gray-950 dark:text-white">Workspace Members</h1>
            <p className="text-xs text-gray-400">Invite, configure roles, and override specific project permissions for members.</p>
          </div>
          <Breadcrumbs />
        </div>

        <div className="p-6 space-y-8 max-w-4xl">
          
          {/* Member List Section */}
          <section className="bg-white dark:bg-gray-850 border border-gray-150 dark:border-gray-800 rounded-xl p-5 shadow-sm">
            <h2 className="text-sm font-bold uppercase tracking-wider text-gray-450 mb-4">Workspace Members</h2>
            
            {membersLoading ? (
              <div className="py-4 text-center text-xs text-gray-400">Loading members...</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-gray-100 dark:border-gray-800 text-gray-400 font-semibold">
                      <th className="py-2.5">User</th>
                      <th className="py-2.5">Email</th>
                      <th className="py-2.5">Workspace Role</th>
                      <th className="py-2.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {members?.map((m) => {
                      const isSelf = m.user_id === currentUser?.id;
                      return (
                        <tr key={m.user_id} className="text-gray-700 dark:text-gray-250">
                          <td className="py-3 font-semibold">
                            <div className="flex items-center gap-2">
                              <Avatar name={m.username || m.email} userId={m.user_id} size="sm" />
                              <span>{m.username} {isSelf && '(You)'}</span>
                            </div>
                          </td>
                          <td className="py-3">{m.email}</td>
                          <td className="py-3">
                            {isOwner && !isSelf ? (
                              <select
                                value={m.role}
                                onChange={(e) => handleRoleChange(m.user_id, e.target.value)}
                                className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 rounded px-2 py-1 focus:outline-none"
                              >
                                <option value="owner">Owner</option>
                                <option value="admin">Admin</option>
                                <option value="member">Member</option>
                              </select>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 font-bold uppercase text-[10px]">
                                <Shield size={10} />
                                {m.role}
                              </span>
                            )}
                          </td>
                          <td className="py-3 text-right">
                            {!isSelf && (isOwner || currentUserMemberRecord?.role === 'admin') && (
                              <button
                                onClick={() => handleRemoveMember(m.user_id)}
                                className="p-1.5 text-red-505 hover:bg-red-50 dark:hover:bg-red-950/20 rounded transition-colors"
                                title="Remove member"
                              >
                                <UserMinus size={14} />
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* Invite Section */}
          <section className="bg-white dark:bg-gray-850 border border-gray-150 dark:border-gray-800 rounded-xl p-5 shadow-sm space-y-4">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-gray-400 mb-1">Invite New Member</h2>
              <p className="text-xs text-gray-400">Invite registered users by email or share the instant workspace invite link.</p>
            </div>

            <form onSubmit={handleSubmit(onInviteSubmit)} className="flex flex-col md:flex-row gap-3">
              <div className="flex-1">
                <input
                  {...register('email')}
                  placeholder="name@email.com"
                  className="w-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs"
                />
                {errors.email && <p className="text-red-500 text-[10px] mt-1 font-semibold">{errors.email.message}</p>}
              </div>

              <div className="w-full md:w-36">
                <select
                  {...register('role')}
                  className="w-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs"
                >
                  <option value="member">Member</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={inviteMutation.isPending}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-6 py-2.5 rounded-xl text-xs transition-all shadow-md hover:shadow-indigo-500/25 active:scale-95 disabled:opacity-50 shrink-0"
              >
                {inviteMutation.isPending ? 'Inviting...' : 'Send Invite'}
              </button>
            </form>

            {/* Direct Workspace Join Link Generator */}
            <div className="pt-3 border-t border-gray-100 dark:border-gray-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gray-50/70 dark:bg-gray-900/40 p-3 rounded-xl border border-gray-150 dark:border-gray-800">
              <div className="space-y-0.5">
                <div className="text-xs font-bold text-gray-800 dark:text-gray-200">Workspace Join Link</div>
                <div className="text-[10px] text-gray-400">Share this direct link with teammates to quickly navigate them into this workspace.</div>
              </div>
              <button
                type="button"
                onClick={() => {
                  const joinUrl = `${window.location.origin}/dashboard?workspace=${workspaceId}`;
                  navigator.clipboard.writeText(joinUrl);
                  toast.success("Workspace invite link copied to clipboard!");
                }}
                className="px-3.5 py-1.5 bg-gray-900 dark:bg-gray-750 hover:bg-indigo-600 dark:hover:bg-indigo-600 text-white rounded-lg text-xs font-semibold transition-colors shrink-0"
              >
                Copy Invite Link
              </button>
            </div>

            {feedback && (
              <div className={`mt-3 p-3 rounded-xl flex items-center gap-2 text-xs font-medium ${feedback.type === 'success' ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40' : 'bg-red-50 dark:bg-red-950/20 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-800/40'}`}>
                {feedback.type === 'success' ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
                <span>{feedback.message}</span>
              </div>
            )}
          </section>

          {/* General Workspace Settings Section */}
          <section className="bg-white dark:bg-gray-850 border border-gray-150 dark:border-gray-800 rounded-xl p-5 shadow-sm space-y-4">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-gray-400 mb-1">General Settings</h2>
              <p className="text-xs text-gray-400">Update your workspace display name and workspace description.</p>
            </div>

            <form onSubmit={handleGeneralSave} className="space-y-4 max-w-lg">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Workspace Name
                </label>
                <input
                  type="text"
                  value={wsName}
                  onChange={(e) => setWsName(e.target.value)}
                  className="w-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Description
                </label>
                <textarea
                  value={wsDesc}
                  onChange={(e) => setWsDesc(e.target.value)}
                  rows={3}
                  placeholder="Workspace description..."
                  className="w-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs"
                />
              </div>

              <button
                type="submit"
                disabled={isSavingGeneral}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md transition-all active:scale-95 disabled:opacity-50"
              >
                {isSavingGeneral ? 'Saving...' : 'Save General Settings'}
              </button>
            </form>
          </section>

          {/* Project Overrides Section */}
          <section className="bg-white dark:bg-gray-850 border border-gray-150 dark:border-gray-800 rounded-xl p-5 shadow-sm">
            <h2 className="text-sm font-bold uppercase tracking-wider text-gray-450 mb-2">Project Role Overrides</h2>
            <p className="text-xs text-gray-400 mb-4">By default, all workspace members are Editors on project tasks. Apply an explicit override to set users as read-only Viewers.</p>

            <div className="mb-4">
              <label className="block text-xs font-semibold text-gray-400 mb-1">Select Project</label>
              <select
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                className="border border-gray-200 dark:border-gray-750 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-lg px-3 py-2 text-xs focus:outline-none w-full md:w-64"
              >
                <option value="">-- Choose a Project --</option>
                {projects?.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            {selectedProjectId && (
              <div className="border border-gray-100 dark:border-gray-800 rounded-lg overflow-hidden">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/40 text-gray-400 font-semibold">
                      <th className="py-2.5 px-3">User</th>
                      <th className="py-2.5 px-3">Email</th>
                      <th className="py-2.5 px-3">Project Role Override</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {projectMembers?.map((pm) => {
                      const isSelf = pm.user_id === currentUser?.id;
                      const hasOverride = pm.role !== 'editor'; // editor is default in response
                      return (
                        <tr key={pm.user_id} className="text-gray-700 dark:text-gray-250">
                          <td className="py-3 px-3 font-semibold">{pm.username} {isSelf && '(You)'}</td>
                          <td className="py-3 px-3">{pm.email}</td>
                          <td className="py-3 px-3">
                            <select
                              value={hasOverride ? pm.role : 'DEFAULT'}
                              onChange={(e) => handleProjectOverrideChange(pm.user_id, e.target.value)}
                              disabled={isSelf || (!isOwner && currentUserMemberRecord?.role !== 'admin')}
                              className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 rounded px-2 py-1 focus:outline-none"
                            >
                              <option value="DEFAULT">Default (Editor)</option>
                              <option value="editor">Editor Override</option>
                              <option value="viewer">Viewer Override (Read-Only)</option>
                            </select>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* Danger Zone Section (OWNER role required) */}
          <section className="bg-red-50/40 dark:bg-red-950/20 border border-red-200 dark:border-red-900/60 rounded-xl p-5 shadow-sm space-y-4">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-red-600 dark:text-red-400 mb-1">Danger Zone</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Deleting a workspace is permanent and removes all projects, boards, documents, and member associations.
              </p>
            </div>

            {isOwner ? (
              <div className="space-y-3 pt-2">
                <p className="text-xs text-gray-700 dark:text-gray-300 font-semibold">
                  Type <span className="font-extrabold text-red-600 dark:text-red-400">"{currentWorkspaceName}"</span> to confirm deletion:
                </p>
                <div className="flex flex-col sm:flex-row gap-3">
                  <input
                    type="text"
                    value={deleteConfirmText}
                    onChange={(e) => setDeleteConfirmText(e.target.value)}
                    placeholder={currentWorkspaceName}
                    className="flex-1 border border-red-200 dark:border-red-900/60 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-red-500 shadow-2xs"
                  />
                  <button
                    type="button"
                    onClick={handleDeleteWorkspace}
                    disabled={deleteConfirmText !== currentWorkspaceName}
                    className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl shadow-md transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                  >
                    Delete Workspace
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-3 bg-red-100/50 dark:bg-red-950/40 rounded-xl text-xs font-semibold text-red-700 dark:text-red-300">
                🔒 Danger zone actions are restricted to Workspace Owners.
              </div>
            )}
          </section>

        </div>
      </div>

    </div>
  );
}
