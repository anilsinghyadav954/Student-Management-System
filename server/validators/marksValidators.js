import { body, param } from "express-validator";

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
