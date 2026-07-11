import { useRealtimeStore } from "../../stores/realtime.store";
import { useWorkspaceMembers } from "../../hooks/useWorkspaceMembers";

export function PresenceAvatars({ workspaceId }) {
  const onlineUserIds = useRealtimeStore((s) => s.onlineUsers);

  const { data: members } = useWorkspaceMembers(workspaceId);

  if (!members || onlineUserIds.length === 0) return null;

  const onlineMembers = onlineUserIds
    .map((id) => members.find((m) => m.user_id === id))
    .filter(Boolean);

  return (
    <div className="flex items-center -space-x-2">
      {onlineMembers.map((member) => (
        <div
          key={member.user_id}
          title={`${member.username} (${member.email})`}
          className="relative"
        >
          <div
            className="w-8 h-8 rounded-full
                       bg-blue-600
                       text-white
                       flex items-center justify-center
                       text-sm font-semibold
                       border-2 border-white"
          >
            {member.username.substring(0, 2).toUpperCase()}
          </div>

          <span
            className="absolute bottom-0 right-0
                       w-2.5 h-2.5
                       bg-green-500
                       border-2 border-white
                       rounded-full"
          />
        </div>
      ))}
    </div>
  );
}