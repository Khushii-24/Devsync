import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { useNavigate, Link } from "react-router-dom";
import api from "../api/axios";
import { useAuthStore } from "../stores/auth.store";

// ─── VALIDATION SCHEMA ────────────────────────────────────────────────────────
const registerSchema = z
  .object({
    email: z.string().email("Please enter a valid email address"),
    username: z
      .string()
      .min(3, "Username must be at least 3 characters")
      .max(20, "Username can't exceed 20 characters")
      .regex(
        /^[a-zA-Z0-9_]+$/,
        "Only letters, numbers, and underscores allowed"
      ),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
  })
  // .refine() adds cross-field validation — runs AFTER all individual field checks pass.
  // "path" tells RHF which field to attach this error to.
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

// ─── REUSABLE FIELD COMPONENT ─────────────────────────────────────────────────
// Extracted to avoid repeating the same label/input/error markup 4 times
function FormField({ label, error, children }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">
        {label}
      </label>
      {children}
      {error && (
        <p className="text-red-500 text-xs mt-1.5">{error.message}</p>
      )}
    </div>
  );
}

// ─── COMPONENT ────────────────────────────────────────────────────────────────
export default function Register() {
  const navigate = useNavigate();
  const { setTokens, setUser } = useAuthStore();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    // watch lets you read a field's current value reactively —
    // useful for showing password strength feedback (Week 6 bonus or later)
  } = useForm({
    resolver: zodResolver(registerSchema),
  });

  const registerMutation = useMutation({
    mutationFn: (formData) =>
      api
        .post("/auth/register", {
          email: formData.email,
          username: formData.username,
          password: formData.password,
          // confirmPassword is NOT sent to the API — it's frontend-only validation
        })
        .then((r) => r.data),

    onSuccess: async (data) => {
      setTokens(data.access_token, data.refresh_token);
      const { data: user } = await api.get("/users/me");
      setUser(user);
      navigate("/dashboard");
    },
  });

  const onSubmit = handleSubmit((formData) =>
    registerMutation.mutate(formData)
  );

  const inputClass = (hasError) =>
    `w-full px-3.5 py-2.5 rounded-lg border text-sm transition-colors
     focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent
     ${hasError ? "border-red-300 bg-red-50" : "border-gray-300 bg-white"}`;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">

        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Create an account</h1>
          <p className="text-gray-500 mt-2">Start building with DevSync</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
          <form onSubmit={onSubmit} className="space-y-5">

            <FormField label="Email address" error={errors.email}>
              <input
                {...register("email")}
                type="email"
                placeholder="you@example.com"
                className={inputClass(errors.email)}
              />
            </FormField>

            <FormField label="Username" error={errors.username}>
              <input
                {...register("username")}
                type="text"
                placeholder="yourname"
                className={inputClass(errors.username)}
              />
            </FormField>

            <FormField label="Password" error={errors.password}>
              <input
                {...register("password")}
                type="password"
                placeholder="Min. 8 characters"
                className={inputClass(errors.password)}
              />
            </FormField>

            <FormField label="Confirm password" error={errors.confirmPassword}>
              <input
                {...register("confirmPassword")}
                type="password"
                placeholder="••••••••"
                className={inputClass(errors.confirmPassword)}
              />
            </FormField>

            {/* API-level error (email taken, username taken, etc.) */}
            {registerMutation.isError && (
              <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3">
                <p className="text-red-600 text-sm">
                  {registerMutation.error?.response?.data?.detail ??
                    "Registration failed. Please try again."}
                </p>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting || registerMutation.isPending}
              className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50
                disabled:cursor-not-allowed text-white font-medium py-2.5 rounded-lg
                text-sm transition-colors"
            >
              {registerMutation.isPending ? "Creating account..." : "Create account"}
            </button>

          </form>
        </div>

        <p className="text-center text-sm text-gray-500 mt-6">
          Already have an account?{" "}
          <Link to="/login" className="text-indigo-600 hover:text-indigo-700 font-medium">
            Sign in
          </Link>
        </p>

      </div>
    </div>
  );
}