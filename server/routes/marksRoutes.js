import express from "express";
import {
  addMarks,
  updateMarks,
  deleteMarks,
  getStudentMarks,
  getBulkMarksGrid,
  bulkSaveMarks,
  getExportData,
  exportResultPDF,
  exportResultExcel,
} from "../controllers/marksController.js";
import { protect, authorize } from "../middleware/authMiddleware.js";
import { validate } from "../middleware/validateMiddleware.js";
import {
  addMarksRules,
  updateMarksRules,
  bulkMarksRules,
  bulkGridQueryRules,
} from "../validators/marksValidators.js";

const router = express.Router();

router.use(protect);

// A student may view their own marks; everything else is admin-only.
router.get("/student/:studentId", getStudentMarks);

router.use(authorize("admin"));

// ---- Original single-entry marks routes (untouched) ----
router.post("/", addMarksRules, validate, addMarks);
router.put("/:id", updateMarksRules, validate, updateMarks);
router.delete("/:id", deleteMarks);

// ---- Bulk Marks Entry (additive) ----
router.get("/bulk-grid", bulkGridQueryRules, validate, getBulkMarksGrid);
router.post("/bulk", bulkMarksRules, validate, bulkSaveMarks);

// ---- Result Export (additive) ----
router.get("/export-data", bulkGridQueryRules, validate, getExportData);
router.get("/export/pdf", bulkGridQueryRules, validate, exportResultPDF);
router.get("/export/excel", bulkGridQueryRules, validate, exportResultExcel);

export default router;