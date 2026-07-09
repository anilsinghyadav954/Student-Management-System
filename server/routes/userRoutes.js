import express from "express";
import { body } from "express-validator";
import {
  updateMyProfile,
  updateMyPhoto,
  getUsers,
  toggleUserStatus,
} from "../controllers/userController.js";
import { protect, authorize } from "../middleware/authMiddleware.js";
import { validate } from "../middleware/validateMiddleware.js";
import { upload } from "../middleware/uploadMiddleware.js";

const router = express.Router();

router.use(protect);

const updateProfileRules = [
  body("name").optional().trim().notEmpty().withMessage("Name cannot be empty"),
  body("phone").optional().matches(/^[0-9]{10}$/).withMessage("Phone must be 10 digits"),
];

// ---- Own profile (any authenticated user) ----
router.put("/me", updateProfileRules, validate, updateMyProfile);
router.put("/me/photo", upload.single("photo"), updateMyPhoto);

// ---- Admin-only user management ----
router.get("/", authorize("admin"), getUsers);
router.put("/:id/status", authorize("admin"), toggleUserStatus);

export default router;
