

import mongoose, { Schema } from "mongoose";

const targetingSchema = new Schema(
  { states: [String], educationLevels: [String], jobCategories: [String] },
  { _id: false }
);

const jobSchema = new Schema(
  {
    // CHANGED: points at the unified User model (was "jobEmployer")
    employer: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    applications: { type: [Schema.Types.ObjectId], ref: "applicationModel", default: [] },

    // The plan. "Draft" stays in the enum only so old documents still load.
    jobType: { type: String, enum: ["Basic", "Standard", "Premium", "Draft"], required: true },

    // NEW: payment + review tracking
    paymentStatus: { type: String, enum: ["Free", "Pending", "Paid"], default: "Pending" },
    paymentReference: { type: String, default: "" },
    submittedAt: Date,
    reviewedBy: { type: Schema.Types.ObjectId, ref: "User" },
    rejectionReason: { type: String, default: "" },
    pointsAwarded: { type: Boolean, default: false }, // premium bonus is paid once
    renewCount: { type: Number, default: 0 },
    lastRenewedAt: Date,

    // NEW: premium-only audience targeting
    targeting: { type: targetingSchema, default: undefined },

    contactMail: String,
    jobTitle: { type: String, required: true },
    jobFunction: { type: String, required: true },
    industry: { type: String, required: true },
    localGovernment: { type: String, required: true },
    city: { type: String, required: true },
    minimumQualification: { type: String, required: true },
    workType: { type: String, required: true },
    experienceLength: { type: String, required: true },
    jobLevel: String,
    openForStudents: { type: String, required: true },
    currency: { type: String, required: true },
    salary: { type: String, required: true },
    state: { type: String, required: true },
    vacancyDuration: { type: String, required: true },
    numberOfOpenings: { type: String, required: true },
    jobDescription: [String],
    jobSummary: { type: String, required: true },
    jobFrom: { type: String, default: "ejobs" },
    interviewQuestionResponse: [String],
    additionalInterviewQuestion: [String],
    jobTag: [String],
    jobSkills: [String],
    requireCoverLetter: { type: Boolean, default: true },
    requiredDocumentUpload: { type: Boolean, default: true },
    virtualInterview: { type: Boolean, default: false },

    status: {
      type: String,
      enum: ["Draft", "Awaiting Approval", "Online", "Offline", "Rejected"],
      default: "Draft",
    },
    approvalDate: Date,
    expiryDate: Date,
    isValidated: { type: Boolean, default: false },
    jobDuration: String,
    isStarred: { type: Boolean, default: false },

    // Fast counter used for plan limits (the array below is kept for old code)
    applicantCount: { type: Number, default: 0 },
    numberOfApplicants: { type: [Schema.Types.ObjectId], ref: "User", default: [] },
    reports: { type: [Schema.Types.ObjectId], ref: "jobReportModel", default: [] },

    // CHANGED: duplicate `uniqueViewers` removed, refs point at User
    uniqueViewers: [{ type: Schema.Types.ObjectId, ref: "User" }],
    likes: { type: [Schema.Types.ObjectId], ref: "User", default: [] },
    followers: { type: [Schema.Types.ObjectId], ref: "User", default: [] },
    likeCount: { type: Number, default: 0 },

    // NEW: view and share tracking
    totalViews: { type: Number, default: 0 }, // every open, including shared-link visitors
    shareCount: { type: Number, default: 0 },
    shareStats: {
      whatsapp: { type: Number, default: 0 }, facebook: { type: Number, default: 0 },
      twitter: { type: Number, default: 0 }, linkedin: { type: Number, default: 0 },
      telegram: { type: Number, default: 0 }, email: { type: Number, default: 0 },
      copy: { type: Number, default: 0 }, other: { type: Number, default: 0 },
    },
    // One entry per user per channel, so repeated taps can't inflate shareCount
    shares: [{ _id: false, user: { type: Schema.Types.ObjectId, ref: "User" }, channel: String, at: Date }],
    followCount: { type: Number, default: 0 },
    featuredJob: { type: Boolean, default: false }, // true for Premium once approved
  },
  { timestamps: true }
);

jobSchema.index({ status: 1, expiryDate: 1 });
jobSchema.index({ jobType: 1, status: 1, expiryDate: 1 }); // ads query

jobSchema.virtual("viewCount").get(function () {
  return this.uniqueViewers?.length || 0;
});

jobSchema.methods.getRemainingTime = function () {
  if (this.status !== "Online" || !this.expiryDate) return null;
  const diff = this.expiryDate - Date.now();
  if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0 };
  return {
    days: Math.floor(diff / 864e5),
    hours: Math.floor((diff % 864e5) / 36e5),
    minutes: Math.floor((diff % 36e5) / 6e4),
    seconds: Math.floor((diff % 6e4) / 1e3),
  };
};

// REMOVED: the pre-save hook that set expiryDate. Expiry is now set explicitly in
// approveJob and confirmPayment (renewals) using the durations in config/plans.js.

const jobModel = mongoose.models.jobModel || mongoose.model("jobModel", jobSchema);
export default jobModel;