import asyncHandler from "express-async-handler";
import User from "../models/User.js";
import { sendResponse } from "../utils/apiResponse.js";
import { uploadToCloudinary, deleteFromCloudinary } from "../middleware/uploadMiddleware.js";

/**
 * @desc   Update the logged-in user's own profile (name/phone). Email and
 *         role are intentionally not editable here — email changes would
 *         break login continuity, and role changes must go through an
 *         explicit admin action to avoid privilege escalation via a
 *         generic "update profile" endpoint.
 * @route  PUT /api/users/me
 * @access Private
 */
export const updateMyProfile = asyncHandler(async (req, res) => {
  const { name, phone } = req.body;

  const user = await User.findById(req.user._id);
  if (name) user.name = name;
  if (phone !== undefined) user.phone = phone;
  await user.save();

  sendResponse(res, 200, "Profile updated successfully", { user: user.toSafeObject() });
});

/**
 * @desc   Upload/replace the logged-in user's own profile photo
 * @route  PUT /api/users/me/photo
 * @access Private
 */
export const updateMyPhoto = asyncHandler(async (req, res) => {
  if (!req.file) {
    res.status(400);
    throw new Error("No image file provided");
  }

  const user = await User.findById(req.user._id);

  if (user.profileImage?.publicId) {
    await deleteFromCloudinary(user.profileImage.publicId);
  }

  const result = await uploadToCloudinary(req.file.buffer, "sms/profiles");
  user.profileImage = { url: result.secure_url, publicId: result.public_id };
  await user.save({ validateBeforeSave: false });

  sendResponse(res, 200, "Profile photo updated successfully", { profileImage: user.profileImage });
});

/**
 * @desc   List all admin/staff users (for a future "manage admins" screen).
 *         Kept minimal for now — students are managed via /api/students.
 * @route  GET /api/users?role=admin
 * @access Private/Admin
 */
export const getUsers = asyncHandler(async (req, res) => {
  const { role } = req.query;
  const filter = {};
  if (role) filter.role = role;

  const users = await User.find(filter).sort({ createdAt: -1 });
  sendResponse(res, 200, "Users fetched successfully", users);
});

/**
 * @desc   Activate/deactivate any user account (admin can lock out a
 *         student or fellow admin without deleting their historical data)
 * @route  PUT /api/users/:id/status
 * @access Private/Admin
 */
export const toggleUserStatus = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  if (user._id.equals(req.user._id)) {
    res.status(400);
    throw new Error("You cannot deactivate your own account");
  }

  user.isActive = !user.isActive;
  await user.save({ validateBeforeSave: false });

  sendResponse(res, 200, `User ${user.isActive ? "activated" : "deactivated"} successfully`, {
    user: user.toSafeObject(),
  });
});
