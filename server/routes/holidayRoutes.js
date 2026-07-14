import express from "express";
import {
  createHoliday,
  updateHoliday,
  deleteHoliday,
  getHolidays,
  getHolidaysForMonth,
  checkDateStatus,
} from "../controllers/holidayController.js";
import { protect, authorize } from "../middleware/authMiddleware.js";
import { validate } from "../middleware/validateMiddleware.js";
import {
  createHolidayRules,
  updateHolidayRules,
  monthQueryRules,
  dateQueryRules,
} from "../validators/holidayValidators.js";

const router = express.Router();

router.use(protect);

// Any authenticated user (admin or student) can read holiday data — a
// student's calendar view needs to know which days were holidays too.
router.get("/month", monthQueryRules, validate, getHolidaysForMonth);

router.use(authorize("admin"));
router.get("/", getHolidays);
router.get("/check", dateQueryRules, validate, checkDateStatus);
router.post("/", createHolidayRules, validate, createHoliday);
router.put("/:id", updateHolidayRules, validate, updateHoliday);
router.delete("/:id", deleteHoliday);

export default router;