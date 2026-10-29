import mongoose, { Schema } from "mongoose";

// One row per Paystack transaction. The unique reference makes confirmation
// idempotent: a payment can only ever be applied to a job once.
const paymentSchema = new Schema(
  {
    reference: { type: String, required: true, unique: true },
    job: { type: Schema.Types.ObjectId, ref: "jobModel", required: true },
    employer: { type: Schema.Types.ObjectId, ref: "User", required: true },
    purpose: { type: String, enum: ["post", "renew"], required: true },
    plan: { type: String, required: true },
    amount: { type: Number, required: true }, // naira
    status: { type: String, enum: ["Pending", "Success", "Failed"], default: "Pending" },
    paidAt: Date,
  },
  { timestamps: true }
);

export default mongoose.models.jobPaymentModel || mongoose.model("jobPaymentModel", paymentSchema);