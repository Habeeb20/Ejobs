import mongoose, { Schema } from "mongoose";
import { CATEGORIES } from "../utils/blacklist.js";

// One row per blacklist / reinstate action. Never edited or deleted: it is the audit trail.
const blacklistRecordSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    action: { type: String, enum: ["blacklist", "unblacklist"], required: true },
    reason: { type: String, required: true, trim: true, maxlength: 1000 },
    category: { type: String, enum: [...CATEGORIES, ""], default: "" },

    performedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    performedByName: { type: String, default: "" }, // snapshot, still correct if the name changes later

    // snapshot of the person affected
    userSnapshot: {
      name: { type: String, default: "" },
      email: { type: String, default: "" },
      role: { type: String, default: "" },
    },
  },
  { timestamps: true }
);

blacklistRecordSchema.index({ createdAt: -1 });

const BlacklistRecord =
  mongoose.models.BlacklistRecord || mongoose.model("BlacklistRecord", blacklistRecordSchema);

export default BlacklistRecord;
