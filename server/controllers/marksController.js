import asyncHandler from "express-async-handler";
import Marks, { calculateGrade } from "../models/Marks.js";
import Student from "../models/Student.js";
import { sendResponse } from "../utils/apiResponse.js";
import { exportMarksPDF, exportMarksExcel } from "../utils/marksExportUtils.js";

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

// ============================================================================
// BULK MARKS ENTRY (additive feature — everything above this line is the
// original, untouched single-entry marks module)
// ============================================================================

/**
 * Builds the { rollNumber, studentId, name, fatherName } shape shared by
 * the bulk-entry grid and the result export, so both stay in sync.
 */
const toStudentSummary = (student) => ({
  studentDbId: student._id,
  rollNumber: student.rollNumber,
  studentId: student.studentId, // used as "Admission No." — see note in BulkMarksEntry.jsx
  name: student.profile?.name || "-",
  fatherName: student.guardian?.name || "-", // the Student model stores one general "guardian", used here as father/guardian name
});

/**
 * @desc   Fetch every active student in a class/section for the Bulk Marks
 *         Entry grid, pre-filled with any marks that already exist for the
 *         selected subject/exam/year (supports both create and edit in the
 *         same screen).
 * @route  GET /api/marks/bulk-grid?class=&section=&subject=&examType=&academicYear=
 * @access Private/Admin
 */
export const getBulkMarksGrid = asyncHandler(async (req, res) => {
  const { class: className, section, subject, examType, academicYear } = req.query;

  const students = await Student.find({ class: className, section, status: "active" })
    .populate("profile", "name")
    .sort({ rollNumber: 1 });

  const studentIds = students.map((s) => s._id);

  const existingMarks = await Marks.find({
    student: { $in: studentIds },
    subject,
    examType,
    academicYear,
  });
  const marksByStudent = new Map(existingMarks.map((m) => [m.student.toString(), m]));

  // If any existing record has a totalMarks value, surface it so the
  // frontend can pre-fill the "Total Marks" filter when re-opening an exam.
  const existingTotalMarks = existingMarks[0]?.totalMarks ?? null;
  const existingExamDate = existingMarks[0]?.examDate ?? null;

  const rows = students.map((student) => {
    const existing = marksByStudent.get(student._id.toString());
    return {
      ...toStudentSummary(student),
      marksObtained: existing ? existing.marksObtained : "",
      isAbsent: existing ? existing.isAbsent : false,
      hasExistingRecord: !!existing,
    };
  });

  sendResponse(res, 200, "Bulk marks grid fetched successfully", {
    rows,
    existingTotalMarks,
    existingExamDate,
  });
});

/**
 * @desc   Save marks for an entire class/section in one request.
 *
 *         Uses Marks.bulkWrite() for a single round trip regardless of
 *         class size (fast even for 100+ students, per the requirement).
 *
 *         IMPORTANT: bulkWrite (like findOneAndUpdate) does NOT run
 *         Mongoose's pre('validate') document middleware — that's what
 *         auto-calculates `grade` on the existing single-entry addMarks
 *         flow (see the comment on addMarks above). Since bulkWrite skips
 *         it entirely, this function computes marksObtained-bounds
 *         validation and grade itself in plain JS (reusing the exact same
 *         calculateGrade() function the model uses) before building the
 *         write operations, so every bulk-saved record ends up with
 *         correct data despite bypassing the hook.
 * @route  POST /api/marks/bulk
 * @access Private/Admin
 */
export const bulkSaveMarks = asyncHandler(async (req, res) => {
  const { class: className, section, subject, examType, academicYear, examDate, totalMarks, records } = req.body;

  // Validate every row against totalMarks up front — express-validator can
  // check each record's own shape, but "marksObtained <= totalMarks" needs
  // totalMarks (a sibling top-level field) compared against each array
  // item, which is done here instead.
  const rowErrors = [];
  records.forEach((r, index) => {
    if (!r.isAbsent) {
      if (r.marksObtained > totalMarks) {
        rowErrors.push({ index, message: `Marks obtained (${r.marksObtained}) cannot exceed total marks (${totalMarks})` });
      }
      if (r.marksObtained < 0) {
        rowErrors.push({ index, message: "Marks obtained cannot be negative" });
      }
    }
  });
  if (rowErrors.length > 0) {
    return res.status(400).json({
      success: false,
      message: "Some rows failed validation",
      errors: rowErrors.map((e) => ({ field: `records[${e.index}].marksObtained`, message: e.message })),
    });
  }

  // Defensive check: every student id in the payload actually exists.
  const studentIds = records.map((r) => r.student);
  const foundCount = await Student.countDocuments({ _id: { $in: studentIds } });
  if (foundCount !== studentIds.length) {
    res.status(400);
    throw new Error("One or more students in the request could not be found");
  }

  const operations = records.map((r) => {
    const marksObtained = r.isAbsent ? 0 : Number(r.marksObtained);
    const grade = r.isAbsent ? "-" : calculateGrade(marksObtained, totalMarks);

    return {
      updateOne: {
        filter: { student: r.student, subject, examType, academicYear },
        update: {
          // Fields that change on every save, including re-saves of an
          // already-existing record (edit mode).
          $set: {
            marksObtained,
            totalMarks,
            grade,
            isAbsent: !!r.isAbsent,
            examDate: examDate || undefined,
            class: className,
            section,
            addedBy: req.user._id,
          },
          // Fields that only make sense at creation time — these are also
          // the unique-index match keys, so they must never change on an
          // update (that would just be a different record).
          $setOnInsert: {
            student: r.student,
            subject,
            examType,
            academicYear,
          },
        },
        upsert: true,
      },
    };
  });

  const result = await Marks.bulkWrite(operations, { ordered: false });

  sendResponse(res, 200, `Saved marks for ${records.length} student(s)`, {
    matched: result.matchedCount,
    upserted: result.upsertedCount,
    modified: result.modifiedCount,
  });
});

