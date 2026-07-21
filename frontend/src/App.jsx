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
import WorkspaceSettingsPage from "./pages/WorkspaceSettingsPage";
import ProfilePage from "./pages/ProfilePage";

import LandingPage from "./pages/LandingPage";
import ArchiveTrashPage from "./pages/ArchiveTrashPage";
import AuditLogPage from "./pages/AuditLogPage";
import NotFoundPage from "./pages/NotFoundPage";
import ToastContainer from "./components/notifications/ToastContainer";
import ShortcutsModal from "./components/common/ShortcutsModal";
import { useState, useEffect } from "react";

function ProtectedRoute({ children }) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  return isAuthenticated ? children : <Navigate to="/login" replace />;
}

function PublicOnlyRoute({ children }) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  return isAuthenticated ? <Navigate to="/dashboard" replace /> : children;
}

export default function App() {
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);

  useEffect(() => {
    // Hydrate persisted theme class on HTML element (defaults to dark)
    const themeState = JSON.parse(localStorage.getItem('theme-storage') || '{}')?.state;
    if (themeState?.theme === 'light') {
      document.documentElement.classList.remove('dark');
    } else {
      document.documentElement.classList.add('dark');
    }

    const handleKeyDown = (e) => {
      if (e.key === "?" && !["INPUT", "TEXTAREA"].includes(e.target.tagName)) {
        e.preventDefault();
        setIsShortcutsOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <>
      <Routes>
        {/* Public Pre-login Landing Page */}
        <Route path="/" element={<PublicOnlyRoute><LandingPage /></PublicOnlyRoute>} />
        
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
        
        {/* Workspace Scoped Routes */}
        <Route path="/workspaces/:workspaceId/projects/:projectId/board" element={<ProtectedRoute><BoardPage /></ProtectedRoute>} />
        <Route path="/workspaces/:workspaceId/projects/:projectId/analytics" element={<ProtectedRoute><AnalyticsPage /></ProtectedRoute>} />
        <Route
          path="/workspaces/:workspaceId/projects/:projectId/documents"
          element={
            <ProtectedRoute>
              <DocumentsLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<DocumentsEmptyState />} />
          <Route path=":documentId" element={<DocumentPage />} />
        </Route>
        <Route path="/workspaces/:workspaceId/settings" element={<ProtectedRoute><WorkspaceSettingsPage /></ProtectedRoute>} />
        <Route path="/workspaces/:workspaceId/archive" element={<ProtectedRoute><ArchiveTrashPage /></ProtectedRoute>} />
        <Route path="/workspaces/:workspaceId/audit-log" element={<ProtectedRoute><AuditLogPage /></ProtectedRoute>} />

        {/* Profile Settings Route */}
        <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />

        {/* Legacy/Fallback Routes */}
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
          <Route index element={<DocumentsEmptyState />} />
          <Route path=":documentId" element={<DocumentPage />} />
        </Route>
        
        {/* 404 Catch-All */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
      <TaskDetailPanelHost />
      <CommandPalette />
      <ShortcutsModal isOpen={isShortcutsOpen} onClose={() => setIsShortcutsOpen(false)} />
      <ToastContainer />
    </>
  );
}