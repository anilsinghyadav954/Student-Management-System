import mongoose from "mongoose";

const promotionHistorySchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
    },
    academicYear: {
      type: String,
      required: true,
      trim: true,
    },
    fromClass: { type: String, required: true, trim: true },
    fromSection: { type: String, required: true, trim: true },
    toClass: { type: String, required: true, trim: true },
    toSection: { type: String, required: true, trim: true },
    result: {
      type: String,
      enum: ["promoted", "retained"],
      required: true,
    },
    promotedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

promotionHistorySchema.index({ student: 1, createdAt: -1 });

const PromotionHistory = mongoose.model("PromotionHistory", promotionHistorySchema);
export default PromotionHistory;