import axios from "axios";
import { useAuthStore } from "../stores/auth.store";

// All API calls go through this single instance — one place to configure base URL,
// headers, interceptors. Never use plain axios.get() directly in components.
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: { "Content-Type": "application/json" },
});

// ─── REQUEST INTERCEPTOR ──────────────────────────────────────────────────────
// Runs before every outgoing request — attaches the current access token
api.interceptors.request.use((config) => {
  // .getState() reads the Zustand store outside of React components.
  // Inside a component you'd use the hook (useAuthStore), but interceptors
  // are plain functions — no hooks allowed outside React's render cycle.
  const token = useAuthStore.getState().accessToken;

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config; // must return config or the request never goes out
});

// ─── REFRESH QUEUE MECHANISM ──────────────────────────────────────────────────
// Tracks whether a refresh call is currently in-flight
let isRefreshing = false;

// Holds requests that arrived while refresh was in progress
// Each item has resolve/reject so we can retry or fail them after refresh
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (err: unknown) => void;
}> = [];

// Called after refresh completes — either retries all queued requests (success)
// or rejects them all (failure)
function processQueue(error: unknown, token: string | null) {
  failedQueue.forEach((promise) => {
    if (error) {
      promise.reject(error);
    } else {
      promise.resolve(token!);
    }
  });
  failedQueue = []; // clear the queue after processing
}

// ─── RESPONSE INTERCEPTOR ─────────────────────────────────────────────────────
api.interceptors.response.use(
  // Success handler — pass all 2xx responses through unchanged
  (response) => response,

  // Error handler — only 401s need special treatment
  async (error) => {
    const originalRequest = error.config;

    // Only intercept 401s, and only if we haven't already retried this exact request.
    // _retry flag prevents an infinite loop — if the retry itself returns 401,
    // we don't want to refresh again forever.
    if (error.response?.status === 401 && !originalRequest._retry) {

      // Case 1: a refresh is already in-flight — queue this request
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          // When refresh completes, retry with new token
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        }).catch((err) => {
          return Promise.reject(err);
        });
      }

      // Case 2: no refresh in-flight — start one
      originalRequest._retry = true; // mark so we don't retry this request again
      isRefreshing = true;

      const refreshToken = useAuthStore.getState().refreshToken;

      // No refresh token at all — can't recover, force logout
      if (!refreshToken) {
        useAuthStore.getState().logout();
        return Promise.reject(error);
      }

      try {
        // Use plain axios here (not our api instance) to avoid the interceptor
        // catching a 401 on this refresh call and creating infinite recursion
        const { data } = await api.post(
          "/api/v1/auth/refresh",
          { refresh_token: refreshToken }
        );

        // Store the new tokens
        useAuthStore.getState().setTokens(data.access_token, data.refresh_token);

        // Retry all queued requests with new token
        processQueue(null, data.access_token);

        // Retry the original request that triggered this whole flow
        originalRequest.headers.Authorization = `Bearer ${data.access_token}`;
        return api(originalRequest);

      } catch (refreshError) {
        // Refresh itself failed (token expired or revoked) — session is unrecoverable
        processQueue(refreshError, null); // reject all queued requests
        useAuthStore.getState().logout();  // wipe auth state
        return Promise.reject(refreshError);

      } finally {
        isRefreshing = false; // always reset, success or failure
      }
    }

    // Not a 401 — let the error propagate normally to the calling component
    return Promise.reject(error);
  }
);

export default api;