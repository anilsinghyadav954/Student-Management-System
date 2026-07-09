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
import { protect, authorize } from "../middleware/authMiddleware.js";
import { validate } from "../middleware/validateMiddleware.js";
import { upload } from "../middleware/uploadMiddleware.js";
import {
  createStudentRules,
  updateStudentRules,
  studentIdParamRule,
} from "../validators/studentValidators.js";

const router = express.Router();

router.use(protect);

// A student may fetch their own academic profile; everything else below is admin-only.
router.get("/me/profile", getMyStudentProfile);

// All remaining student management routes are admin-only. Students view
// their own data through /me/profile above plus the attendance/marks
// "own record" endpoints, not through this admin CRUD surface.
router.use(authorize("admin"));

router.get("/export", exportStudents);
router.get("/", getStudents);
router.post("/", createStudentRules, validate, createStudent);
router.get("/:id", studentIdParamRule, validate, getStudentById);
router.put("/:id", updateStudentRules, validate, updateStudent);
router.delete("/:id", studentIdParamRule, validate, deleteStudent);
router.put("/:id/photo", studentIdParamRule, validate, upload.single("photo"), updateStudentPhoto);

export default router;
