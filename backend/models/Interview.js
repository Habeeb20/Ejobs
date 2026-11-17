


import mongoose from "mongoose";

const { ObjectId } = mongoose.Schema.Types;

const interviewSchema = new mongoose.Schema(
  {
    job: { type: ObjectId, ref: "Job", required: true, index: true },
    application: { type: ObjectId, ref: "Application", required: true, index: true },
    employer: { type: ObjectId, ref: "User", required: true },
    applicant: { type: ObjectId, ref: "User", required: true, index: true },
    scheduledAt: { type: Date, required: true },
    duration: { type: Number, default: 60 }, // minutes
    note: { type: String, default: "", maxlength: 500 },
    status: { type: String, enum: ["Scheduled", "Cancelled"], default: "Scheduled" },
  },
  { timestamps: true }
);

export default mongoose.model("Interview", interviewSchema);