import { body, param, query } from "express-validator";

export const createStudentRules = [
  body("name").trim().notEmpty().withMessage("Name is required"),
  body("email").trim().isEmail().withMessage("Enter a valid email address"),
  body("password").isLength({ min: 8 }).withMessage("Password must be at least 8 characters"),
  body("phone").optional().matches(/^[0-9]{10}$/).withMessage("Phone must be 10 digits"),
  body("class").trim().notEmpty().withMessage("Class is required"),
  body("section").trim().notEmpty().withMessage("Section is required"),
  body("rollNumber").trim().notEmpty().withMessage("Roll number is required"),
  body("dateOfBirth").isISO8601().withMessage("Enter a valid date of birth"),
  body("gender").isIn(["Male", "Female", "Other"]).withMessage("Invalid gender"),
  body("guardian.name").trim().notEmpty().withMessage("Guardian name is required"),
  body("guardian.phone").matches(/^[0-9]{10}$/).withMessage("Guardian phone must be 10 digits"),
];

export const updateStudentRules = [
  param("id").isMongoId().withMessage("Invalid student id"),
  body("phone").optional().matches(/^[0-9]{10}$/).withMessage("Phone must be 10 digits"),
  body("gender").optional().isIn(["Male", "Female", "Other"]).withMessage("Invalid gender"),
  body("status")
    .optional()
    .isIn(["active", "inactive", "graduated", "suspended"])
    .withMessage("Invalid status"),
];

export const studentIdParamRule = [param("id").isMongoId().withMessage("Invalid student id")];

// ---- Bulk Student Import (additive) ----

export const executeImportRules = [
  body("rows").isArray({ min: 1 }).withMessage("No rows to import"),
  body("duplicateAction").optional().isIn(["skip", "update", "cancel"]).withMessage("Invalid duplicate action"),
];

// ---- Promote Students (additive) ----

export const promotionCandidatesQueryRules = [
  query("class").trim().notEmpty().withMessage("Class is required"),
  query("section").trim().notEmpty().withMessage("Section is required"),
];

export const promotionExecuteRules = [
  body("fromClass").trim().notEmpty().withMessage("From Class is required"),
  body("fromSection").trim().notEmpty().withMessage("From Section is required"),
  body("toClass").trim().notEmpty().withMessage("To Class is required"),
  body("toSection").trim().notEmpty().withMessage("To Section is required"),
  body("academicYear").trim().notEmpty().withMessage("Academic Year is required"),
  body("promotions").isArray({ min: 1 }).withMessage("No students selected"),
  body("promotions.*.student").isMongoId().withMessage("Invalid student id in promotions"),
  body("promotions.*.result").isIn(["promoted", "retained"]).withMessage("Invalid promotion result"),
];