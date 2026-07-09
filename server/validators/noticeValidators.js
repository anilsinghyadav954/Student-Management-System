import { body } from "express-validator";

export const createNoticeRules = [
  body("title").trim().notEmpty().withMessage("Title is required").isLength({ max: 150 }),
  body("description").trim().notEmpty().withMessage("Description is required").isLength({ max: 3000 }),
  body("audience").optional().isIn(["all", "class"]).withMessage("Audience must be 'all' or 'class'"),
  body("targetClass")
    .if(body("audience").equals("class"))
    .trim()
    .notEmpty()
    .withMessage("Target class is required when audience is 'class'"),
  body("priority").optional().isIn(["low", "normal", "high"]).withMessage("Invalid priority"),
];

export const updateNoticeRules = [
  body("title").optional().trim().isLength({ max: 150 }),
  body("description").optional().trim().isLength({ max: 3000 }),
  body("audience").optional().isIn(["all", "class"]).withMessage("Audience must be 'all' or 'class'"),
  body("priority").optional().isIn(["low", "normal", "high"]).withMessage("Invalid priority"),
];
