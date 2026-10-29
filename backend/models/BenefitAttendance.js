import mongoose, { Schema } from "mongoose";

const attendanceSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    benefit: { type: Schema.Types.ObjectId, ref: "benefitSchema" },
    benefitNumber: { type: String, required: true, index: true },
    markedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    checkedInAt: { type: Date, default: Date.now, index: true },
    note: { type: String, trim: true },
    liftedBlacklist: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const BenefitAttendance =
  mongoose.models.BenefitAttendance || mongoose.model("BenefitAttendance", attendanceSchema);

export default BenefitAttendance;