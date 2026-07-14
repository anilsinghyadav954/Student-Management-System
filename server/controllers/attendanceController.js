import asyncHandler from "express-async-handler";
import Attendance from "../models/Attendance.js";
import Student from "../models/Student.js";
import Holiday from "../models/Holiday.js";
import { sendResponse } from "../utils/apiResponse.js";
import { getNonWorkingDayInfo, isSunday, toMidnightUTC } from "../utils/workingDayUtils.js";
import { exportAttendancePDF, exportAttendanceExcel } from "../utils/attendanceExportUtils.js";

const assertOwnRecordOrAdmin = async (req, res, studentId) => {
  if (req.user.role === "admin") return;
  const ownStudent = await Student.findOne({ user: req.user._id }).select("_id");
  if (!ownStudent || ownStudent._id.toString() !== studentId) {
    res.status(403);
    throw new Error("You are not authorized to view this student's records");
  }
};

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const getMonthWorkingDayInfo = async (month, year) => {
  const daysInMonth = new Date(Number(year), Number(month), 0).getDate();
  const activeHolidays = await Holiday.find({
    date: {
      $gte: new Date(Date.UTC(Number(year), Number(month) - 1, 1)),
      $lte: new Date(Date.UTC(Number(year), Number(month) - 1, daysInMonth, 23, 59, 59)),
    },
    status: "active",
  });
  const holidayDates = new Set(activeHolidays.map((h) => h.date.toISOString().split("T")[0]));

  let sundayCount = 0;
  for (let d = 1; d <= daysInMonth; d++) {
    const day = new Date(Date.UTC(Number(year), Number(month) - 1, d));
    if (isSunday(day)) sundayCount++;
  }

  const holidayCount = holidayDates.size;
  const workingDaysInMonth = daysInMonth - sundayCount - holidayCount;

  return { daysInMonth, sundayCount, holidayCount, holidayDates, workingDaysInMonth, activeHolidays };
};

