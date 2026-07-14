import express from "express";
import {
  markAttendance,
  updateAttendance,
  getAttendanceByClassDate,
  getMonthlyReport,
  getStudentAttendance,
  getAttendanceCalendar,
  exportMonthlyReportPDF,
  exportMonthlyReportExcel,
} from "../controllers/attendanceController.js";
import { protect, authorize } from "../middleware/authMiddleware.js";
import { validate } from "../middleware/validateMiddleware.js";
import {
  markAttendanceRules,
  updateAttendanceRules,
  monthYearQueryRules,
} from "../validators/attendanceValidators.js";

const router = express.Router();

router.use(protect);

// A student may view their own attendance/calendar; everything else is admin-only.
router.get("/student/:studentId", getStudentAttendance);
router.get("/calendar/:studentId", monthYearQueryRules, validate, getAttendanceCalendar);

router.use(authorize("admin"));
router.get("/", getAttendanceByClassDate);
router.get("/monthly-report", monthYearQueryRules, validate, getMonthlyReport);
router.get("/export/pdf", monthYearQueryRules, validate, exportMonthlyReportPDF);
router.get("/export/excel", monthYearQueryRules, validate, exportMonthlyReportExcel);
router.post("/mark", markAttendanceRules, validate, markAttendance);
router.put("/:id", updateAttendanceRules, validate, updateAttendance);

export default router;