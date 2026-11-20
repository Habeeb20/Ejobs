

import mongoose from "mongoose";

export const FACE_STEPS = ["blink", "mouth", "right", "left"];
export const FACE_STATUSES = ["pending", "approved", "rejected"];

const actionSchema = new mongoose.Schema(
  {
    step: { type: String, enum: FACE_STEPS, required: true },
    url: { type: String, required: true, trim: true },
    publicId: { type: String, required: true, trim: true },
  },
  { _id: false }
);

const faceVerificationSchema = new mongoose.Schema(
  {
    // One record per user. A new submission replaces the previous one.
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    actions: {
      type: [actionSchema],
      validate: {
        validator: (arr) =>
          arr.length === FACE_STEPS.length &&
          new Set(arr.map((a) => a.step)).size === FACE_STEPS.length,
        message: "Exactly one capture is required for each action",
      },
    },
    // The liveness check runs in the browser, so every submission starts as "pending"
    // until an admin reviews it.
    status: { type: String, enum: FACE_STATUSES, default: "pending", index: true },
    submittedAt: { type: Date, default: Date.now, index: true },

    // Admin review
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    reviewedAt: Date,
    rejectionReason: { type: String, trim: true, maxlength: 500 },
  },
  { timestamps: true }
);

const FaceVerification = mongoose.model("FaceVerification", faceVerificationSchema);
export default FaceVerification;