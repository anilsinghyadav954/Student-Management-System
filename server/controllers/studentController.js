import asyncHandler from "express-async-handler";
import User from "../models/User.js";
import Student from "../models/Student.js";
import Attendance from "../models/Attendance.js";
import Marks from "../models/Marks.js";
import { sendResponse, getPagination, buildMeta } from "../utils/apiResponse.js";
import { exportStudentsPDF, exportStudentsExcel } from "../utils/exportUtils.js";
import { uploadToCloudinary, deleteFromCloudinary } from "../middleware/uploadMiddleware.js";

/**
 * Generates a readable, sequential student ID like "SMS-2026-0001".
 * Retries on a rare race-condition duplicate (two admins creating a
 * student in the same instant) rather than using a heavier distributed
 * counter, which would be overkill for this app's scale.
 */
const generateStudentId = async () => {
  const year = new Date().getFullYear();
  const count = await Student.countDocuments({
    studentId: new RegExp(`^SMS-${year}-`),
  });
  const sequence = String(count + 1).padStart(4, "0");
  return `SMS-${year}-${sequence}`;
};

/**
 * @desc   Get the logged-in student's own academic profile — the frontend
 *         uses this to discover their Student._id, which is then used to
 *         call the attendance/marks "own record" endpoints.
 * @route  GET /api/students/me/profile
 * @access Private/Student
 */
export const getMyStudentProfile = asyncHandler(async (req, res) => {
  const student = await Student.findOne({ user: req.user._id }).populate(
    "profile",
    "name email phone profileImage"
  );

  if (!student) {
    res.status(404);
    throw new Error("Student profile not found for this account");
  }

  sendResponse(res, 200, "Profile fetched successfully", student);
});

/**
 * @desc   Create a new student — creates both the User (auth) account
 *         and the Student (academic profile) records together.
 * @route  POST /api/students
 * @access Private/Admin
 */
export const createStudent = asyncHandler(async (req, res) => {
  const {
    name,
    email,
    password,
    phone,
    class: className,
    section,
    rollNumber,
    dateOfBirth,
    gender,
    bloodGroup,
    address,
    guardian,
  } = req.body;

  const existingUser = await User.findOne({ email: email.toLowerCase() });
  if (existingUser) {
    res.status(400);
    throw new Error("A user with this email already exists");
  }

  const user = await User.create({
    name,
    email,
    password,
    phone,
    role: "student",
  });

  let studentId;
  let student;
  // Retry loop guards against the rare case of two students being
  // created in the same millisecond generating the same sequence number.
  for (let attempt = 0; attempt < 3; attempt++) {
    studentId = await generateStudentId();
    try {
      student = await Student.create({
        user: user._id,
        studentId,
        class: className,
        section,
        rollNumber,
        dateOfBirth,
        gender,
        bloodGroup,
        address,
        guardian,
      });
      break;
    } catch (error) {
      if (error.code === 11000 && attempt < 2) continue; // retry
      await User.findByIdAndDelete(user._id); // rollback the orphaned user
      throw error;
    }
  }

  const populated = await Student.findById(student._id).populate("profile", "name email phone profileImage");
  sendResponse(res, 201, "Student created successfully", populated);
});

/**
 * @desc   List students with search, filters, and pagination
 * @route  GET /api/students?search=&class=&section=&status=&page=&limit=
 * @access Private/Admin
 */
export const getStudents = asyncHandler(async (req, res) => {
  const { search, class: className, section, status } = req.query;
  const { page, limit, skip } = getPagination(req.query);

  const filter = {};
  if (className) filter.class = className;
  if (section) filter.section = section;
  if (status) filter.status = status;

  // Search matches studentId/rollNumber directly, or the linked user's
  // name/email via a two-step lookup (Mongoose can't $or across a populate).
  if (search) {
    const matchingUsers = await User.find({
      role: "student",
      $or: [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ],
    }).select("_id");

    filter.$or = [
      { studentId: { $regex: search, $options: "i" } },
      { rollNumber: { $regex: search, $options: "i" } },
      { user: { $in: matchingUsers.map((u) => u._id) } },
    ];
  }

  const [students, total] = await Promise.all([
    Student.find(filter)
      .populate("profile", "name email phone profileImage isActive")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Student.countDocuments(filter),
  ]);

  sendResponse(res, 200, "Students fetched successfully", students, buildMeta(page, limit, total));
});