export const markAttendance = asyncHandler(async (req, res) => {
  const { date, class: className, section, records } = req.body;

  if (!Array.isArray(records) || records.length === 0) {
    res.status(400);
    throw new Error("At least one attendance record is required");
  }

  const nonWorkingInfo = await getNonWorkingDayInfo(date);
  if (nonWorkingInfo.blocked) {
    return res.status(400).json({
      success: false,
      message: "Attendance cannot be marked on a non-working day",
      data: {
        attendanceDisabled: true,
        reason: nonWorkingInfo.reason,
        title: nonWorkingInfo.title,
        description: nonWorkingInfo.description,
      },
    });
  }

  const dayStart = toMidnightUTC(date);

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

export const getAttendanceByClassDate = asyncHandler(async (req, res) => {
  const { class: className, section, date } = req.query;

  if (!className || !section || !date) {
    res.status(400);
    throw new Error("class, section, and date query params are required");
  }

  const nonWorkingInfo = await getNonWorkingDayInfo(date);

  const students = await Student.find({ class: className, section, status: "active" })
    .populate("profile", "name email profileImage")
    .sort({ rollNumber: 1 });

  const dayStart = toMidnightUTC(date);

  const existingRecords = await Attendance.find({ class: className, section, date: dayStart });
  const recordMap = new Map(existingRecords.map((r) => [r.student.toString(), r]));

  const merged = students.map((student) => ({
    student,
    attendance: recordMap.get(student._id.toString()) || null,
  }));

  sendResponse(res, 200, "Attendance grid fetched successfully", { rows: merged, nonWorkingInfo });
});

export const getMonthlyReport = asyncHandler(async (req, res) => {
  const { class: className, section, month, year } = req.query;

  if (!className || !section || !month || !year) {
    res.status(400);
    throw new Error("class, section, month, and year query params are required");
  }

  const { holidayDates, sundayCount, holidayCount, workingDaysInMonth } = await getMonthWorkingDayInfo(month, year);

  const startDate = new Date(Date.UTC(Number(year), Number(month) - 1, 1));
  const endDate = new Date(Date.UTC(Number(year), Number(month), 0, 23, 59, 59));

  const students = await Student.find({ class: className, section }).populate("profile", "name");

  const rows = await Promise.all(
    students.map(async (student) => {
      const allRecords = await Attendance.find({
        student: student._id,
        date: { $gte: startDate, $lte: endDate },
      });
      const records = allRecords.filter((r) => {
        const iso = r.date.toISOString().split("T")[0];
        return !isSunday(r.date) && !holidayDates.has(iso);
      });

      const present = records.filter((r) => r.status === "present").length;
      const absent = records.filter((r) => r.status === "absent").length;
      const late = records.filter((r) => r.status === "late").length;
      const halfDay = records.filter((r) => r.status === "half-day").length;
      const leave = records.filter((r) => r.status === "leave").length;

      const effectivePresent = present + late + halfDay * 0.5;
      const percentage = workingDaysInMonth > 0 ? Number(((effectivePresent / workingDaysInMonth) * 100).toFixed(1)) : 0;

      return {
        student: { id: student._id, studentId: student.studentId, name: student.profile?.name },
        rollNumber: student.rollNumber,
        name: student.profile?.name,
        present,
        absent,
        leave,
        late,
        halfDay,
        holidayCount,
        sundayCount,
        workingDays: workingDaysInMonth,
        percentage,
      };
    })
  );

  sendResponse(res, 200, "Monthly attendance report generated", {
    rows,
    meta: {
      class: className,
      section,
      month: Number(month),
      year: Number(year),
      monthName: MONTH_NAMES[Number(month) - 1],
      sundayCount,
      holidayCount,
      workingDaysInMonth,
    },
  });
});

export const exportMonthlyReportPDF = asyncHandler(async (req, res) => {
  const { class: className, section, month, year } = req.query;
  const { holidayDates, sundayCount, holidayCount, workingDaysInMonth } = await getMonthWorkingDayInfo(month, year);
  const startDate = new Date(Date.UTC(Number(year), Number(month) - 1, 1));
  const endDate = new Date(Date.UTC(Number(year), Number(month), 0, 23, 59, 59));

  const students = await Student.find({ class: className, section }).populate("profile", "name");
  const rows = await Promise.all(
    students.map(async (student) => {
      const allRecords = await Attendance.find({ student: student._id, date: { $gte: startDate, $lte: endDate } });
      const records = allRecords.filter((r) => {
        const iso = r.date.toISOString().split("T")[0];
        return !isSunday(r.date) && !holidayDates.has(iso);
      });
      const present = records.filter((r) => r.status === "present").length;
      const absent = records.filter((r) => r.status === "absent").length;
      const leave = records.filter((r) => r.status === "leave").length;
      const late = records.filter((r) => r.status === "late").length;
      const halfDay = records.filter((r) => r.status === "half-day").length;
      const effectivePresent = present + late + halfDay * 0.5;
      const percentage = workingDaysInMonth > 0 ? Number(((effectivePresent / workingDaysInMonth) * 100).toFixed(1)) : 0;
      return {
        rollNumber: student.rollNumber,
        name: student.profile?.name,
        present, absent, leave, holidayCount, sundayCount, workingDays: workingDaysInMonth, percentage,
      };
    })
  );

  exportAttendancePDF(res, {
    class: className, section, month, year, monthName: MONTH_NAMES[Number(month) - 1], workingDaysInMonth,
  }, rows);
});

export const exportMonthlyReportExcel = asyncHandler(async (req, res) => {
  const { class: className, section, month, year } = req.query;
  const { holidayDates, sundayCount, holidayCount, workingDaysInMonth } = await getMonthWorkingDayInfo(month, year);
  const startDate = new Date(Date.UTC(Number(year), Number(month) - 1, 1));
  const endDate = new Date(Date.UTC(Number(year), Number(month), 0, 23, 59, 59));

  const students = await Student.find({ class: className, section }).populate("profile", "name");
  const rows = await Promise.all(
    students.map(async (student) => {
      const allRecords = await Attendance.find({ student: student._id, date: { $gte: startDate, $lte: endDate } });
      const records = allRecords.filter((r) => {
        const iso = r.date.toISOString().split("T")[0];
        return !isSunday(r.date) && !holidayDates.has(iso);
      });
      const present = records.filter((r) => r.status === "present").length;
      const absent = records.filter((r) => r.status === "absent").length;
      const leave = records.filter((r) => r.status === "leave").length;
      const late = records.filter((r) => r.status === "late").length;
      const halfDay = records.filter((r) => r.status === "half-day").length;
      const effectivePresent = present + late + halfDay * 0.5;
      const percentage = workingDaysInMonth > 0 ? Number(((effectivePresent / workingDaysInMonth) * 100).toFixed(1)) : 0;
      return {
        rollNumber: student.rollNumber,
        name: student.profile?.name,
        present, absent, leave, holidayCount, sundayCount, workingDays: workingDaysInMonth, percentage,
      };
    })
  );

  await exportAttendanceExcel(res, {
    class: className, section, month, year, monthName: MONTH_NAMES[Number(month) - 1], workingDaysInMonth,
  }, rows);
});

export const getAttendanceCalendar = asyncHandler(async (req, res) => {
  await assertOwnRecordOrAdmin(req, res, req.params.studentId);
  const { month, year } = req.query;

  const { daysInMonth, holidayDates, activeHolidays } = await getMonthWorkingDayInfo(month, year);
  const holidayByDate = new Map(activeHolidays.map((h) => [h.date.toISOString().split("T")[0], h]));

  const startDate = new Date(Date.UTC(Number(year), Number(month) - 1, 1));
  const endDate = new Date(Date.UTC(Number(year), Number(month), 0, 23, 59, 59));
  const records = await Attendance.find({ student: req.params.studentId, date: { $gte: startDate, $lte: endDate } });
  const recordByDate = new Map(records.map((r) => [r.date.toISOString().split("T")[0], r]));

  const days = [];
  for (let d = 1; d <= daysInMonth; d++) {
    const dateObj = new Date(Date.UTC(Number(year), Number(month) - 1, d));
    const iso = dateObj.toISOString().split("T")[0];

    if (isSunday(dateObj)) {
      days.push({ date: iso, status: "sunday" });
    } else if (holidayDates.has(iso)) {
      const h = holidayByDate.get(iso);
      days.push({ date: iso, status: "holiday", title: h.title, reason: h.reason, notes: h.notes });
    } else {
      const record = recordByDate.get(iso);
      days.push({ date: iso, status: record ? record.status : null });
    }
  }

  sendResponse(res, 200, "Attendance calendar fetched successfully", { days });
});

export const getStudentAttendance = asyncHandler(async (req, res) => {
  await assertOwnRecordOrAdmin(req, res, req.params.studentId);

  const allRecords = await Attendance.find({ student: req.params.studentId }).sort({ date: -1 });
  const activeHolidays = await Holiday.find({ status: "active" });
  const holidayDates = new Set(activeHolidays.map((h) => h.date.toISOString().split("T")[0]));

  const records = allRecords.filter((r) => {
    const iso = r.date.toISOString().split("T")[0];
    return !isSunday(r.date) && !holidayDates.has(iso);
  });

  const total = records.length;
  const present = records.filter((r) => r.status === "present" || r.status === "late").length;
  const halfDay = records.filter((r) => r.status === "half-day").length;
  const percentage = total > 0 ? Number((((present + halfDay * 0.5) / total) * 100).toFixed(1)) : 0;

  sendResponse(res, 200, "Attendance history fetched successfully", {
    percentage,
    totalDaysMarked: total,
    history: records.slice(0, 30),
  });
});