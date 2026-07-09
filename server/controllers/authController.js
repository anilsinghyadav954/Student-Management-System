import asyncHandler from "express-async-handler";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { generateAccessToken } from "../utils/generateToken.js";
import { generateOTP, hashOTP, getOTPExpiry } from "../utils/generateOTP.js";
import { sendEmail, otpEmailTemplate } from "../utils/sendEmail.js";
import { sendResponse } from "../utils/apiResponse.js";

/**
 * @desc   Login for both Admin and Student (role is returned by the server,
 *         the frontend redirects based on it — never trust a role sent by the client)
 * @route  POST /api/auth/login
 * @access Public
 */
export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email: email.toLowerCase() }).select("+password");

  if (!user || !(await user.comparePassword(password))) {
    res.status(401);
    throw new Error("Invalid email or password");
  }

  if (!user.isActive) {
    res.status(403);
    throw new Error("Your account has been deactivated. Contact the administrator.");
  }

  user.lastLogin = new Date();
  await user.save({ validateBeforeSave: false });

  const token = generateAccessToken(user._id, user.role);

  sendResponse(res, 200, "Login successful", {
    token,
    user: user.toSafeObject(),
  });
});

/**
 * @desc   Request a password reset OTP, emailed to the account's address.
 *         Always responds with the same generic message whether or not the
 *         email exists, to avoid leaking which emails are registered.
 * @route  POST /api/auth/forgot-password
 * @access Public
 */
export const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const genericMessage = "If an account exists for this email, an OTP has been sent.";

  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) {
    return sendResponse(res, 200, genericMessage);
  }

  const otp = generateOTP();
  user.resetOTP = hashOTP(otp);
  user.resetOTPExpiry = getOTPExpiry();
  await user.save({ validateBeforeSave: false });

  try {
    await sendEmail({
      to: user.email,
      subject: "Your Password Reset OTP — Student Management System",
      html: otpEmailTemplate(user.name, otp, process.env.OTP_EXPIRE_MINUTES || 10),
    });
  } catch (error) {
    // Log the REAL underlying error (e.g. Gmail auth failure, wrong port,
    // etc.) to the server console. The generic message thrown below is
    // intentionally vague for the person using the app, but developers
    // need the actual reason — without this line it was impossible to
    // debug SMTP failures from the terminal.
    console.error("❌ Failed to send OTP email:", error.message);

    // Roll back the OTP if the email genuinely failed to send, so the
    // user isn't left with a valid OTP they never received.
    user.resetOTP = undefined;
    user.resetOTPExpiry = undefined;
    await user.save({ validateBeforeSave: false });
    res.status(500);
    throw new Error("Failed to send OTP email. Please try again later.");
  }

  sendResponse(res, 200, genericMessage);
});

/**
 * @desc   Verify the OTP and issue a short-lived reset token used to
 *         authorize the actual password change in the next step.
 * @route  POST /api/auth/verify-otp
 * @access Public
 */
export const verifyOTP = asyncHandler(async (req, res) => {
  const { email, otp } = req.body;

  const user = await User.findOne({ email: email.toLowerCase() }).select(
    "+resetOTP +resetOTPExpiry"
  );

  if (!user || !user.resetOTP || !user.resetOTPExpiry) {
    res.status(400);
    throw new Error("Invalid or expired OTP. Please request a new one.");
  }

  if (user.resetOTPExpiry < new Date()) {
    res.status(400);
    throw new Error("OTP has expired. Please request a new one.");
  }

  if (hashOTP(otp) !== user.resetOTP) {
    res.status(400);
    throw new Error("Incorrect OTP. Please try again.");
  }

  // Short-lived (10 min) single-purpose token — deliberately does NOT
  // include `role`, so it can't be mistaken for a normal access token
  // by anything that only checks for a valid signature + user id.
  const resetToken = jwt.sign(
    { id: user._id, purpose: "password_reset" },
    process.env.JWT_SECRET,
    { expiresIn: "10m" }
  );

  sendResponse(res, 200, "OTP verified successfully", { resetToken });
});

/**
 * @desc   Reset password using the short-lived resetToken from verify-otp
 * @route  POST /api/auth/reset-password
 * @access Public (requires valid resetToken)
 */
export const resetPassword = asyncHandler(async (req, res) => {
  const { resetToken, newPassword } = req.body;

  let decoded;
  try {
    decoded = jwt.verify(resetToken, process.env.JWT_SECRET);
  } catch (error) {
    res.status(401);
    throw new Error("Reset link has expired or is invalid. Please request a new OTP.");
  }

  if (decoded.purpose !== "password_reset") {
    res.status(401);
    throw new Error("Invalid reset token");
  }

  const user = await User.findById(decoded.id).select("+resetOTP +resetOTPExpiry");
  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  user.password = newPassword; // re-hashed automatically by the pre-save hook
  user.resetOTP = undefined;
  user.resetOTPExpiry = undefined;
  await user.save();

  sendResponse(res, 200, "Password reset successfully. You can now log in.");
});

/**
 * @desc   Change password while logged in (requires current password)
 * @route  PUT /api/auth/change-password
 * @access Private
 */
export const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  const user = await User.findById(req.user._id).select("+password");

  if (!(await user.comparePassword(currentPassword))) {
    res.status(401);
    throw new Error("Current password is incorrect");
  }

  if (currentPassword === newPassword) {
    res.status(400);
    throw new Error("New password must be different from the current password");
  }

  user.password = newPassword;
  await user.save();

  sendResponse(res, 200, "Password changed successfully");
});

/**
 * @desc   Get the currently authenticated user (used for session persistence
 *         on app load / page refresh — frontend calls this if a token exists)
 * @route  GET /api/auth/me
 * @access Private
 */
export const getMe = asyncHandler(async (req, res) => {
  sendResponse(res, 200, "User fetched successfully", { user: req.user.toSafeObject() });
});

/**
 * @desc   Logout — clears the httpOnly cookie if one was set. The frontend
 *         is also responsible for clearing its own localStorage token.
 * @route  POST /api/auth/logout
 * @access Private
 */
export const logout = asyncHandler(async (req, res) => {
  res.clearCookie("token");
  sendResponse(res, 200, "Logged out successfully");
});