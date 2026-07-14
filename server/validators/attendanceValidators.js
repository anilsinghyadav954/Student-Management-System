import { body, param, query } from "express-validator";

export const markAttendanceRules = [
  body("date").isISO8601().withMessage("Enter a valid date"),
  body("class").trim().notEmpty().withMessage("Class is required"),
  body("section").trim().notEmpty().withMessage("Section is required"),
  body("records").isArray({ min: 1 }).withMessage("At least one record is required"),
  body("records.*.student").isMongoId().withMessage("Invalid student id in records"),
  body("records.*.status")
    .isIn(["present", "absent", "late", "half-day", "leave"])
    .withMessage("Invalid attendance status in records"),
];

export const updateAttendanceRules = [
  param("id").isMongoId().withMessage("Invalid attendance record id"),
  body("status")
    .optional()
    .isIn(["present", "absent", "late", "half-day", "leave"])
    .withMessage("Invalid attendance status"),
];

export const monthYearQueryRules = [
  query("month").isInt({ min: 1, max: 12 }).withMessage("Enter a valid month (1-12)"),
  query("year").isInt({ min: 2000 }).withMessage("Enter a valid year"),
];