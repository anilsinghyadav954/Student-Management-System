import mongoose from "mongoose";

const attendanceSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
    },
    date: {
      type: Date,
      required: [true, "Date is required"],
      // Normalized to midnight (00:00:00) in a pre-validate hook below so
      // the unique index works: one record per student per calendar day.
    },
    status: {
      type: String,
      enum: {
        values: ["present", "absent", "late", "half-day"],
        message: "Status must be present, absent, late, or half-day",
      },
      required: [true, "Attendance status is required"],
    },
    class: {
      type: String,
      required: true, // denormalized for fast monthly/class-wide report queries
    },
    section: {
      type: String,
      required: true,
    },
    remarks: {
      type: String,
      trim: true,
      maxlength: [200, "Remarks cannot exceed 200 characters"],
      default: "",
    },
    markedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", // the admin who marked/edited this record
      required: true,
    },
  },
  { timestamps: true }
);

// Normalize the date to midnight UTC before validation, so "2026-07-02T14:30"
// and "2026-07-02T09:00" both collapse to the same day for uniqueness.
attendanceSchema.pre("validate", function (next) {
  if (this.date) {
    const d = new Date(this.date);
    d.setUTCHours(0, 0, 0, 0);
    this.date = d;
  }
  next();
});

// Prevents marking attendance twice for the same student on the same day
attendanceSchema.index({ student: 1, date: 1 }, { unique: true });
// Speeds up monthly report queries filtered by class/section/date range
attendanceSchema.index({ class: 1, section: 1, date: 1 });

const Attendance = mongoose.model("Attendance", attendanceSchema);
export default Attendance;
