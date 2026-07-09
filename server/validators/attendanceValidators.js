import { body, param } from "express-validator";

export const markAttendanceRules = [
  body("date").isISO8601().withMessage("Enter a valid date"),
  body("class").trim().notEmpty().withMessage("Class is required"),
  body("section").trim().notEmpty().withMessage("Section is required"),
  body("records").isArray({ min: 1 }).withMessage("At least one record is required"),
  body("records.*.student").isMongoId().withMessage("Invalid student id in records"),
  body("records.*.status")
    .isIn(["present", "absent", "late", "half-day"])
    .withMessage("Invalid attendance status in records"),
];

export const updateAttendanceRules = [
  param("id").isMongoId().withMessage("Invalid attendance record id"),
  body("status")
    .optional()
    .isIn(["present", "absent", "late", "half-day"])
    .withMessage("Invalid attendance status"),
];
