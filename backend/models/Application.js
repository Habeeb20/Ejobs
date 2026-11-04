


















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
    // Employer's reason when the status is Rejected or Sacked
    reasonForRejection: String,
    // Candidate's reason when they decline (status Declined)
    reasonForDecline: { type: String, default: "" },
    distance: { type: Number, default: null },

    // NEW: how well the candidate fits the job (Standard and Premium jobs only)
    matchScore: { type: Number, min: 0, max: 100, default: null },
    matchBreakdown: { type: Object, default: null },

    // NEW: "applied" = the jobseeker applied, "invited" = the employer shortlisted them from talent search
    source: { type: String, enum: ["applied", "invited"], default: "applied" },
    // NEW: true when the jobseeker had an active account boost at the time of applying
    priority: { type: Boolean, default: false },

    status: {
      type: String,
      enum: ["Applied", "Shortlisted", "Interviewed", "Offer", "Rejected", "Accepted", "Scheduled", "Hired", "Sacked", "Declined"],
      default: "Applied",
    },

    // NEW: the candidate's answer to the current stage (Shortlisted, Interviewed, Scheduled or Offer)
    stageResponse: {
      stage: String,
      response: { type: String, enum: ["None", "Pending", "Accepted", "Rejected"], default: "None" },
      reason: { type: String, default: "" },
      respondedAt: Date,
    },

    // NEW: physical interview invite. The employer pays the fee through Paystack,
    // and the candidate only sees the invite once it is paid ("Sent").
    physicalInterview: {
      status: { type: String, enum: ["AwaitingPayment", "Sent", "Accepted", "Declined"] },
      scheduledFor: Date,
      venue: String,
      note: String,
      fee: Number,
      feePaid: { type: Boolean, default: false },
      paidAt: Date,
      paymentReference: String,
      responseReason: { type: String, default: "" },
      respondedAt: Date,
    },
  },
  { timestamps: true }
);

// NEW: one application per candidate per job, and fast applicant lists
applicationSchema.index({ job: 1, applicant: 1 }, { unique: true });
applicationSchema.index({ job: 1, matchScore: -1, createdAt: 1 });
applicationSchema.index({ job: 1, source: 1, priority: -1, matchScore: -1, createdAt: 1 });
applicationSchema.index({ applicant: 1, createdAt: -1 });

export default mongoose.models.applicationModel || mongoose.model("applicationModel", applicationSchema);