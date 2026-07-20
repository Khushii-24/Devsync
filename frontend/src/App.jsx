import { Routes, Route, Navigate } from "react-router-dom";
import { useAuthStore } from "./stores/auth.store";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import BoardPage from "./pages/BoardPage";
import DocumentPage from "./pages/DocumentPage";
import DocumentsLayout from "./pages/DocumentsLayout";
import DocumentsEmptyState from "./pages/DocumentsEmptyState";
import TaskDetailPanelHost from "./components/TaskDetailPanelHost";
import AnalyticsPage from "./pages/AnalyticsPage";
import CommandPalette from "./components/search/CommandPalette";

function ProtectedRoute({ children }) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  return isAuthenticated ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route path="/projects/:projectId/board" element={<ProtectedRoute><BoardPage /></ProtectedRoute>} />
        <Route path="/projects/:projectId/analytics" element={<ProtectedRoute><AnalyticsPage /></ProtectedRoute>} />
        <Route
          path="/projects/:projectId/documents"
          element={
            <ProtectedRoute>
              <DocumentsLayout />
            </ProtectedRoute>
          }
        >
          <Route
            index
            element={<DocumentsEmptyState />}
          />
          <Route
            path=":documentId"
            element={<DocumentPage />}
          />
        </Route>
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
      <TaskDetailPanelHost />
      <CommandPalette />
    </>
  );
}