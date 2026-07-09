import asyncHandler from "express-async-handler";
import Attendance from "../models/Attendance.js";
import Student from "../models/Student.js";
import { sendResponse } from "../utils/apiResponse.js";

/**
 * Ensures a student-role caller can only ever access their own records.
 * Admins bypass this check entirely. Sets a 403 and throws on mismatch —
 * the shared errorMiddleware reads the status from res.statusCode, so it
 * must be set here before throwing.
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
 * @desc   Mark attendance for an entire class/section on a given date in
 *         one call (upserts — re-marking the same day updates the record
 *         instead of erroring, which matters if a teacher corrects a
 *         mistake before the "edit" endpoint is used).
 *
 *         NOTE: uses find-or-build + .save() rather than
 *         findOneAndUpdate(..., { upsert: true }) — see the comment on
 *         addMarks in marksController.js for why: findOneAndUpdate skips
 *         pre('validate') document middleware, which is what normalizes
 *         the date to UTC midnight on this model.
 * @route  POST /api/attendance/mark
 * @body   { date, class, section, records: [{ student, status, remarks }] }
 * @access Private/Admin
 */
export const markAttendance = asyncHandler(async (req, res) => {
  const { date, class: className, section, records } = req.body;

  if (!Array.isArray(records) || records.length === 0) {
    res.status(400);
    throw new Error("At least one attendance record is required");
  }

  const dayStart = new Date(date);
  dayStart.setUTCHours(0, 0, 0, 0);

  const results = await Promise.all(
    records.map(async ({ student, status, remarks }) => {
      let record = await Attendance.findOne({ student, date: dayStart });
      if (record) {
        record.status = status;
        record.remarks = remarks || "";
        record.class = className;
        record.section = section;
        record.markedBy = req.user._id;
      } else {
        record = new Attendance({
          student,
          date: dayStart,
          status,
          remarks: remarks || "",
          class: className,
          section,
          markedBy: req.user._id,
        });
      }
      await record.save();
      return record;
    })
  );

  sendResponse(res, 200, `Attendance marked for ${results.length} student(s)`, results);
});

/**
 * @desc   Edit a single attendance record
 * @route  PUT /api/attendance/:id
 * @access Private/Admin
 */
export const updateAttendance = asyncHandler(async (req, res) => {
  const { status, remarks } = req.body;

  const record = await Attendance.findById(req.params.id);
  if (!record) {
    res.status(404);
    throw new Error("Attendance record not found");
  }

  record.status = status || record.status;
  if (remarks !== undefined) record.remarks = remarks;
  record.markedBy = req.user._id;
  await record.save();

  sendResponse(res, 200, "Attendance updated successfully", record);
});

/**
 * @desc   Get attendance for a specific class/section on a specific date
 *         (used to populate the "mark attendance" grid, pre-filled if
 *         already marked)
 * @route  GET /api/attendance?class=&section=&date=
 * @access Private/Admin
 */
export const getAttendanceByClassDate = asyncHandler(async (req, res) => {
  const { class: className, section, date } = req.query;

  if (!className || !section || !date) {
    res.status(400);
    throw new Error("class, section, and date query params are required");
  }

  const students = await Student.find({ class: className, section, status: "active" })
    .populate("profile", "name email profileImage")
    .sort({ rollNumber: 1 });

  const dayStart = new Date(date);
  dayStart.setUTCHours(0, 0, 0, 0);

  const existingRecords = await Attendance.find({
    class: className,
    section,
    date: dayStart,
  });
  const recordMap = new Map(existingRecords.map((r) => [r.student.toString(), r]));

  const merged = students.map((student) => ({
    student,
    attendance: recordMap.get(student._id.toString()) || null,
  }));

  sendResponse(res, 200, "Attendance grid fetched successfully", merged);
});

/**
 * @desc   Monthly attendance report for a class/section — per-student
 *         present/absent/late counts and attendance percentage.
 * @route  GET /api/attendance/monthly-report?class=&section=&month=&year=
 * @access Private/Admin
 */
export const getMonthlyReport = asyncHandler(async (req, res) => {
  const { class: className, section, month, year } = req.query;

  if (!className || !section || !month || !year) {
    res.status(400);
    throw new Error("class, section, month, and year query params are required");
  }

  const startDate = new Date(Date.UTC(Number(year), Number(month) - 1, 1));
  const endDate = new Date(Date.UTC(Number(year), Number(month), 0, 23, 59, 59));

  const students = await Student.find({ class: className, section }).populate("profile", "name");

  const report = await Promise.all(
    students.map(async (student) => {
      const records = await Attendance.find({
        student: student._id,
        date: { $gte: startDate, $lte: endDate },
      });

      const totalMarked = records.length;
      const present = records.filter((r) => r.status === "present").length;
      const absent = records.filter((r) => r.status === "absent").length;
      const late = records.filter((r) => r.status === "late").length;
      const halfDay = records.filter((r) => r.status === "half-day").length;
      // Half-day counts as 0.5 present for percentage purposes
      const effectivePresent = present + late + halfDay * 0.5;
      const percentage = totalMarked > 0 ? Number(((effectivePresent / totalMarked) * 100).toFixed(1)) : 0;

      return {
        student: { id: student._id, studentId: student.studentId, name: student.profile?.name },
        totalMarked,
        present,
        absent,
        late,
        halfDay,
        percentage,
      };
    })
  );

  sendResponse(res, 200, "Monthly attendance report generated", report);
});

/**
 * @desc   A single student's overall attendance percentage + recent history
 *         (used by both the admin's student-view page and the student's
 *         own dashboard)
 * @route  GET /api/attendance/student/:studentId
 * @access Private/Admin, Private/Student (own record — enforced in route)
 */
export const getStudentAttendance = asyncHandler(async (req, res) => {
  await assertOwnRecordOrAdmin(req, res, req.params.studentId);

  const records = await Attendance.find({ student: req.params.studentId }).sort({ date: -1 });

  const total = records.length;
  const present = records.filter((r) => r.status === "present" || r.status === "late").length;
  const halfDay = records.filter((r) => r.status === "half-day").length;
  const percentage = total > 0 ? Number((((present + halfDay * 0.5) / total) * 100).toFixed(1)) : 0;

  sendResponse(res, 200, "Attendance history fetched successfully", {
    percentage,
    totalDaysMarked: total,
    history: records.slice(0, 30), // most recent 30 records
  });
});
