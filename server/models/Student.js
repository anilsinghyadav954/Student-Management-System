import mongoose from "mongoose";

const studentSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true, // one Student profile per User account
    },
    studentId: {
      type: String,
      required: true,
      unique: true, // e.g. "SMS-2026-0001", generated in the controller
      trim: true,
      uppercase: true,
    },
    class: {
      type: String,
      required: [true, "Class/Grade is required"],
      trim: true,
    },
    section: {
      type: String,
      required: [true, "Section is required"],
      trim: true,
      uppercase: true,
    },
    rollNumber: {
      type: String,
      required: [true, "Roll number is required"],
      trim: true,
    },
    dateOfBirth: {
      type: Date,
      required: [true, "Date of birth is required"],
    },
    gender: {
      type: String,
      enum: ["Male", "Female", "Other"],
      required: [true, "Gender is required"],
    },
    bloodGroup: {
      type: String,
      enum: ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", ""],
      default: "",
    },
    address: {
      street: { type: String, trim: true, default: "" },
      city: { type: String, trim: true, default: "" },
      state: { type: String, trim: true, default: "" },
      pincode: { type: String, trim: true, default: "" },
    },
    guardian: {
      name: { type: String, trim: true, required: [true, "Guardian name is required"] },
      relation: { type: String, trim: true, default: "Parent" },
      phone: {
        type: String,
        trim: true,
        match: [/^[0-9]{10}$/, "Guardian phone must be 10 digits"],
        required: [true, "Guardian phone is required"],
      },
      email: { type: String, trim: true, lowercase: true, default: "" },
    },
    admissionDate: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      enum: ["active", "inactive", "graduated", "suspended"],
      default: "active",
    },

    // ---- Added for Bulk Student Import (additive only — all optional,
    // existing single-student Add/Edit flow is completely unaffected) ----
    motherName: { type: String, trim: true, default: "" },
    studentMobile: { type: String, trim: true, default: "" },
    aadhaarNumber: { type: String, trim: true, default: "" },
    category: { type: String, trim: true, default: "" }, // e.g. General/OBC/SC/ST — admin-defined, not hardcoded
    house: { type: String, trim: true, default: "" },
    previousSchool: { type: String, trim: true, default: "" },
    academicSession: { type: String, trim: true, default: "" }, // e.g. "2025-2026"
    transportRequired: { type: Boolean, default: false },
    hostelRequired: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// A roll number must be unique within a given class + section (not globally)
studentSchema.index({ class: 1, section: 1, rollNumber: 1 }, { unique: true });
studentSchema.index({ status: 1 });
// Note: no separate index({ studentId: 1 }) here — `unique: true` on the
// studentId field above already creates that index. Adding both caused
// Mongoose's "Duplicate schema index" warning on startup.

// Convenience virtual to populate name/email/profileImage from the linked User
// without duplicating that data in this collection.
studentSchema.virtual("profile", {
  ref: "User",
  localField: "user",
  foreignField: "_id",
  justOne: true,
});

studentSchema.set("toJSON", { virtuals: true });
studentSchema.set("toObject", { virtuals: true });

const Student = mongoose.model("Student", studentSchema);
export default Student;