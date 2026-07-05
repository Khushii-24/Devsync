import { Routes, Route, Navigate } from "react-router-dom";
import { useAuthStore } from "./stores/auth.store";
import TestAuth from "./TestAuth";

// ProtectedRoute: if not authenticated, redirect to /login
function ProtectedRoute({ children }) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  return isAuthenticated ? children : <Navigate to="/login" replace />;
}

// Placeholder pages — you'll build these properly on Day 6
function Login() { return <div>Login page — Day 6</div>; }
function Register() { return <div>Register page — Day 6</div>; }
function Dashboard() { return <div>Dashboard — Week 2</div>; }

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<TestAuth/>}/>
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
      {/* Catch-all: redirect unknown routes to login */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}