import express from "express";
import {
  createNotice,
  updateNotice,
  deleteNotice,
  getAllNotices,
  getMyNotices,
} from "../controllers/noticeController.js";
import { protect, authorize } from "../middleware/authMiddleware.js";
import { validate } from "../middleware/validateMiddleware.js";
import { createNoticeRules, updateNoticeRules } from "../validators/noticeValidators.js";

const router = express.Router();

router.use(protect);

router.get("/my", getMyNotices); // student-facing feed

router.use(authorize("admin"));
router.get("/", getAllNotices);
router.post("/", createNoticeRules, validate, createNotice);
router.put("/:id", updateNoticeRules, validate, updateNotice);
router.delete("/:id", deleteNotice);

export default router;
