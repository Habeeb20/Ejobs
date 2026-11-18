// backend/models/Recruitment.js
import crypto from "crypto";
import mongoose, { Schema } from "mongoose";
import { STAGES, CHECKS, CHANGE_TYPES } from "../config/recruitmentPlans.js";

const oid = (ref, extra = {}) => ({ type: Schema.Types.ObjectId, ref, ...extra });
const make = (name, schema) => mongoose.models[name] || mongoose.model(name, schema);

/* ---------- Package settings ----------
   The package content (features, limits, checks, replacement terms) lives in config/recruitmentPlans.js.
   This collection only stores what an admin edits in the app: the price and whether the package is on sale. */
const planSchema = new Schema({
  key: { type: String, required: true, unique: true },
  order: { type: Number, default: 0 },
  name: String, tagline: String,
  active: { type: Boolean, default: true },
  durationDays: Number,
  paymentTerms: { upfrontPct: { type: Number, default: 100 }, label: String },
  limits: { shortlistMax: Number, screenMax: Number, hireTarget: { type: Number, default: 1 } },
  checks: [String],
  replacement: { count: Number, windowDays: Number, maxPerYear: Number },
  features: [String],
  pricing: {
    model: { type: String, enum: ["fixed", "percent"], default: "fixed" }, // fixed = amount per package, percent = % of annual salary
    amount: { type: Number, min: 0 },
    percent: { type: Number, min: 0, max: 100 },
  },
}, { timestamps: true });
export const RecruitmentPlan = make("RecruitmentPlan", planSchema);

/* ---------- Candidate on a request ---------- */
const checkSchema = new Schema({
  key: { type: String, required: true },
  label: String,
  status: { type: String, enum: ["Pending", "InProgress", "Passed", "Failed", "NotApplicable"], default: "Pending" },
  note: { type: String, default: "" },
  reportUrl: { type: String, default: "" },
  updatedAt: Date,
}, { _id: false });

const candidateSchema = new Schema({
  user: oid("User", { required: true }),
  name: String, email: String, phone: String, photo: String, headline: String, state: String,
  yearsExperience: { type: Number, min: 0, max: 60 },
  stage: { type: String, enum: STAGES, default: "Sourced" },
  summary: { type: String, default: "", maxlength: 4000 },      // profile write-up the client sees
  adminNotes: { type: String, default: "", maxlength: 4000 },   // private to the recruitment team
  checks: [checkSchema],
  screenedAt: Date,                // first time the team screened this candidate (counts towards the package screening limit)
  submittedAt: Date,               // when the candidate became visible to the client
  interviewRequestedAt: Date,      // client asked to interview
  interview: {
    scheduledAt: Date, mode: { type: String, enum: ["Onsite", "Video", "Phone"] }, location: String,
    status: { type: String, enum: ["Scheduled", "Completed", "Cancelled"] },
  },
  clientFeedback: { type: String, default: "", maxlength: 2000 },
  rejectedBy: { type: String, enum: ["client", "admin", ""], default: "" },
  rejectReason: { type: String, default: "", maxlength: 1000 },
  offeredAt: Date, hiredAt: Date, startDate: Date, replacementUntil: Date, endedAt: Date,
  replacementFor: oid("RecruitmentReplacement", { default: null }), // set when this candidate is a replacement
}, { timestamps: true });

/* ---------- Request (one order of one package) ---------- */
const requestSchema = new Schema({
  reference: { type: String, unique: true, index: true },
  employer: oid("User", { required: true, index: true }),
  plan: { type: String, required: true },
  planName: String,
  planSnapshot: { // frozen at order time so later edits never change what the client bought
    durationDays: Number, paymentTerms: { upfrontPct: Number, label: String },
    limits: { shortlistMax: Number, screenMax: Number, hireTarget: Number },
    checks: [String], replacement: { count: Number, windowDays: Number, maxPerYear: Number },
  },

  jobTitle: { type: String, required: true, maxlength: 120 },
  description: { type: String, required: true, maxlength: 5000 },
  qualifications: { type: String, default: "", maxlength: 3000 },
  skills: { type: [String], default: [] },
  experience: { type: String, default: "", maxlength: 200 },
  location: { type: String, default: "", maxlength: 160 },
  employmentType: { type: String, default: "Full-time" },
  annualSalary: { type: Number, default: 0, min: 0 },
  hiringEngagement: { type: Boolean, default: false },

  fees: {
    base: Number, engagement: Number, total: Number, upfront: Number, balance: Number,
    paid: { type: Number, default: 0 },          // running total of confirmed payments (package + change fees)
    currency: { type: String, default: "NGN" },
  },
  status: { type: String, enum: ["AwaitingPayment", "Active", "Suspended", "Completed", "Cancelled"], default: "AwaitingPayment", index: true },
  statusReason: { type: String, default: "" },
  termsVersion: String, termsAcceptedAt: Date,
  commencedAt: Date, dueDate: Date, completedAt: Date, cancelledAt: Date,

  candidates: [candidateSchema],
  documents: [{ name: String, url: String, type: { type: String, default: "Report" }, createdAt: { type: Date, default: Date.now } }],
  timeline: [{ _id: false, at: { type: Date, default: Date.now }, actor: { type: String, enum: ["client", "admin", "system"] }, actorName: String, text: String, internal: { type: Boolean, default: false } }],
}, { timestamps: true });
requestSchema.index({ status: 1, createdAt: -1 });
requestSchema.pre("validate", function () {
  if (!this.reference) this.reference = `RC-${new Date().getFullYear()}-${crypto.randomInt(100000, 1000000)}`;
});
export const RecruitmentRequest = make("RecruitmentRequest", requestSchema);

