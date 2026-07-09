import express from "express";
import rateLimit from "express-rate-limit";
import {
  login,
  forgotPassword,
  verifyOTP,
  resetPassword,
  changePassword,
  getMe,
  logout,
} from "../controllers/authController.js";
import { protect } from "../middleware/authMiddleware.js";
import { validate } from "../middleware/validateMiddleware.js";
import {
  loginRules,
  forgotPasswordRules,
  verifyOTPRules,
  resetPasswordRules,
  changePasswordRules,
} from "../validators/authValidators.js";

const router = express.Router();

// Stricter rate limit on auth endpoints specifically — these are the
// most common brute-force / credential-stuffing / OTP-guessing targets.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many attempts. Please try again in 15 minutes." },
  skip: () => process.env.NODE_ENV === "test",
});

// ---- Public routes ----
router.post("/login", authLimiter, loginRules, validate, login);
router.post("/forgot-password", authLimiter, forgotPasswordRules, validate, forgotPassword);
router.post("/verify-otp", authLimiter, verifyOTPRules, validate, verifyOTP);
router.post("/reset-password", authLimiter, resetPasswordRules, validate, resetPassword);

// ---- Protected routes ----
router.get("/me", protect, getMe);
router.put("/change-password", protect, changePasswordRules, validate, changePassword);
router.post("/logout", protect, logout);

export default router;
