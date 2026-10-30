import mongoose, { Schema } from "mongoose";
import { AD_PLACEMENTS } from "../config/adPackages.js";

const adSchema = new Schema(
  {
    owner: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    ownerRole: String,

    title: { type: String, required: true, trim: true, maxlength: 80 },
    description: { type: String, trim: true, maxlength: 300, default: "" },

    // Media is uploaded to Cloudinary by the frontend; only the URL is stored here
    mediaType: { type: String, enum: ["image", "video"], required: true },
    mediaUrl: { type: String, required: true },
    mediaPublicId: { type: String, default: "" },

    linkUrl: { type: String, required: true },
    ctaLabel: { type: String, default: "Learn more", maxlength: 24 },
    placements: { type: [{ type: String, enum: AD_PLACEMENTS }], default: AD_PLACEMENTS },

    // Draft -> (paid) Pending -> Approved or Rejected. Admin ads start as Approved.
    status: {
      type: String,
      enum: ["Draft", "Pending", "Approved", "Rejected", "Paused", "Expired"],
      default: "Draft",
      index: true,
    },

    packageKey: String, // "week" | "fortnight" | "month" | "admin"
    durationDays: { type: Number, required: true, min: 1, max: 365 },
    amount: { type: Number, default: 0 }, // naira
    paymentStatus: { type: String, enum: ["Free", "Pending", "Paid"], default: "Pending" },
    paymentReference: { type: String, default: "" },

    submittedAt: Date,
    reviewedBy: { type: Schema.Types.ObjectId, ref: "User" },
    reviewedAt: Date,
    rejectionReason: { type: String, default: "" },

    startsAt: Date, // set on approval (or chosen by an admin)
    endsAt: Date,

    impressions: { type: Number, default: 0 },
    clicks: { type: Number, default: 0 },
  },
  { timestamps: true }
);

adSchema.index({ status: 1, startsAt: 1, endsAt: 1, placements: 1 }); // "what's live" query
adSchema.index({ owner: 1, createdAt: -1 });

export default mongoose.models.adModel || mongoose.model("adModel", adSchema);