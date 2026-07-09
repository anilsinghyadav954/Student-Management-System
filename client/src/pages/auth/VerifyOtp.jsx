import { useState, useRef } from "react";
import { useNavigate, useLocation, Link, Navigate } from "react-router-dom";
import { toast } from "react-toastify";
import { FiArrowLeft } from "react-icons/fi";
import { authService } from "../../services/authService";

const VerifyOtp = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const email = location.state?.email;

  const [digits, setDigits] = useState(["", "", "", "", "", ""]);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const inputsRef = useRef([]);

  // If someone lands here directly without going through Forgot Password
  // (no email in route state), send them back — there's nothing to verify.
  if (!email) {
    return <Navigate to="/forgot-password" replace />;
  }

  const handleChange = (index, value) => {
    if (!/^[0-9]?$/.test(value)) return; // only allow a single digit
    const next = [...digits];
    next[index] = value;
    setDigits(next);
    setError("");
    if (value && index < 5) {
      inputsRef.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    const pasted = e.clipboardData.getData("text").trim();
    if (/^\d{6}$/.test(pasted)) {
      setDigits(pasted.split(""));
      inputsRef.current[5]?.focus();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const otp = digits.join("");
    if (otp.length !== 6) {
      setError("Enter all 6 digits");
      return;
    }

    setSubmitting(true);
    try {
      const { data } = await authService.verifyOtp(email, otp);
      const { resetToken } = data.data;
      toast.success("OTP verified");
      navigate("/reset-password", { state: { resetToken } });
    } catch (error) {
      setError(error.response?.data?.message || "Invalid OTP. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleResend = async () => {
    try {
      await authService.forgotPassword(email);
      toast.success("A new OTP has been sent to your email");
    } catch (error) {
      toast.error("Failed to resend OTP. Please try again.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 via-white to-slate-50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-950 px-4">
      <div className="w-full max-w-md animate-fade-in">
        <Link to="/forgot-password" className="mb-6 inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-primary-600 dark:text-slate-400 dark:hover:text-primary-400">
          <FiArrowLeft /> Back
        </Link>

        <div className="card">
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Enter the OTP</h1>
          <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
            We sent a 6-digit code to <span className="font-medium text-slate-700 dark:text-slate-300">{email}</span>. It expires in 10 minutes.
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div className="flex justify-between gap-1.5 sm:gap-2" onPaste={handlePaste}>
              {digits.map((digit, index) => (
                <input
                  key={index}
                  ref={(el) => (inputsRef.current[index] = el)}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  className={`h-11 sm:h-12 w-full max-w-[44px] flex-1 rounded-lg border text-center text-lg font-semibold shadow-sm focus:outline-none focus:ring-1
                    ${error ? "border-red-400 focus:border-red-500 focus:ring-red-500" : "border-slate-300 focus:border-primary-500 focus:ring-primary-500 dark:border-slate-700"}
                    bg-white text-slate-900 dark:bg-slate-800 dark:text-slate-100`}
                />
              ))}
            </div>
            {error && <p className="text-xs text-red-500">{error}</p>}

            <button type="submit" disabled={submitting} className="btn-primary w-full">
              {submitting ? "Verifying..." : "Verify OTP"}
            </button>

            <button type="button" onClick={handleResend} className="w-full text-center text-xs font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400">
              Didn't receive it? Resend OTP
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default VerifyOtp;
