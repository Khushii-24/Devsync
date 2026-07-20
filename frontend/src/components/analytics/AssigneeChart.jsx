import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

export default function AssigneeChart({ stats }) {
    if (!stats?.length) {
        return <div className="text-sm text-gray-400 py-12 text-center">No assigned tasks yet.</div>;
    }

    return (
        <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Legend />
                    {/* stacked: same stackId groups done+open into one bar per assignee */}
                    <Bar dataKey="done" stackId="a" fill="#22c55e" name="Done" />
                    <Bar dataKey="open" stackId="a" fill="#f59e0b" name="Open" />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}