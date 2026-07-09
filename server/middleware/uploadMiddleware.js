import multer from "multer";
import streamifier from "streamifier";
import cloudinary from "../config/cloudinary.js";

// Memory storage: files are buffered in RAM, then streamed straight to
// Cloudinary. This avoids writing to disk, which matters because
// Render's filesystem is ephemeral (files vanish on redeploy/restart).
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Only JPG, PNG, and WEBP images are allowed"), false);
  }
};

export const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
});

/**
 * Streams a Multer in-memory file buffer up to Cloudinary and resolves
 * with the secure URL + public_id (needed later for deletion/replacement).
 *
 * @param {Buffer} fileBuffer
 * @param {string} folder - Cloudinary folder, e.g. "sms/profiles"
 */
export const uploadToCloudinary = (fileBuffer, folder = "sms/profiles") => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: "image",
        transformation: [{ width: 500, height: 500, crop: "limit", quality: "auto" }],
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );
    streamifier.createReadStream(fileBuffer).pipe(uploadStream);
  });
};

/**
 * Deletes a previously uploaded image from Cloudinary by its public_id.
 * Used when a user uploads a new profile photo, to avoid orphaned assets.
 */
export const deleteFromCloudinary = async (publicId) => {
  if (!publicId) return;
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (error) {
    console.error(`⚠️  Failed to delete Cloudinary asset ${publicId}: ${error.message}`);
  }
};
