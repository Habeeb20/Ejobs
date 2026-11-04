import mongoose, { Schema } from "mongoose";

// One row per thing that happened on an application. Feeds the per-application timeline
// and the jobseeker's work history (accepted, rejected, shortlisted, scheduled, offered,
// hired, sacked, declined, with reasons).
const applicationEventSchema = new Schema(
  {
    application: { type: Schema.Types.ObjectId, ref: "applicationModel", required: true, index: true },
    job: { type: Schema.Types.ObjectId, ref: "jobModel" },
    seeker: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    employer: { type: Schema.Types.ObjectId, ref: "User" },
    type: { type: String, enum: ["status", "message", "response", "interview", "payment"], required: true },
    status: { type: String, default: "" },
    title: { type: String, required: true },
    note: { type: String, default: "" }, // reason, or the subject of a message (never the message body)
    actor: { type: String, enum: ["employer", "seeker", "system"], required: true },
    actorUser: { type: Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true }
);

export default mongoose.models.applicationEventModel ||
  mongoose.model("applicationEventModel", applicationEventSchema);