import mongoose, { Schema } from "mongoose";

// Every message an employer sends to a candidate. The jobseeker receives it by email and on
// their dashboard (MyApplications). Both sides can read the history.
const applicationMessageSchema = new Schema(
  {
    application: { type: Schema.Types.ObjectId, ref: "applicationModel", required: true, index: true },
    job: { type: Schema.Types.ObjectId, ref: "jobModel" },
    employer: { type: Schema.Types.ObjectId, ref: "User", required: true },
    seeker: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    kind: { type: String, enum: ["status", "interview"], default: "status" },
    stage: { type: String, default: "" }, // Shortlisted, Scheduled, Offer, Physical interview...
    subject: { type: String, required: true, maxlength: 150 },
    body: { type: String, required: true, maxlength: 3000 },
    emailed: { type: Boolean, default: false },
    readAt: { type: Date, default: null },
  },
  { timestamps: true }
);

export default mongoose.models.applicationMessageModel ||
  mongoose.model("applicationMessageModel", applicationMessageSchema);