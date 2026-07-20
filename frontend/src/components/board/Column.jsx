// frontend/src/components/board/Column.jsx — add near existing column header markup
import { Plus } from "lucide-react";
import { useState } from "react";
import CreateTaskModal from "./CreateTaskModal";
from
// inside the Column component, alongside existing props (column, projectId, etc.)
const [isCreateOpen, setIsCreateOpen] = useState(false);

// in the column header JSX, next to the column title:
<>
    // in the column header JSX, next to the column title:
    <button
        onClick={() => setIsCreateOpen(true)}
        className="p-1 hover:bg-gray-100 rounded"
        aria-label="Add task"
    >
        <Plus size={16} />
    </button><CreateTaskModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        columnId={column.id}
        projectId={projectId} /></>