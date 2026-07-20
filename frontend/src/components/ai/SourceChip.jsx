import { FileText, CheckSquare } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { useTaskPanelStore } from "../../stores/taskPanelStore"; // adjust path/name to match actual file
import api from "../../api/axios";

export default function SourceChip({ source }) {
  const navigate = useNavigate();
  const { workspaceId } = useParams();
  const openTask = useTaskPanelStore((state) => state.openTask);

  const isTask = source.source_type === "task";
  const Icon = isTask ? CheckSquare : FileText;

  const handleClick = async () => {
    try {
      if (isTask) {
        // Verify task exists first
        await api.get(`/tasks/${source.source_id}`);
        openTask(source.source_id, source.project_id, workspaceId);
      } else {
        // Verify document exists first
        await api.get(`/documents/${source.source_id}`);
        navigate(`/projects/${source.project_id}/documents/${source.source_id}`);
      }
    } catch (err) {
      alert("This item no longer exists.");
    }
  };

  return (
    <button
      onClick={handleClick}
      className="inline-flex items-center gap-1 text-xs bg-blue-50 text-blue-700 border border-blue-200 rounded-full px-2 py-0.5 hover:bg-blue-100 transition-colors"
    >
      <Icon size={10} />
      {isTask ? "Task" : "Doc"}
    </button>
  );
}