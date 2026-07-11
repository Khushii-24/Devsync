import { useRealtimeStore } from "../../stores/realtime.store";

const STATUS = {
  connected: {
    text: "Live",
    color: "bg-green-500",
    pulse: false,
  },
  reconnecting: {
    text: "Reconnecting",
    color: "bg-yellow-500",
    pulse: true,
  },
  disconnected: {
    text: "Offline",
    color: "bg-gray-400",
    pulse: false,
  },
  auth_failed: {
    text: "Connection Error",
    color: "bg-red-500",
    pulse: false,
  },
};

export function ConnectionStatusBadge() {
  const status = useRealtimeStore((s) => s.connectionStatus);

  const config = STATUS[status] ?? STATUS.disconnected;

  return (
    <div className="flex items-center gap-2 text-sm text-gray-600">
      <span
        className={`w-2 h-2 rounded-full ${config.color} ${
          config.pulse ? "animate-pulse" : ""
        }`}
      />

      {config.text}
    </div>
  );
}