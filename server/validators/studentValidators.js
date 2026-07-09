import { body, param } from "express-validator";

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
