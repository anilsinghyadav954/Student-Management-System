import express from "express";
import {
  markAttendance,
  updateAttendance,
  getAttendanceByClassDate,
  getMonthlyReport,
  getStudentAttendance,
} from "../controllers/attendanceController.js";
import { protect, authorize } from "../middleware/authMiddleware.js";
import { validate } from "../middleware/validateMiddleware.js";
import { markAttendanceRules, updateAttendanceRules } from "../validators/attendanceValidators.js";

const router = express.Router();

router.use(protect);

// A student may view their own attendance history; everything else is admin-only.
router.get("/student/:studentId", getStudentAttendance);

router.use(authorize("admin"));
router.get("/", getAttendanceByClassDate);
router.get("/monthly-report", getMonthlyReport);
router.post("/mark", markAttendanceRules, validate, markAttendance);
router.put("/:id", updateAttendanceRules, validate, updateAttendance);

export default router;
