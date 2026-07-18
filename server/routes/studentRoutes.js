import express from "express";
import {
  createStudent,
  getStudents,
  getStudentById,
  updateStudent,
  deleteStudent,
  updateStudentPhoto,
  exportStudents,
  getMyStudentProfile,
} from "../controllers/studentController.js";
import {
  downloadTemplate,
  previewImport,
  executeImport,
  downloadCredentialsExcel,
  exportStudentsAsTemplate,
} from "../controllers/bulkImportController.js";
import {
  getPromotionCandidates,
  executePromotion,
  getPromotionHistory,
} from "../controllers/promotionController.js";
import { protect, authorize } from "../middleware/authMiddleware.js";
import { validate } from "../middleware/validateMiddleware.js";
import { upload, uploadSpreadsheet } from "../middleware/uploadMiddleware.js";
import {
  createStudentRules,
  updateStudentRules,
  studentIdParamRule,
  executeImportRules,
  promotionCandidatesQueryRules,
  promotionExecuteRules,
} from "../validators/studentValidators.js";

const router = express.Router();

router.use(protect);

// A student may fetch their own academic profile; everything else below is admin-only.
router.get("/me/profile", getMyStudentProfile);

router.use(authorize("admin"));

// IMPORTANT: every literal-path route below (export, import/*, promotion/*)
// must be registered BEFORE the "/:id" route further down — otherwise
// Express would try to match e.g. "export-template" against ":id" and
// treat "export-template" as a student ID.
router.get("/export", exportStudents);
router.get("/export-template", exportStudentsAsTemplate);

// ---- Bulk Student Import (additive) ----
router.get("/import/template", downloadTemplate);
router.post("/import/preview", uploadSpreadsheet.single("file"), previewImport);
router.post("/import/execute", executeImportRules, validate, executeImport);
router.post("/import/credentials-excel", downloadCredentialsExcel);

// ---- Promote Students (additive) ----
router.get("/promotion/candidates", promotionCandidatesQueryRules, validate, getPromotionCandidates);
router.post("/promotion/execute", promotionExecuteRules, validate, executePromotion);
router.get("/promotion/history/:studentId", getPromotionHistory);

router.get("/", getStudents);
router.post("/", createStudentRules, validate, createStudent);
router.get("/:id", studentIdParamRule, validate, getStudentById);
router.put("/:id", updateStudentRules, validate, updateStudent);
router.delete("/:id", studentIdParamRule, validate, deleteStudent);
router.put("/:id/photo", studentIdParamRule, validate, upload.single("photo"), updateStudentPhoto);

export default router;