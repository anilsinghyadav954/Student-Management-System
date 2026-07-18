import multer from "multer";
import streamifier from "streamifier";
import cloudinary from "../config/cloudinary.js";

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
 * Separate multer instance for the Bulk Student Import feature — accepts
 * spreadsheet files instead of images. Kept distinct from `upload` above
 * so image uploads (profile photos) can never accidentally accept a
 * spreadsheet, and vice versa.
 */
const spreadsheetFileFilter = (req, file, cb) => {
  const allowedTypes = [
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
    "application/vnd.ms-excel", // .xls
    "text/csv",
    "application/csv",
  ];
  const allowedExtensions = /\.(xlsx|xls|csv)$/i;
  if (allowedTypes.includes(file.mimetype) || allowedExtensions.test(file.originalname)) {
    cb(null, true);
  } else {
    cb(new Error("Only .xlsx, .xls, or .csv files are allowed"), false);
  }
};

export const uploadSpreadsheet = multer({
  storage,
  fileFilter: spreadsheetFileFilter,
  limits: { fileSize: 15 * 1024 * 1024 }, // 15MB — enough headroom for a few thousand rows
});

/**
 * Streams a Multer in-memory file buffer up to Cloudinary and resolves
 * with the secure URL + public_id (needed later for deletion/replacement).
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
 */
export const deleteFromCloudinary = async (publicId) => {
  if (!publicId) return;
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (error) {
    console.error(`⚠️  Failed to delete Cloudinary asset ${publicId}: ${error.message}`);
  }
};