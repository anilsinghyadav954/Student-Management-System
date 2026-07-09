import express from "express";
import {
  addMarks,
  updateMarks,
  deleteMarks,
  getStudentMarks,
} from "../controllers/marksController.js";
import { protect, authorize } from "../middleware/authMiddleware.js";
import { validate } from "../middleware/validateMiddleware.js";
import { addMarksRules, updateMarksRules } from "../validators/marksValidators.js";

const router = express.Router();

router.use(protect);

// A student may view their own marks; everything else is admin-only.
router.get("/student/:studentId", getStudentMarks);

router.use(authorize("admin"));
router.post("/", addMarksRules, validate, addMarks);
router.put("/:id", updateMarksRules, validate, updateMarks);
router.delete("/:id", deleteMarks);

export default router;
