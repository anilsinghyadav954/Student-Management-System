import { useState } from "react";
import { useNavigate, useLocation, Navigate } from "react-router-dom";
import { toast } from "react-toastify";
import { FiLock, FiEye, FiEyeOff, FiCheck } from "react-icons/fi";
import { authService } from "../../services/authService";

const passwordRules = [
  { label: "At least 8 characters", test: (pw) => pw.length >= 8 },
  { label: "Contains a letter", test: (pw) => /[A-Za-z]/.test(pw) },
  { label: "Contains a number", test: (pw) => /\d/.test(pw) },
];

const ResetPassword = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const resetToken = location.state?.resetToken;

  const [form, setForm] = useState({ newPassword: "", confirmPassword: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Can't reset a password without having gone through OTP verification first
  if (!resetToken) {
    return <Navigate to="/forgot-password" replace />;
  }

  const allRulesPass = passwordRules.every((rule) => rule.test(form.newPassword));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!allRulesPass) {
      setError("Password does not meet the requirements below");
      return;
    }
    if (form.newPassword !== form.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setSubmitting(true);
    try {
      await authService.resetPassword(resetToken, form.newPassword);
      toast.success("Password reset successfully. Please log in.");
      navigate("/login", { replace: true });
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to reset password. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 via-white to-slate-50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-950 px-4">
      <div className="w-full max-w-md animate-fade-in card">
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">Set a new password</h1>
        <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
          Choose a strong password you haven't used before.
        </p>

        <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-4">
          <div>
            <label htmlFor="newPassword" className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
              New password
            </label>
            <div className="relative">
              <FiLock className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                id="newPassword"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={form.newPassword}
                onChange={(e) => setForm({ ...form, newPassword: e.target.value })}
                className="input-field pl-10 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                tabIndex={-1}
              >
                {showPassword ? <FiEyeOff /> : <FiEye />}
              </button>
            </div>

            <ul className="mt-2 space-y-1">
              {passwordRules.map((rule) => {
                const passed = rule.test(form.newPassword);
                return (
                  <li key={rule.label} className={`flex items-center gap-1.5 text-xs ${passed ? "text-green-600 dark:text-green-400" : "text-slate-400"}`}>
                    <FiCheck className={passed ? "opacity-100" : "opacity-30"} />
                    {rule.label}
                  </li>
                );
              })}
            </ul>
          </div>

          <div>
            <label htmlFor="confirmPassword" className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Confirm new password
            </label>
            <div className="relative">
              <FiLock className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                id="confirmPassword"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={form.confirmPassword}
                onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                className="input-field pl-10"
              />
            </div>
          </div>

          {error && <p className="text-xs text-red-500">{error}</p>}

          <button type="submit" disabled={submitting} className="btn-primary w-full">
            {submitting ? "Resetting..." : "Reset Password"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ResetPassword;