/* ---------- Payments (bank transfer confirmed by an admin, or paid online with Paystack and verified automatically) ----------
   A Pending payment is created by the system when money becomes due (order, hire balance, approved change).
   The client then attaches their transfer details (submittedAt) and an admin confirms or declines it. */
export const RecruitmentPayment = make("RecruitmentPayment", new Schema({
  request: oid("RecruitmentRequest", { required: true, index: true }),
  employer: oid("User", { required: true, index: true }),
  kind: { type: String, enum: ["upfront", "balance", "change_request"], required: true },
  change: oid("RecruitmentChange", { default: null }),
  amount: { type: Number, required: true, min: 0 },
  currency: { type: String, default: "NGN" },
  status: { type: String, enum: ["Pending", "Paid", "Failed"], default: "Pending", index: true },
  reference: { type: String, default: "" },     // transfer reference given by the client
  proofUrl: { type: String, default: "" },
  note: { type: String, default: "" },          // note from the client
  adminNote: { type: String, default: "" },     // reason shown to the client when a payment is declined
  submittedAt: Date,                            // when the client declared the transfer
  method: { type: String, enum: ["bank_transfer", "paystack"], default: "bank_transfer" }, // how it was finally paid
  gateway: {                                    // Paystack details, filled when the client pays online
    provider: { type: String, default: "" },
    reference: { type: String, default: "", index: true, sparse: true }, // latest transaction reference
    accessCode: { type: String, default: "", select: false },
    channel: String,                            // card, bank, ussd, bank_transfer ...
    verified: { type: Boolean, default: false },// true once Paystack confirmed the amount server-side
    verifiedAt: Date,
    gatewayFees: Number,                        // in naira
    initializedAt: Date,
  },
  paidAt: Date, confirmedBy: oid("User", { default: null }), // confirmedBy stays empty for online payments (verified automatically)
}, { timestamps: true }));

/* ---------- Change / renewal of request (+15%) ---------- */
export const RecruitmentChange = make("RecruitmentChange", new Schema({
  request: oid("RecruitmentRequest", { required: true, index: true }),
  employer: oid("User", { required: true }),
  type: { type: String, enum: CHANGE_TYPES.map((t) => t.value), required: true },
  description: { type: String, required: true, maxlength: 2000 },
  fee: { type: Number, required: true },
  status: { type: String, enum: ["AwaitingApproval", "AwaitingPayment", "Paid", "Declined", "Completed"], default: "AwaitingApproval", index: true },
  adminNote: { type: String, default: "" },
  decidedAt: Date,
}, { timestamps: true }));

/* ---------- Replacement requests ---------- */
export const RecruitmentReplacement = make("RecruitmentReplacement", new Schema({
  request: oid("RecruitmentRequest", { required: true, index: true }),
  employer: oid("User", { required: true }),
  candidateId: { type: Schema.Types.ObjectId, required: true },
  candidateName: String,
  reasonCode: { type: String, required: true },
  reasonLabel: String,
  details: { type: String, default: "", maxlength: 2000 },
  needsReview: { type: Boolean, default: false },
  revisedRequirements: { type: Boolean, default: false },
  change: oid("RecruitmentChange", { default: null }),
  status: { type: String, enum: ["Pending", "Approved", "Rejected", "Fulfilled"], default: "Pending", index: true },
  adminNote: { type: String, default: "" },
  decidedAt: Date,
}, { timestamps: true }));

export { CHECKS };