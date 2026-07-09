import mongoose from "mongoose";

const noticeSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Notice title is required"],
      trim: true,
      maxlength: [150, "Title cannot exceed 150 characters"],
    },
    description: {
      type: String,
      required: [true, "Notice description is required"],
      trim: true,
      maxlength: [3000, "Description cannot exceed 3000 characters"],
    },
    audience: {
      type: String,
      enum: {
        values: ["all", "class"],
        message: "Audience must be 'all' or 'class'",
      },
      default: "all",
    },
    targetClass: {
      type: String,
      trim: true,
      default: "", // required only when audience === "class", enforced below
    },
    priority: {
      type: String,
      enum: ["low", "normal", "high"],
      default: "normal",
    },
    isPinned: {
      type: Boolean,
      default: false,
    },
    expiryDate: {
      type: Date, // optional — notice auto-hides from student view after this date
    },
    postedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

noticeSchema.pre("validate", function (next) {
  if (this.audience === "class" && !this.targetClass) {
    return next(new Error("targetClass is required when audience is 'class'"));
  }
  next();
});

// Speeds up "active notices for this student" queries (pinned first, newest first)
noticeSchema.index({ isPinned: -1, createdAt: -1 });
noticeSchema.index({ audience: 1, targetClass: 1 });

const Notice = mongoose.model("Notice", noticeSchema);
export default Notice;
