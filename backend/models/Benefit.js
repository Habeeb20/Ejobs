import mongoose, { Schema } from "mongoose";
import crypto from "crypto";

export const BENEFIT_STATUS = Object.freeze({
  PENDING: "pending",
  APPROVED: "approved",
  REJECTED: "rejected",
  PAID: "paid",
});

export const BENEFIT_CATEGORIES = ["medical", "education", "housing", "emergency", "business", "other"];

// No 0/O/1/I so numbers are easy to read out at the venue
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const randomCode = (len = 8) =>
  Array.from(crypto.randomBytes(len), (b) => ALPHABET[b % ALPHABET.length]).join("");

export const generateRequestRef = () => `REQ-${randomCode()}`;

const benefitSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },

    // One number per person, reused on every request they make (BEN-XXXXXXXX)
    benefitNumber: { type: String, required: true, index: true },
    // One reference per request (REQ-XXXXXXXX)
    requestRef: { type: String, unique: true, default: generateRequestRef },

    title: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, required: true, trim: true, maxlength: 2000 },
    category: { type: String, enum: BENEFIT_CATEGORIES, default: "other" },
    amount: { type: Number, required: true, min: 1 },
    neededBy: { type: Date },
    supportingDocuments: { type: [String], default: [] },

    status: {
      type: String,
      enum: Object.values(BENEFIT_STATUS),
      default: BENEFIT_STATUS.PENDING,
      index: true,
    },

    // Checklist as it stood when the request was submitted
    requirementsSnapshot: { type: Schema.Types.Mixed },

    // Review
    approvedAmount: { type: Number, min: 0 },
    adminNote: { type: String, trim: true },
    rejectionReason: { type: String, trim: true },
    reviewedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    reviewedAt: { type: Date },

    // Payment
    paidAt: { type: Date },
    paymentReference: { type: String, trim: true },
    paidBy: { type: Schema.Types.ObjectId, ref: "User", default: null },

    // Attendance tracking (only used once approved)
    lastAttendanceAt: { type: Date },
    nextAttendanceDue: { type: Date },
    absenceFlagged: { type: Boolean, default: false },
    absenceFlaggedAt: { type: Date },
  },
  { timestamps: true }
);

benefitSchema.index({ status: 1, paidAt: -1 });
benefitSchema.index({ status: 1, absenceFlagged: 1, nextAttendanceDue: 1 });

// The model name matches the existing `ref: "benefitSchema"` on User.benefits
const Benefit = mongoose.models.benefitSchema || mongoose.model("benefitSchema", benefitSchema);

export const createBenefitNumber = async () => {
  for (let i = 0; i < 5; i++) {
    const number = `BEN-${randomCode()}`;
    if (!(await Benefit.exists({ benefitNumber: number }))) return number;
  }
  throw new Error("Could not generate a unique benefit number");
};

export default Benefit;