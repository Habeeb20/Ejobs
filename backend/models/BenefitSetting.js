import mongoose, { Schema } from "mongoose";

const settingSchema = new Schema(
  {
    key: { type: String, default: "benefit", unique: true },
    // Beneficiaries must be at the venue at least once in this many days
    attendanceIntervalDays: { type: Number, default: 7, min: 1, max: 365 },
    venueName: { type: String, default: "", trim: true },
    venueAddress: { type: String, default: "", trim: true },
    // 0 means no limit
    maxBenefitAmount: { type: Number, default: 0, min: 0 },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true }
);

const BenefitSetting =
  mongoose.models.BenefitSetting || mongoose.model("BenefitSetting", settingSchema);

// There is only ever one settings document
export const getSettings = () =>
  BenefitSetting.findOneAndUpdate(
    { key: "benefit" },
    { $setOnInsert: { attendanceIntervalDays: 7 } },
    { upsert: true, new: true }
  );

export default BenefitSetting;