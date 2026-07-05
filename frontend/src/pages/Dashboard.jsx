import { useAuthStore } from "../stores/auth.store";
import { useNavigate } from "react-router-dom";

export default function Dashboard() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/login");
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Welcome, {user?.username}!
        </h1>
        <p className="text-gray-500 mb-6">{user?.email}</p>
        <p className="text-sm text-gray-400 mb-6">
          Week 2 — Kanban board comes here
        </p>
        <button
          onClick={handleLogout}
          className="bg-gray-900 hover:bg-gray-800 text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          Sign out
        </button>
      </div>
    </div>
  );
}