/**
 * @desc   Get a single student's full profile
 * @route  GET /api/students/:id
 * @access Private/Admin, Private/Student (own record only — enforced in route)
 */
export const getStudentById = asyncHandler(async (req, res) => {
  const student = await Student.findById(req.params.id).populate(
    "profile",
    "name email phone profileImage isActive lastLogin"
  );

  if (!student) {
    res.status(404);
    throw new Error("Student not found");
  }

  sendResponse(res, 200, "Student fetched successfully", student);
});

/**
 * @desc   Update a student's academic profile (and optionally linked user fields)
 * @route  PUT /api/students/:id
 * @access Private/Admin
 */
export const updateStudent = asyncHandler(async (req, res) => {
  const student = await Student.findById(req.params.id);
  if (!student) {
    res.status(404);
    throw new Error("Student not found");
  }

  const {
    name,
    phone,
    class: className,
    section,
    rollNumber,
    dateOfBirth,
    gender,
    bloodGroup,
    address,
    guardian,
    status,
  } = req.body;

  // Update linked User fields (name/phone) if provided
  if (name || phone) {
    await User.findByIdAndUpdate(student.user, {
      ...(name && { name }),
      ...(phone && { phone }),
    });
  }

  Object.assign(student, {
    ...(className && { class: className }),
    ...(section && { section }),
    ...(rollNumber && { rollNumber }),
    ...(dateOfBirth && { dateOfBirth }),
    ...(gender && { gender }),
    ...(bloodGroup !== undefined && { bloodGroup }),
    ...(address && { address }),
    ...(guardian && { guardian }),
    ...(status && { status }),
  });

  await student.save();

  const updated = await Student.findById(student._id).populate("profile", "name email phone profileImage");
  sendResponse(res, 200, "Student updated successfully", updated);
});

/**
 * @desc   Delete a student — removes the Student profile, linked User
 *         account, and cascades to their Attendance/Marks records so
 *         no orphaned data is left behind.
 * @route  DELETE /api/students/:id
 * @access Private/Admin
 */
export const deleteStudent = asyncHandler(async (req, res) => {
  const student = await Student.findById(req.params.id);
  if (!student) {
    res.status(404);
    throw new Error("Student not found");
  }

  const user = await User.findById(student.user);

  await Promise.all([
    Attendance.deleteMany({ student: student._id }),
    Marks.deleteMany({ student: student._id }),
    Student.findByIdAndDelete(student._id),
    User.findByIdAndDelete(student.user),
  ]);

  if (user?.profileImage?.publicId) {
    await deleteFromCloudinary(user.profileImage.publicId);
  }

  sendResponse(res, 200, "Student and all associated records deleted successfully");
});

/**
 * @desc   Admin uploads/replaces a student's profile photo
 * @route  PUT /api/students/:id/photo
 * @access Private/Admin
 */
export const updateStudentPhoto = asyncHandler(async (req, res) => {
  if (!req.file) {
    res.status(400);
    throw new Error("No image file provided");
  }

  const student = await Student.findById(req.params.id);
  if (!student) {
    res.status(404);
    throw new Error("Student not found");
  }

  const user = await User.findById(student.user);
  if (user.profileImage?.publicId) {
    await deleteFromCloudinary(user.profileImage.publicId);
  }

  const result = await uploadToCloudinary(req.file.buffer, "sms/students");
  user.profileImage = { url: result.secure_url, publicId: result.public_id };
  await user.save({ validateBeforeSave: false });

  sendResponse(res, 200, "Profile photo updated successfully", { profileImage: user.profileImage });
});

/**
 * @desc   Export the (filtered) student list as PDF or Excel
 * @route  GET /api/students/export?format=pdf|excel&...same filters as getStudents
 * @access Private/Admin
 */
export const exportStudents = asyncHandler(async (req, res) => {
  const { format, search, class: className, section, status } = req.query;

  const filter = {};
  if (className) filter.class = className;
  if (section) filter.section = section;
  if (status) filter.status = status;

  const students = await Student.find(filter)
    .populate("profile", "name email phone")
    .sort({ createdAt: -1 });

  if (format === "excel") {
    return exportStudentsExcel(res, students);
  }
  return exportStudentsPDF(res, students);
});
