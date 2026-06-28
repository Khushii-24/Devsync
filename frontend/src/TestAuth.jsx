import { useState } from "react";
import api from "./api/axios";
import { useAuthStore } from "./stores/auth.store";

export default function TestAuth() {
  const { setTokens, setUser, logout, isAuthenticated, user } = useAuthStore();
  const [result, setResult] = useState("");

  async function testRegister() {
    try {
      const { data } = await api.post("/auth/register", {
        email: "frontend@test.com",
        username: "frontenduser",
        password: "password123",
      });
      setTokens(data.access_token, data.refresh_token);
      setResult("Register success ✓");
    } catch (e) {
      setResult(`Register failed: ${e.response?.data?.detail}`);
    }
  }

  async function testGetMe() {
    try {
      const { data } = await api.get("/users/me");
      setUser(data);
      setResult(`Got user: ${data.email} ✓`);
    } catch (e) {
      setResult(`/me failed: ${e.response?.status}`);
    }
  }

  return (
    <div style={{ padding: 20, fontFamily: "monospace" }}>
      <p>isAuthenticated: {String(isAuthenticated)}</p>
      <p>user: {user?.email ?? "null"}</p>
      <p>result: {result}</p>
      <button onClick={testRegister}>Test Register</button>{" "}
      <button onClick={testGetMe}>Test /me</button>{" "}
      <button onClick={logout}>Test Logout</button>
    </div>
  );
}