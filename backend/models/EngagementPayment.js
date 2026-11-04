import mongoose, { Schema } from "mongoose";

// One row per Paystack payment for the new features. A payment is applied exactly once:
// status flips pending -> paid with an atomic update before its effect runs.
const engagementPaymentSchema = new Schema(
  {
    reference: { type: String, required: true, unique: true },
    purpose: { type: String, enum: ["boost", "physical", "account_boost"], required: true },
    payer: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    job: { type: Schema.Types.ObjectId, ref: "jobModel" },
    application: { type: Schema.Types.ObjectId, ref: "applicationModel" },
    plan: String,
    amount: { type: Number, required: true }, // Naira
    status: { type: String, enum: ["pending", "paid"], default: "pending", index: true },
    paidAt: Date,
    meta: { type: Object, default: {} },
  },
  { timestamps: true }
);

export default mongoose.models.engagementPaymentModel ||
  mongoose.model("engagementPaymentModel", engagementPaymentSchema);