/**
 * @desc   Fetch the full result table for Class + Section + Subject + Exam,
 *         used by the Result Export screen before generating PDF/Excel.
 * @route  GET /api/marks/export-data?class=&section=&subject=&examType=&academicYear=
 * @access Private/Admin
 */
export const getExportData = asyncHandler(async (req, res) => {
  const { class: className, section, subject, examType, academicYear } = req.query;

  const students = await Student.find({ class: className, section, status: "active" })
    .populate("profile", "name")
    .sort({ rollNumber: 1 });
  const studentIds = students.map((s) => s._id);

  const existingMarks = await Marks.find({ student: { $in: studentIds }, subject, examType, academicYear });
  const marksByStudent = new Map(existingMarks.map((m) => [m.student.toString(), m]));

  const rows = students.map((student) => {
    const existing = marksByStudent.get(student._id.toString());
    const summary = toStudentSummary(student);
    if (!existing) {
      // No marks entered yet for this student in this exam — shown as
      // "Absent"/no-data in the export rather than silently omitted, so
      // the admin can see who's missing marks.
      return { ...summary, marksObtained: 0, totalMarks: 0, percentage: 0, grade: "-", isAbsent: true };
    }
    return {
      ...summary,
      marksObtained: existing.marksObtained,
      totalMarks: existing.totalMarks,
      percentage: existing.percentage,
      grade: existing.grade,
      isAbsent: existing.isAbsent,
    };
  });

  const examDate = existingMarks[0]?.examDate || null;

  sendResponse(res, 200, "Result data fetched successfully", {
    meta: { class: className, section, subject, examType, examDate },
    rows,
  });
});

/**
 * @desc   Export the result table as a PDF (school header, table, footer)
 * @route  GET /api/marks/export/pdf?class=&section=&subject=&examType=&academicYear=
 * @access Private/Admin
 */
export const exportResultPDF = asyncHandler(async (req, res) => {
  const { class: className, section, subject, examType, academicYear } = req.query;

  const students = await Student.find({ class: className, section, status: "active" })
    .populate("profile", "name")
    .sort({ rollNumber: 1 });
  const studentIds = students.map((s) => s._id);
  const existingMarks = await Marks.find({ student: { $in: studentIds }, subject, examType, academicYear });
  const marksByStudent = new Map(existingMarks.map((m) => [m.student.toString(), m]));

  const rows = students.map((student) => {
    const existing = marksByStudent.get(student._id.toString());
    const summary = toStudentSummary(student);
    if (!existing) return { ...summary, marksObtained: 0, totalMarks: 0, percentage: 0, grade: "-", isAbsent: true };
    return {
      ...summary,
      marksObtained: existing.marksObtained,
      totalMarks: existing.totalMarks,
      percentage: existing.percentage,
      grade: existing.grade,
      isAbsent: existing.isAbsent,
    };
  });

  exportMarksPDF(
    res,
    { class: className, section, subject, examType, examDate: existingMarks[0]?.examDate },
    rows,
    req.user.name
  );
});

/**
 * @desc   Export the result table as Excel (.xlsx)
 * @route  GET /api/marks/export/excel?class=&section=&subject=&examType=&academicYear=
 * @access Private/Admin
 */
export const exportResultExcel = asyncHandler(async (req, res) => {
  const { class: className, section, subject, examType, academicYear } = req.query;

  const students = await Student.find({ class: className, section, status: "active" })
    .populate("profile", "name")
    .sort({ rollNumber: 1 });
  const studentIds = students.map((s) => s._id);
  const existingMarks = await Marks.find({ student: { $in: studentIds }, subject, examType, academicYear });
  const marksByStudent = new Map(existingMarks.map((m) => [m.student.toString(), m]));

  const rows = students.map((student) => {
    const existing = marksByStudent.get(student._id.toString());
    const summary = toStudentSummary(student);
    if (!existing) return { ...summary, marksObtained: 0, totalMarks: 0, percentage: 0, grade: "-", isAbsent: true };
    return {
      ...summary,
      marksObtained: existing.marksObtained,
      totalMarks: existing.totalMarks,
      percentage: existing.percentage,
      grade: existing.grade,
      isAbsent: existing.isAbsent,
    };
  });

  await exportMarksExcel(
    res,
    { class: className, section, subject, examType, examDate: existingMarks[0]?.examDate },
    rows,
    req.user.name
  );
});