import { body, query } from "express-validator";

export const createHolidayRules = [
  body("date").isISO8601().withMessage("Enter a valid date"),
  body("title").trim().notEmpty().withMessage("Title is required").isLength({ max: 100 }),
  body("reason").trim().notEmpty().withMessage("Reason/description is required").isLength({ max: 500 }),
  body("notes").optional().trim().isLength({ max: 500 }),
  body("status").optional().isIn(["active", "inactive"]).withMessage("Status must be active or inactive"),
];

export const updateHolidayRules = [
  body("date").optional().isISO8601().withMessage("Enter a valid date"),
  body("title").optional().trim().notEmpty().withMessage("Title cannot be empty").isLength({ max: 100 }),
  body("reason").optional().trim().notEmpty().withMessage("Reason cannot be empty").isLength({ max: 500 }),
  body("notes").optional().trim().isLength({ max: 500 }),
  body("status").optional().isIn(["active", "inactive"]).withMessage("Status must be active or inactive"),
];

export const monthQueryRules = [
  query("month").isInt({ min: 1, max: 12 }).withMessage("Enter a valid month (1-12)"),
  query("year").isInt({ min: 2000 }).withMessage("Enter a valid year"),
];

export const dateQueryRules = [query("date").isISO8601().withMessage("Enter a valid date")];