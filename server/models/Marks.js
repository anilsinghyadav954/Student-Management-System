import mongoose from "mongoose";

const marksSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
    },
    subject: {
      type: String,
      required: [true, "Subject is required"],
      trim: true,
    },
    examType: {
      type: String,
      enum: {
        values: ["Unit Test", "Mid Term", "Final Term", "Quiz", "Assignment"],
        message: "Invalid exam type",
      },
      required: [true, "Exam type is required"],
    },
    academicYear: {
      type: String,
      required: [true, "Academic year is required"], // e.g. "2025-2026"
      trim: true,
    },
    marksObtained: {
      type: Number,
      required: [true, "Marks obtained is required"],
      min: [0, "Marks obtained cannot be negative"],
    },
    totalMarks: {
      type: Number,
      required: [true, "Total marks is required"],
      min: [1, "Total marks must be at least 1"],
    },
    grade: {
      type: String, // auto-computed in pre-save hook below
    },
    remarks: {
      type: String,
      trim: true,
      maxlength: [200, "Remarks cannot exceed 200 characters"],
      default: "",
    },
    addedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // ---- Added for Bulk Marks Entry / Result Export (additive only —
    // all optional/defaulted, so existing single-entry marks records and
    // the existing marksController functions are completely unaffected) ----
    isAbsent: {
      type: Boolean,
      default: false,
    },
    examDate: {
      type: Date,
    },
    // Denormalized onto the record (same pattern already used on
    // Attendance) so bulk-entry/export queries can filter directly by
    // class+section without an extra populate + in-memory filter.
    class: {
      type: String,
      trim: true,
    },
    section: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
);

// Prevents duplicate marks entries for the same student/subject/exam/year combo
marksSchema.index(
  { student: 1, subject: 1, examType: 1, academicYear: 1 },
  { unique: true }
);
// Speeds up the Bulk Marks Entry grid and Result Export queries, which
// filter by class+section+subject+exam rather than by individual student.
marksSchema.index({ class: 1, section: 1, subject: 1, examType: 1, academicYear: 1 });

/**
 * Grade boundaries (percentage-based), standard 10-point-ish scale used
 * by most Indian school/college systems. Easy to tweak in one place.
 */
const GRADE_SCALE = [
  { min: 90, grade: "A+" },
  { min: 80, grade: "A" },
  { min: 70, grade: "B+" },
  { min: 60, grade: "B" },
  { min: 50, grade: "C" },
  { min: 40, grade: "D" },
  { min: 0, grade: "F" },
];

export const calculateGrade = (marksObtained, totalMarks) => {
  const percentage = (marksObtained / totalMarks) * 100;
  const found = GRADE_SCALE.find((tier) => percentage >= tier.min);
  return found ? found.grade : "F";
};

marksSchema.pre("validate", function (next) {
  if (this.marksObtained > this.totalMarks) {
    return next(new Error("Marks obtained cannot exceed total marks"));
  }
  this.grade = calculateGrade(this.marksObtained, this.totalMarks);
  next();
});

// Virtual: percentage score for this single subject/exam entry
marksSchema.virtual("percentage").get(function () {
  return Number(((this.marksObtained / this.totalMarks) * 100).toFixed(2));
});

marksSchema.set("toJSON", { virtuals: true });
marksSchema.set("toObject", { virtuals: true });

const Marks = mongoose.model("Marks", marksSchema);
export default Marks;