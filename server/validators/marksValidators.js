import { body, param, query } from "express-validator";

export const addMarksRules = [
  body("student").isMongoId().withMessage("Invalid student id"),
  body("subject").trim().notEmpty().withMessage("Subject is required"),
  body("examType")
    .isIn(["Unit Test", "Mid Term", "Final Term", "Quiz", "Assignment"])
    .withMessage("Invalid exam type"),
  body("academicYear").trim().notEmpty().withMessage("Academic year is required"),
  body("marksObtained").isFloat({ min: 0 }).withMessage("Marks obtained must be a positive number"),
  body("totalMarks").isFloat({ min: 1 }).withMessage("Total marks must be at least 1"),
];

export const updateMarksRules = [
  param("id").isMongoId().withMessage("Invalid marks record id"),
  body("marksObtained").optional().isFloat({ min: 0 }).withMessage("Marks obtained must be a positive number"),
  body("totalMarks").optional().isFloat({ min: 1 }).withMessage("Total marks must be at least 1"),
];

// ---- Bulk Marks Entry (additive — existing rules above are untouched) ----

export const bulkMarksRules = [
  body("class").trim().notEmpty().withMessage("Class is required"),
  body("section").trim().notEmpty().withMessage("Section is required"),
  body("subject").trim().notEmpty().withMessage("Subject is required"),
  body("examType")
    .isIn(["Unit Test", "Mid Term", "Final Term", "Quiz", "Assignment"])
    .withMessage("Invalid exam type"),
  body("academicYear").trim().notEmpty().withMessage("Academic year is required"),
  body("totalMarks").isFloat({ min: 1 }).withMessage("Total marks must be at least 1"),
  body("examDate").optional().isISO8601().withMessage("Enter a valid exam date"),
  body("records").isArray({ min: 1 }).withMessage("At least one student record is required"),
  body("records.*.student").isMongoId().withMessage("Invalid student id in records"),
  body("records.*.isAbsent").optional().isBoolean().withMessage("isAbsent must be true or false"),
  body("records.*.marksObtained")
    .if(body("records.*.isAbsent").not().equals(true))
    .isFloat({ min: 0 })
    .withMessage("Marks obtained must be a positive number"),
];

export const bulkGridQueryRules = [
  query("class").trim().notEmpty().withMessage("Class is required"),
  query("section").trim().notEmpty().withMessage("Section is required"),
  query("subject").trim().notEmpty().withMessage("Subject is required"),
  query("examType")
    .isIn(["Unit Test", "Mid Term", "Final Term", "Quiz", "Assignment"])
    .withMessage("Invalid exam type"),
  query("academicYear").trim().notEmpty().withMessage("Academic year is required"),
];