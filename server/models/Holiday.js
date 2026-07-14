import mongoose from "mongoose";

const holidaySchema = new mongoose.Schema(
  {
    date: {
      type: Date,
      required: [true, "Holiday date is required"],
      unique: true, // one holiday entry per calendar date
    },
    title: {
      type: String,
      required: [true, "Holiday title is required"],
      trim: true,
      maxlength: [100, "Title cannot exceed 100 characters"],
     
    },
    reason: {
      type: String,
      required: [true, "Holiday reason/description is required"],
      trim: true,
      maxlength: [500, "Reason cannot exceed 500 characters"],
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [500, "Notes cannot exceed 500 characters"],
      default: "",
    },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);


holidaySchema.pre("validate", function (next) {
  if (this.date) {
    const d = new Date(this.date);
    d.setUTCHours(0, 0, 0, 0);
    this.date = d;
  }
  next();
});

holidaySchema.index({ status: 1 });

const Holiday = mongoose.model("Holiday", holidaySchema);
export default Holiday;