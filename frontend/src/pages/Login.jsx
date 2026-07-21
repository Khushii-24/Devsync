import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { useNavigate, Link } from "react-router-dom";
import api from "../api/axios";
import { useAuthStore } from "../stores/auth.store";

// ─── VALIDATION SCHEMA ────────────────────────────────────────────────────────
// This is the single source of truth for what a valid login looks like.
// Zod checks these rules at runtime when the form is submitted.
const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

// ─── COMPONENT ────────────────────────────────────────────────────────────────
export default function Login() {
  const navigate = useNavigate();
  const { setTokens, setUser } = useAuthStore();

  // useForm wires up RHF with Zod as the validation engine.
  // zodResolver translates Zod errors into RHF's error format automatically.
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(loginSchema),
  });

  // useMutation handles the async API call — loading state, error state, success handler
  const loginMutation = useMutation({
    mutationFn: (formData) =>
      api.post("/auth/login", formData).then((r) => r.data),

    onSuccess: async (data) => {
      // Store tokens first so the /users/me call has auth headers attached
      setTokens(data.access_token, data.refresh_token);

      // Fetch and store user profile — this populates user.email, user.username etc.
      // api.get automatically attaches the token we just stored (via the request interceptor)
      const { data: user } = await api.get("/users/me");
      setUser(user);

      navigate("/dashboard");
    },
  });

  // handleSubmit runs Zod validation first.
  // If validation passes → calls loginMutation.mutate(formData).
  // If validation fails → populates formState.errors, never calls the API.
  const onSubmit = handleSubmit((formData) => loginMutation.mutate(formData));

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">

        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Welcome back</h1>
          <p className="text-gray-500 mt-2">Sign in to your DevSync account</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
          <form onSubmit={onSubmit} className="space-y-5">

            {/* Email field */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Email address
              </label>
              <input
                {...register("email")}
                type="email"
                placeholder="you@example.com"
                className={`w-full px-3.5 py-2.5 rounded-lg border text-sm transition-colors
                  focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent
                  ${errors.email
                    ? "border-red-300 bg-red-50"      // red border when invalid
                    : "border-gray-300 bg-white"       // normal border otherwise
                  }`}
              />
              {/* errors.email only exists when Zod validation fails for this field */}
              {errors.email && (
                <p className="text-red-500 text-xs mt-1.5">{errors.email.message}</p>
              )}
            </div>

            {/* Password field */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Password
              </label>
              <input
                {...register("password")}
                type="password"
                placeholder="••••••••"
                className={`w-full px-3.5 py-2.5 rounded-lg border text-sm transition-colors
                  focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent
                  ${errors.password ? "border-red-300 bg-red-50" : "border-gray-300 bg-white"}`}
              />
              {errors.password && (
                <p className="text-red-500 text-xs mt-1.5">{errors.password.message}</p>
              )}
            </div>

            {/* API-level error — shown when login fails (wrong credentials etc.) */}
            {loginMutation.isError && (
              <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3">
                <p className="text-red-600 text-sm">
                  {loginMutation.error?.response?.data?.detail ?? "Login failed. Please try again."}
                </p>
              </div>
            )}

            {/* Submit button */}
            <button
              type="submit"
              disabled={isSubmitting || loginMutation.isPending}
              className="w-full bg-amber-500 hover:bg-amber-600 disabled:opacity-50
                disabled:cursor-not-allowed text-gray-950 font-bold py-2.5 rounded-xl
                text-sm transition-all shadow-md hover:shadow-amber-500/25 active:scale-95"
            >
              {loginMutation.isPending ? "Signing in..." : "Sign in"}
            </button>

          </form>
        </div>

        {/* Footer link */}
        <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-6">
          Don't have an account?{" "}
          <Link to="/register" className="text-amber-500 hover:text-amber-600 font-bold underline">
            Create one
          </Link>
        </p>

      </div>
    </div>
  );
}