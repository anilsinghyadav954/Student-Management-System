import asyncHandler from "express-async-handler";
import Marks from "../models/Marks.js";
import Student from "../models/Student.js";
import { sendResponse } from "../utils/apiResponse.js";

/**
 * Ensures a student-role caller can only ever access their own marks.
 * Admins bypass this check entirely.
 */
const assertOwnRecordOrAdmin = async (req, res, studentId) => {
  if (req.user.role === "admin") return;
  const ownStudent = await Student.findOne({ user: req.user._id }).select("_id");
  if (!ownStudent || ownStudent._id.toString() !== studentId) {
    res.status(403);
    throw new Error("You are not authorized to view this student's records");
  }
};

/**
 * @desc   Add marks for a student in a subject/exam. Upserts so re-entering
 *         marks for the same student+subject+exam+year corrects the
 *         existing entry rather than throwing a duplicate-key error.
 *
 *         NOTE: this deliberately uses find-or-build + .save() rather than
 *         findOneAndUpdate(..., { upsert: true }). Mongoose does NOT run
 *         pre('validate') document middleware for findOneAndUpdate, even
 *         with runValidators: true — that option only re-runs schema-level
 *         validators (required/min/max), not custom hooks. Since the grade
 *         auto-calculation lives in a pre('validate') hook on the Marks
 *         model, findOneAndUpdate would silently leave `grade` unset.
 * @route  POST /api/marks
 * @access Private/Admin
 */
export const addMarks = asyncHandler(async (req, res) => {
  const { student, subject, examType, academicYear, marksObtained, totalMarks, remarks } = req.body;

  const studentExists = await Student.findById(student);
  if (!studentExists) {
    res.status(404);
    throw new Error("Student not found");
  }

  let record = await Marks.findOne({ student, subject, examType, academicYear });
  if (record) {
    record.marksObtained = marksObtained;
    record.totalMarks = totalMarks;
    if (remarks !== undefined) record.remarks = remarks;
    record.addedBy = req.user._id;
  } else {
    record = new Marks({ student, subject, examType, academicYear, marksObtained, totalMarks, remarks, addedBy: req.user._id });
  }
  await record.save(); // triggers pre('validate') -> grade calculation + the marksObtained<=totalMarks check

  sendResponse(res, 201, "Marks recorded successfully", record);
});

/**
 * @desc   Edit an existing marks entry
 * @route  PUT /api/marks/:id
 * @access Private/Admin
 */
export const updateMarks = asyncHandler(async (req, res) => {
  const { marksObtained, totalMarks, remarks } = req.body;

  const record = await Marks.findById(req.params.id);
  if (!record) {
    res.status(404);
    throw new Error("Marks record not found");
  }

  if (marksObtained !== undefined) record.marksObtained = marksObtained;
  if (totalMarks !== undefined) record.totalMarks = totalMarks;
  if (remarks !== undefined) record.remarks = remarks;
  record.addedBy = req.user._id;
  await record.save();

  sendResponse(res, 200, "Marks updated successfully", record);
});

/**
 * @desc   Delete a marks entry
 * @route  DELETE /api/marks/:id
 * @access Private/Admin
 */
export const deleteMarks = asyncHandler(async (req, res) => {
  const record = await Marks.findByIdAndDelete(req.params.id);
  if (!record) {
    res.status(404);
    throw new Error("Marks record not found");
  }
  sendResponse(res, 200, "Marks record deleted successfully");
});

/**
 * @desc   Get all subject-wise marks for a student, optionally filtered
 *         by academic year/exam type, plus an overall summary.
 * @route  GET /api/marks/student/:studentId?academicYear=&examType=
 * @access Private/Admin, Private/Student (own record — enforced in route)
 */
export const getStudentMarks = asyncHandler(async (req, res) => {
  await assertOwnRecordOrAdmin(req, res, req.params.studentId);

  const { academicYear, examType } = req.query;
  const filter = { student: req.params.studentId };
  if (academicYear) filter.academicYear = academicYear;
  if (examType) filter.examType = examType;

  const records = await Marks.find(filter).sort({ subject: 1 });

  const totalObtained = records.reduce((sum, r) => sum + r.marksObtained, 0);
  const totalMax = records.reduce((sum, r) => sum + r.totalMarks, 0);
  const overallPercentage = totalMax > 0 ? Number(((totalObtained / totalMax) * 100).toFixed(2)) : 0;

  sendResponse(res, 200, "Marks fetched successfully", {
    records,
    summary: {
      subjectCount: records.length,
      totalObtained,
      totalMax,
      overallPercentage,
    },
  });
});
