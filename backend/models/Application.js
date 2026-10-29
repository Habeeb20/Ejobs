import mongoose, { Schema } from "mongoose";

const applicationSchema = new Schema(
  {
    job: { type: Schema.Types.ObjectId, ref: "jobModel", required: true },
    jobOffers: { type: [Schema.Types.ObjectId], ref: "offerModel" },
    // CHANGED: one applicant per application (was an array) and points at User
    applicant: { type: Schema.Types.ObjectId, ref: "User", required: true },
    interviews: { type: [Schema.Types.ObjectId], ref: "interviewModel" },
    companyId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    companyAddress: { type: String, required: true },
    notifications: { type: [Schema.Types.ObjectId], ref: "notificationModel" },
    position: { type: String, required: true },
    additionalDocument: { type: String, default: "" },
    coverLetter: { type: String, default: "" },
    availability: { type: String, required: true },
    resume: { type: String, required: true },
    mediumOfComm: String,
    theMedium: String,
    openForStudents: { type: String, required: true },
    dateHired: String,
    additionalQuestionResponse: Array,
    reasonForRejection: String,
    distance: { type: Number, default: null },

    // NEW: how well the candidate fits the job (Standard and Premium jobs only)
    matchScore: { type: Number, min: 0, max: 100, default: null },
    matchBreakdown: { type: Object, default: null },

    status: {
      type: String,
      enum: ["Applied", "Shortlisted", "Interviewed", "Offer", "Rejected", "Accepted", "Scheduled"],
      default: "Applied",
    },
  },
  { timestamps: true }
);

// NEW: one application per candidate per job, and fast applicant lists
applicationSchema.index({ job: 1, applicant: 1 }, { unique: true });
applicationSchema.index({ job: 1, matchScore: -1, createdAt: 1 });

export default mongoose.models.applicationModel || mongoose.model("applicationModel", applicationSchema);