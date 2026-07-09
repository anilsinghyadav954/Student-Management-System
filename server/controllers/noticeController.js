import asyncHandler from "express-async-handler";
import Notice from "../models/Notice.js";
import Student from "../models/Student.js";
import { sendResponse, getPagination, buildMeta } from "../utils/apiResponse.js";

/**
 * @desc   Create a notice
 * @route  POST /api/notices
 * @access Private/Admin
 */
export const createNotice = asyncHandler(async (req, res) => {
  const { title, description, audience, targetClass, priority, isPinned, expiryDate } = req.body;

  const notice = await Notice.create({
    title,
    description,
    audience,
    targetClass: audience === "class" ? targetClass : "",
    priority,
    isPinned,
    expiryDate,
    postedBy: req.user._id,
  });

  sendResponse(res, 201, "Notice created successfully", notice);
});

/**
 * @desc   Update a notice
 * @route  PUT /api/notices/:id
 * @access Private/Admin
 */
export const updateNotice = asyncHandler(async (req, res) => {
  const notice = await Notice.findById(req.params.id);
  if (!notice) {
    res.status(404);
    throw new Error("Notice not found");
  }

  const { title, description, audience, targetClass, priority, isPinned, expiryDate } = req.body;

  Object.assign(notice, {
    ...(title && { title }),
    ...(description && { description }),
    ...(audience && { audience }),
    targetClass: (audience || notice.audience) === "class" ? targetClass ?? notice.targetClass : "",
    ...(priority && { priority }),
    ...(isPinned !== undefined && { isPinned }),
    ...(expiryDate !== undefined && { expiryDate }),
  });

  await notice.save();
  sendResponse(res, 200, "Notice updated successfully", notice);
});

/**
 * @desc   Delete a notice
 * @route  DELETE /api/notices/:id
 * @access Private/Admin
 */
export const deleteNotice = asyncHandler(async (req, res) => {
  const notice = await Notice.findByIdAndDelete(req.params.id);
  if (!notice) {
    res.status(404);
    throw new Error("Notice not found");
  }
  sendResponse(res, 200, "Notice deleted successfully");
});

/**
 * @desc   List all notices (admin view — sees everything, unfiltered by audience)
 * @route  GET /api/notices?page=&limit=
 * @access Private/Admin
 */
export const getAllNotices = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);

  const [notices, total] = await Promise.all([
    Notice.find()
      .populate("postedBy", "name")
      .sort({ isPinned: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Notice.countDocuments(),
  ]);

  sendResponse(res, 200, "Notices fetched successfully", notices, buildMeta(page, limit, total));
});

/**
 * @desc   List notices visible to the logged-in student — audience "all",
 *         or audience "class" matching their own class, excludes expired.
 *         The student's class is looked up server-side from their own
 *         Student record rather than trusted from a query param, so a
 *         student can't spoof another class's notices.
 * @route  GET /api/notices/my
 * @access Private/Student
 */
export const getMyNotices = asyncHandler(async (req, res) => {
  const studentProfile = await Student.findOne({ user: req.user._id }).select("class");
  const studentClass = studentProfile?.class;

  const notices = await Notice.find({
    $and: [
      { $or: [{ audience: "all" }, { audience: "class", targetClass: studentClass }] },
      { $or: [{ expiryDate: null }, { expiryDate: { $gte: new Date() } }] },
    ],
  })
    .populate("postedBy", "name")
    .sort({ isPinned: -1, createdAt: -1 });

  sendResponse(res, 200, "Notices fetched successfully", notices);
});
