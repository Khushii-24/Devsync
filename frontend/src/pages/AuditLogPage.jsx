import { useState } from 'react';
import { useParams } from 'react-router-dom';
import WorkspaceSidebar from '../components/board/WorkspaceSidebar';
import Breadcrumbs from '../components/board/Breadcrumbs';
import { useWorkspaceMembers } from '../hooks/useWorkspaces';
import { useWorkspaceAuditLog } from '../hooks/useArchiveAndAudit';
import Avatar from '../components/common/Avatar';
import { Shield, Filter, Calendar, User as UserIcon, Activity } from 'lucide-react';

export default function AuditLogPage() {
  const { workspaceId } = useParams();
  const { data: members } = useWorkspaceMembers(workspaceId);

  // Filter states
  const [selectedActorId, setSelectedActorId] = useState('');
  const [selectedEventType, setSelectedEventType] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(1);

  const filters = {
    actor_id: selectedActorId || undefined,
    event_type: selectedEventType || undefined,
    start_date: startDate ? new Date(startDate).toISOString() : undefined,
    end_date: endDate ? new Date(endDate).toISOString() : undefined,
    page,
    limit: 50,
  };

  const { data: auditData, isLoading, error } = useWorkspaceAuditLog(workspaceId, filters);

  const formatEventType = (type) => {
    return type.replace(/_/g, ' ').toUpperCase();
  };

  const getEventBadgeClass = (type) => {
    if (type.includes('created') || type.includes('restored')) {
      return 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/50';
    }
    if (type.includes('deleted') || type.includes('archived')) {
      return 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800/50';
    }
    return 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/50';
  };

  return (
    <div className="flex h-screen bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-sans overflow-hidden">
      <WorkspaceSidebar workspaceId={workspaceId} members={members} />

      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Top Header */}
        <div className="px-6 pt-6 pb-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-950 dark:text-white flex items-center gap-2">
              <Shield size={20} className="text-amber-500" />
              <span>Workspace Audit Log</span>
            </h1>
            <p className="text-xs text-gray-400 mt-1">Review full activity history and mutation events across this workspace (Owner & Admin only).</p>
          </div>
          <Breadcrumbs />
        </div>

        <div className="p-6 space-y-6 max-w-6xl">
          {/* Filters Bar */}
          <div className="bg-white dark:bg-gray-850 border border-gray-150 dark:border-gray-800 rounded-2xl p-4 shadow-sm space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-wider">
              <Filter size={14} />
              <span>Filter Audit Events</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              {/* User Filter */}
              <div>
                <label className="block text-[11px] font-semibold text-gray-500 dark:text-gray-400 mb-1">Actor (User)</label>
                <select
                  value={selectedActorId}
                  onChange={(e) => { setSelectedActorId(e.target.value); setPage(1); }}
                  className="w-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 rounded-xl px-3 py-2 text-xs text-gray-900 dark:text-gray-100 focus:outline-none"
                >
                  <option value="">All Users</option>
                  {members?.map((m) => (
                    <option key={m.user_id} value={m.user_id}>{m.username} ({m.email})</option>
                  ))}
                </select>
              </div>

              {/* Event Type Filter */}
              <div>
                <label className="block text-[11px] font-semibold text-gray-500 dark:text-gray-400 mb-1">Event Type</label>
                <select
                  value={selectedEventType}
                  onChange={(e) => { setSelectedEventType(e.target.value); setPage(1); }}
                  className="w-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 rounded-xl px-3 py-2 text-xs text-gray-900 dark:text-gray-100 focus:outline-none"
                >
                  <option value="">All Event Types</option>
                  <option value="task_created">Task Created</option>
                  <option value="task_updated">Task Updated</option>
                  <option value="task_moved">Task Moved</option>
                  <option value="task_deleted">Task Soft-Deleted</option>
                  <option value="task_restored">Task Restored</option>
                  <option value="project_archived">Project Soft-Deleted</option>
                  <option value="project_restored">Project Restored</option>
                </select>
              </div>

              {/* Start Date */}
              <div>
                <label className="block text-[11px] font-semibold text-gray-500 dark:text-gray-400 mb-1">From Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
                  className="w-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 rounded-xl px-3 py-1.5 text-xs text-gray-900 dark:text-gray-100 focus:outline-none"
                />
              </div>

              {/* End Date */}
              <div>
                <label className="block text-[11px] font-semibold text-gray-500 dark:text-gray-400 mb-1">To Date</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
                  className="w-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 rounded-xl px-3 py-1.5 text-xs text-gray-900 dark:text-gray-100 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Audit Table */}
          {error ? (
            <div className="p-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/40 rounded-2xl text-xs text-red-700 dark:text-red-300 font-semibold">
              🔒 {error.response?.data?.detail || "Access restricted. Only Workspace Owners or Admins can view the Audit Log."}
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-850 border border-gray-150 dark:border-gray-800 rounded-2xl overflow-hidden shadow-sm">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/40 text-gray-400 font-semibold">
                    <th className="py-3 px-4">Timestamp</th>
                    <th className="py-3 px-4">Actor</th>
                    <th className="py-3 px-4">Event Type</th>
                    <th className="py-3 px-4">Event Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {isLoading ? (
                    <tr>
                      <td colSpan={4} className="py-12 text-center text-xs text-gray-400">Loading audit log entries...</td>
                    </tr>
                  ) : auditData?.items?.length > 0 ? (
                    auditData.items.map((log) => (
                      <tr key={log.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors text-gray-800 dark:text-gray-200">
                        <td className="py-3.5 px-4 text-gray-400 font-mono text-[11px]">
                          {new Date(log.created_at).toLocaleDateString()} {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2">
                            <Avatar name={log.actor_username} userId={log.actor_id} size="xs" />
                            <div>
                              <div className="font-bold text-gray-900 dark:text-white">{log.actor_username}</div>
                              <div className="text-[10px] text-gray-400">{log.actor_email || 'System'}</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold tracking-wider border ${getEventBadgeClass(log.event_type)}`}>
                            <Activity size={11} />
                            {formatEventType(log.event_type)}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-mono text-[11px] text-gray-600 dark:text-gray-300">
                          {log.event_data ? JSON.stringify(log.event_data) : '—'}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="py-12 text-center text-xs text-gray-400 italic">
                        No activity audit logs found matching your filter.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>

              {/* Pagination */}
              {auditData?.total > 50 && (
                <div className="p-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between text-xs text-gray-400">
                  <span>Showing page {auditData.page} of {Math.ceil(auditData.total / 50)} ({auditData.total} total)</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="px-3 py-1 rounded-lg bg-gray-100 dark:bg-gray-800 disabled:opacity-50 font-semibold"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => setPage((p) => p + 1)}
                      disabled={page * 50 >= auditData.total}
                      className="px-3 py-1 rounded-lg bg-gray-100 dark:bg-gray-800 disabled:opacity-50 font-semibold"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
