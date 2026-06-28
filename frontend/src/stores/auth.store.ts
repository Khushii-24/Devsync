import { create } from "zustand";
import { persist } from "zustand/middleware";

// The shape of a logged-in user — matches what /users/me returns
interface User {
  id: string;
  email: string;
  username: string;
  is_active: boolean;
  created_at: string;
}

interface AuthState {
  // STATE
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;

  // ACTIONS
  setTokens: (accessToken: string, refreshToken: string) => void;
  setUser: (user: User) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  // persist middleware wraps the store and saves it to localStorage automatically.
  // This means if the user refreshes the page, their tokens survive — they stay logged in.
  persist(
    (set) => ({
      // Initial state — not logged in
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,

      // Called right after login/register — stores both tokens
      setTokens: (accessToken, refreshToken) =>
        set({ accessToken, refreshToken, isAuthenticated: true }),

      // Called after /users/me succeeds — stores the user profile
      setUser: (user) => set({ user }),

      // Called on logout or when refresh fails — wipes everything
      logout: () =>
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
        }),
    }),
    {
      name: "auth-storage", // the localStorage key this store saves under
      // partialize controls WHAT gets persisted — we persist everything auth-related.
      // If you had non-auth state in this store later, you'd exclude it here.
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);