import mongoose, { Schema } from "mongoose";

const adPaymentSchema = new Schema(
  {
    reference: { type: String, required: true, unique: true, index: true },
    ad: { type: Schema.Types.ObjectId, ref: "adModel", required: true, index: true },
    owner: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    packageKey: { type: String, required: true },
    amount: { type: Number, required: true }, // naira
    status: { type: String, enum: ["Pending", "Success", "Failed"], default: "Pending", index: true },
    paidAt: Date,
    gatewayResponse: { type: String, default: "" },
  },
  { timestamps: true }
);

export default mongoose.models.AdPayment || mongoose.model("AdPayment", adPaymentSchema);