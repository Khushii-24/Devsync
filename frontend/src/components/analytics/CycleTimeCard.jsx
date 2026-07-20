export default function CycleTimeCard({ columns }) {
    if (!columns?.length) {
        return <div className="text-sm text-gray-400 py-6 text-center">No cycle-time data yet — needs at least one task moved twice.</div>;
    }

    return (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {columns.map((c) => (
                <div
                    key={c.column_id}
                    className="rounded-lg border border-gray-200 dark:border-gray-700 p-4 bg-white dark:bg-gray-800"
                >
                    <div className="text-xs text-gray-500 dark:text-gray-400 truncate">{c.column_name}</div>
                    <div className="text-2xl font-semibold mt-1">{c.avg_days}d</div>
                    <div className="text-xs text-gray-400 mt-1">{c.sample_size} sample{c.sample_size === 1 ? "" : "s"}</div>
                </div>
            ))}
        </div>
    );
}