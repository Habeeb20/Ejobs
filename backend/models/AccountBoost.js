import mongoose, { Schema } from "mongoose";

// A jobseeker's paid "account boost". While expiresAt is in the future they get emailed
// every new job that matches their job choices, and their applications are listed first.
const accountBoostSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    startedAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, required: true, index: true },
    totalPaid: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export default mongoose.models.accountBoostModel ||
  mongoose.model("accountBoostModel", accountBoostSchema);