import { useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { toast } from "react-toastify";
import { FiMail, FiLock, FiEye, FiEyeOff } from "react-icons/fi";
import { useAuth } from "../../context/AuthContext.jsx";

const Login = () => {
  const { login, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [form, setForm] = useState({ email: "", password: "" });
  const [loginType, setLoginType] = useState("admin"); // purely a UI/UX aid — see handleSubmit for why
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setErrors({ ...errors, [e.target.name]: "" });
  };

  const validate = () => {
    const newErrors = {};
    if (!form.email.trim()) newErrors.email = "Email is required";
    else if (!/^\S+@\S+\.\S+$/.test(form.email)) newErrors.email = "Enter a valid email";
    if (!form.password) newErrors.password = "Password is required";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    try {
      const loggedInUser = await login(form.email, form.password);

      // The server is the real source of truth for role — this check is
      // purely a UX nicety so someone who picks the wrong tab (e.g. an
      // admin accidentally on the "Student" tab) gets a clear, specific
      // message instead of just landing on an unexpected dashboard.
      if (loggedInUser.role !== loginType) {
        await logout();
        toast.error(
          `This email belongs to an ${loggedInUser.role} account. Please switch to the "${loggedInUser.role === "admin" ? "Admin" : "Student"}" tab and sign in again.`
        );
        setSubmitting(false);
        return;
      }

      toast.success(`Welcome back, ${loggedInUser.name}!`);

      // Redirect to wherever the user was trying to go, or their dashboard
      const redirectTo =
        location.state?.from?.pathname ||
        (loggedInUser.role === "admin" ? "/admin/dashboard" : "/student/dashboard");
      navigate(redirectTo, { replace: true });
    } catch (error) {
      const message = error.response?.data?.message || "Login failed. Please try again.";
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 via-white to-slate-50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-950 px-4">
      <div className="w-full max-w-md animate-fade-in">
        <div className="text-center mb-8">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-600 text-white text-2xl font-bold shadow-card">
            🎓
          </div>
          <h1 className="mt-4 text-2xl font-bold text-slate-900 dark:text-white">
            Student Management System
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Sign in to access your dashboard
          </p>
        </div>

        {/* Purely a UI aid — the server independently verifies the real role
            from the database regardless of which tab is selected. This just
            gives a clearer error if someone picks the wrong tab. */}
        <div className="mb-5 grid grid-cols-2 gap-2 rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
          <button
            type="button"
            onClick={() => setLoginType("admin")}
            className={`rounded-md py-2 text-sm font-medium transition-colors ${
              loginType === "admin"
                ? "bg-white text-primary-600 shadow-sm dark:bg-slate-700 dark:text-primary-400"
                : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
            }`}
          >
            Admin
          </button>
          <button
            type="button"
            onClick={() => setLoginType("student")}
            className={`rounded-md py-2 text-sm font-medium transition-colors ${
              loginType === "student"
                ? "bg-white text-primary-600 shadow-sm dark:bg-slate-700 dark:text-primary-400"
                : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
            }`}
          >
            Student
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate className="card space-y-5">
          <div>
            <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Email address
            </label>
            <div className="relative">
              <FiMail className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={form.email}
                onChange={handleChange}
                className={`input-field pl-10 ${errors.email ? "border-red-400 focus:border-red-500 focus:ring-red-500" : ""}`}
              />
            </div>
            {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email}</p>}
          </div>

          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label htmlFor="password" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                Password
              </label>
              <Link to="/forgot-password" className="text-xs font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400">
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <FiLock className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                placeholder="••••••••"
                value={form.password}
                onChange={handleChange}
                className={`input-field pl-10 pr-10 ${errors.password ? "border-red-400 focus:border-red-500 focus:ring-red-500" : ""}`}
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                tabIndex={-1}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <FiEyeOff /> : <FiEye />}
              </button>
            </div>
            {errors.password && <p className="mt-1 text-xs text-red-500">{errors.password}</p>}
          </div>

          <button type="submit" disabled={submitting} className="btn-primary w-full">
            {submitting ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Signing in...
              </>
            ) : (
              "Sign In"
            )}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-slate-400">
          Student accounts are created by your administrator. Contact them if you need access.
        </p>
      </div>
    </div>
  );
};

export default Login;