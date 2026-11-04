import mongoose from "mongoose";
import Job from "../models/Job.js";
import Application from "../models/Application.js";
import ApplicationEvent from "../models/ApplicationEvent.js";
import ApplicationMessage from "../models/ApplicationMessage.js";
import AccountBoost from "../models/AccountBoost.js";
import EngagementPayment from "../models/EngagementPayment.js";
import User, { ROLES } from "../models/User.js";
import { getBoostPlan, publicBoostPlans, PHYSICAL_INTERVIEW_FEE, ACCOUNT_BOOST } from "../config/boost.js";
import { computeMatch } from "../utils/matchScore.js";
import { initTransaction } from "../utils/paystack.js";
import { emitToUser, emailUser, esc } from "../utils/notify.js";
import { settleExtraPayment } from "../utils/engagementPayment.js";
import {
  CLIENT, RESPONDABLE, applyStatusChange, cleanLine, escapeRe, logEvent,
} from "../utils/engagement.js";

/**
 * @swagger
 * tags:
 *   - name: Boosts
 *     description: Spotlight and Reach job boosts, and jobseeker account boosting
 *   - name: Candidates
 *     description: Messages, interviews, responses, talent search and work history
 */

const fail = (res, status, message, extra = {}) => res.status(status).json({ success: false, message, ...extra });
const handle = (res, err, label) => {
  if (err.status) return fail(res, err.status, err.message);
  if (err.name === "ValidationError") return fail(res, 400, Object.values(err.errors)[0].message);
  console.error(`${label}:`, err);
  return fail(res, 500, "Something went wrong. Please try again.");
};
const validId = (id) => mongoose.isValidObjectId(id);
const pick = (obj = {}, keys) => Object.fromEntries(keys.filter((k) => obj[k] !== undefined).map((k) => [k, obj[k]]));

const ownJob = (req) =>
  validId(req.params.id) ? Job.findOne({ _id: req.params.id, employer: req.user._id }) : Promise.resolve(null);
const ownApp = (req) =>
  validId(req.params.appId) ? Application.findOne({ _id: req.params.appId, companyId: req.user._id }) : Promise.resolve(null);

// What an employer may see about a jobseeker. Never password, tokens, bank or ID data.
const CARD_FIELDS = [
  "firstName", "lastName", "avatar", "gender", "state", "localGovernment", "educationLevel", "job",
  "jobChoice", "jobMode", "minimumSalary", "availabilityForUrgentWork", "isCertified", "guarantorVerified", "isNINVerified",
];
const PROFILE_FIELDS = [
  ...CARD_FIELDS, "middleName", "dateOfBirth", "maritalStatus", "email", "phoneNumber", "whatsappNumber", "address", "country",
];
const card = (u) => ({ _id: u._id, ...pick(u, CARD_FIELDS) });

/* ================= BOOSTS (employer) ================= */

/**
 * @swagger
 * /engage/boost/plans:
 *   get:
 *     tags: [Boosts]
 *     summary: Boost plans and the physical interview fee
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Plans (Spotlight, Reach) with price and extra days
 */
export const listBoostPlans = (req, res) =>
  res.json({ success: true, plans: publicBoostPlans(), physicalInterviewFee: PHYSICAL_INTERVIEW_FEE });

/**
 * @swagger
 * /engage/jobs/{id}/boost/payment:
 *   post:
 *     tags: [Boosts]
 *     summary: Start a Paystack payment to boost a job
 *     description: >
 *       Only live jobs or jobs awaiting approval can be boosted. Spotlight adds 3 days, Reach adds 7 days
 *       and unlocks every applicant. A Spotlight job can be upgraded to Reach by paying the difference.
 *       Open the Paystack popup with accessCode, then call POST /engage/jobs/{id}/boost/confirm.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/JobId'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [plan]
 *             properties:
 *               plan: { type: string, enum: [Spotlight, Reach] }
 *     responses:
 *       200:
 *         description: Payment started (accessCode, reference, amount)
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
export const initBoostPayment = async (req, res) => {
  try {
    const job = await ownJob(req);
    if (!job) return fail(res, 404, "Job not found");
    const plan = getBoostPlan(req.body.plan);
    if (!plan) return fail(res, 400, "Choose Spotlight or Reach");

    const live = job.status === "Online" && job.expiryDate && job.expiryDate > new Date();
    if (job.status !== "Awaiting Approval" && !live)
      return fail(res, 400, "Only live jobs or jobs waiting for approval can be boosted");

    const current = getBoostPlan(job.boost?.plan);
    if (current && current.price >= plan.price) return fail(res, 400, `This job already has the ${current.name} boost`);

    const amount = plan.price - (current?.price || 0);
    const extraDays = plan.extraDays - (current?.extraDays || 0);
    const reference = `EJB-${job._id}-${Date.now()}`;
    const tx = await initTransaction({
      email: req.user.email, amount, reference,
      metadata: { jobId: String(job._id), purpose: "boost", plan: plan.key },
    });
    await EngagementPayment.create({
      reference, purpose: "boost", payer: req.user._id, job: job._id, plan: plan.key, amount, meta: { extraDays },
    });
    res.json({ success: true, accessCode: tx.access_code, reference, amount });
  } catch (err) { handle(res, err, "initBoostPayment"); }
};

/**
 * @swagger
 * /engage/jobs/{id}/boost/confirm:
 *   post:
 *     tags: [Boosts]
 *     summary: Verify a boost payment and apply it
 *     description: Safe to call more than once. The Paystack webhook can call the same logic.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/JobId'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [reference]
 *             properties:
 *               reference: { type: string }
 *     responses:
 *       200:
 *         description: Boost applied
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 */
export const confirmBoostPayment = async (req, res) => {
  try {
    const pay = await settleExtraPayment(String(req.body.reference || ""), req.user._id);
    const job = await Job.findById(pay.job).select("boost isBoosted expiryDate status").lean();
    res.json({ success: true, job });
  } catch (err) { handle(res, err, "confirmBoostPayment"); }
};

/**
 * @swagger
 * /engage/jobs/{id}/suggestions:
 *   get:
 *     tags: [Boosts]
 *     summary: Suggested candidates for a Reach-boosted job
 *     description: >
 *       Jobseekers whose job choices match the job's function or industry, who haven't applied yet, scored against
 *       the job's requirements and sorted by best match. Other plans get 403 with code BOOST_REQUIRED.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/JobId'
 *     responses:
 *       200:
 *         description: Up to 20 suggestions with matchScore
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
export const suggestCandidates = async (req, res) => {
  try {
    const job = await ownJob(req);
    if (!job) return fail(res, 404, "Job not found");
    if (job.boost?.plan !== "Reach")
      return fail(res, 403, "Candidate suggestions come with the Reach boost", { code: "BOOST_REQUIRED" });

    const terms = [job.jobFunction, job.industry].filter(Boolean);
    const matchers = terms.map((t) => new RegExp(`^\\s*${escapeRe(t)}\\s*$`, "i"));
    const applied = await Application.find({ job: job._id }).distinct("applicant");

    const seekers = await User.find({
      role: ROLES.JOBSEEKER, isBlacklisted: false, _id: { $nin: applied }, jobChoice: { $in: matchers },
    }).populate("workExperience").limit(200).lean();

    const suggestions = seekers
      .map((s) => {
        const m = computeMatch(job, s);
        return { ...card(s), matchScore: m.score, matchBreakdown: m.breakdown };
      })
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, 20);

    res.json({ success: true, suggestions, total: seekers.length });
  } catch (err) { handle(res, err, "suggestCandidates"); }
};

/* ================= HISTORY, RESPONSES (both sides) ================= */

/**
 * @swagger
 * /engage/applications/{appId}/history:
 *   get:
 *     tags: [Candidates]
 *     summary: Mail history and timeline of one application
 *     description: Visible to the employer and the jobseeker on that application. When the jobseeker opens it, their unread messages are marked read.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - { in: path, name: appId, required: true, schema: { type: string } }
 *     responses:
 *       200:
 *         description: messages (newest first) and events (newest first)
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
export const getApplicationHistory = async (req, res) => {
  try {
    if (!validId(req.params.appId)) return fail(res, 404, "Application not found");
    const app = await Application.findById(req.params.appId).select("companyId applicant");
    if (!app) return fail(res, 404, "Application not found");
    const isEmployer = String(app.companyId) === String(req.user._id);
    const isSeeker = String(app.applicant) === String(req.user._id);
    if (!isEmployer && !isSeeker) return fail(res, 404, "Application not found");

    const [messages, events] = await Promise.all([
      ApplicationMessage.find({ application: app._id }).sort({ createdAt: -1 }).lean(),
      ApplicationEvent.find({ application: app._id }).sort({ createdAt: -1 }).lean(),
    ]);
    if (isSeeker) ApplicationMessage.updateMany({ application: app._id, readAt: null }, { readAt: new Date() }).catch(() => {});
    res.json({ success: true, messages, events });
  } catch (err) { handle(res, err, "getApplicationHistory"); }
};

/**
 * @swagger
 * /engage/applications/{appId}/respond:
 *   post:
 *     tags: [Candidates]
 *     summary: The jobseeker accepts or rejects the current stage or a physical interview invite
 *     description: >
 *       Rejecting needs a reason, which the employer sees. Rejecting a stage closes the application (status Declined).
 *       Accepting an Offer sets the status to Accepted. The answer is added to the work history.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - { in: path, name: appId, required: true, schema: { type: string } }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [response]
 *             properties:
 *               target: { type: string, enum: [stage, physical], default: stage }
 *               response: { type: string, enum: [accept, reject] }
 *               reason: { type: string, description: Required when rejecting }
 *     responses:
 *       200:
 *         description: Answer recorded
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
export const respondToStage = async (req, res) => {
  try {
    if (!validId(req.params.appId)) return fail(res, 404, "Application not found");
    const accept = req.body.response === "accept";
    if (!accept && req.body.response !== "reject") return fail(res, 400, "Choose accept or reject");
    const reason = String(req.body.reason || "").trim().slice(0, 1000);
    if (!accept && reason.length < 3) return fail(res, 400, "Please give a reason");

    const app = await Application.findOne({ _id: req.params.appId, applicant: req.user._id });
    if (!app) return fail(res, 404, "Application not found");

    let title;
    if (req.body.target === "physical") {
      const pi = app.physicalInterview;
      if (pi?.status !== "Sent") return fail(res, 400, "There's no open interview invite to answer");
      pi.status = accept ? "Accepted" : "Declined";
      pi.responseReason = accept ? "" : reason;
      pi.respondedAt = new Date();
      title = accept ? "Accepted the physical interview invite" : "Declined the physical interview invite";
    } else {
      if (!RESPONDABLE.includes(app.status) || app.stageResponse?.response !== "Pending")
        return fail(res, 400, "There's nothing to answer right now");
      const stage = app.status;
      app.stageResponse.response = accept ? "Accepted" : "Rejected";
      app.stageResponse.reason = accept ? "" : reason;
      app.stageResponse.respondedAt = new Date();
      if (accept && stage === "Offer") app.status = "Accepted";
      if (!accept) { app.status = "Declined"; app.reasonForDecline = reason; }
      title = accept ? `Accepted: ${stage}` : `Rejected: ${stage}`;
    }
    await app.save();
    await logEvent({
      app, type: "response", status: app.status, title, note: accept ? "" : reason,
      actor: "seeker", actorUser: req.user._id,
    });

    const [job, employer, seeker] = await Promise.all([
      Job.findById(app.job).select("jobTitle"),
      User.findById(app.companyId).select("email"),
      User.findById(req.user._id).select("firstName lastName"),
    ]);
    const name = [seeker?.firstName, seeker?.lastName].filter(Boolean).join(" ") || "A candidate";
    emitToUser(app.companyId, "application:response", {
      applicationId: app._id, jobTitle: job?.jobTitle, response: accept ? "accepted" : "rejected", target: req.body.target || "stage",
    });
    emailUser(
      employer?.email, `${name} ${accept ? "accepted" : "rejected"}: ${job?.jobTitle || app.position}`, "Candidate response",
      `<p><strong>${esc(name)}</strong> ${accept ? "accepted" : "rejected"} the ${req.body.target === "physical" ? "physical interview invite" : "current stage"} for <strong>${esc(job?.jobTitle || app.position)}</strong>.</p>${reason && !accept ? `<p><em>${esc(reason)}</em></p>` : ""}`,
      { url: `${CLIENT}/dashboard`, label: "View applicant" }
    );
    res.json({ success: true, status: app.status });
  } catch (err) { handle(res, err, "respondToStage"); }
};

/* ================= PHYSICAL INTERVIEW (employer pays 4,000 through Paystack) ================= */

const startPhysicalPayment = async (app, user) => {
  const reference = `EJP-${app._id}-${Date.now()}`;
  const tx = await initTransaction({
    email: user.email, amount: PHYSICAL_INTERVIEW_FEE, reference,
    metadata: { applicationId: String(app._id), purpose: "physical" },
  });
  await EngagementPayment.create({
    reference, purpose: "physical", payer: user._id, job: app.job, application: app._id, amount: PHYSICAL_INTERVIEW_FEE,
  });
  return { success: true, accessCode: tx.access_code, reference, amount: PHYSICAL_INTERVIEW_FEE };
};

/**
 * @swagger
 * /engage/applications/{appId}/physical-interview:
 *   post:
 *     tags: [Candidates]
 *     summary: Invite a candidate to a physical interview and start the interview-fee payment
 *     description: >
 *       The employer pays a fixed fee (4,000 Naira) for the candidate through Paystack. The invite is saved as
 *       AwaitingPayment and only reaches the candidate (email, dashboard, "fee paid" badge) once the payment is confirmed
 *       with POST /engage/applications/{appId}/physical-interview/confirm.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - { in: path, name: appId, required: true, schema: { type: string } }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [date, venue]
 *             properties:
 *               date: { type: string, format: date-time }
 *               venue: { type: string }
 *               note: { type: string }
 *     responses:
 *       200:
 *         description: Payment started (accessCode, reference, amount)
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       409:
 *         description: An invite is already active
 */
export const inviteToPhysicalInterview = async (req, res) => {
  try {
    const app = await ownApp(req);
    if (!app) return fail(res, 404, "Application not found");
    if (["Declined", "Rejected", "Sacked"].includes(app.status)) return fail(res, 400, `This application is closed (${app.status})`);
    if (["Sent", "Accepted"].includes(app.physicalInterview?.status))
      return fail(res, 409, "A physical interview invite is already active for this candidate");

    const when = new Date(req.body.date);
    if (Number.isNaN(when.getTime()) || when <= new Date()) return fail(res, 400, "Pick a date and time in the future");
    const venue = String(req.body.venue || "").trim().slice(0, 300);
    if (!venue) return fail(res, 400, "Enter the venue");

    app.physicalInterview = {
      status: "AwaitingPayment", scheduledFor: when, venue,
      note: String(req.body.note || "").trim().slice(0, 1000),
      fee: PHYSICAL_INTERVIEW_FEE, feePaid: false,
    };
    await app.save();
    res.json(await startPhysicalPayment(app, req.user));
  } catch (err) { handle(res, err, "inviteToPhysicalInterview"); }
};

/**
 * @swagger
 * /engage/applications/{appId}/physical-interview/pay:
 *   post:
 *     tags: [Candidates]
 *     summary: Retry the payment for a saved physical interview invite
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - { in: path, name: appId, required: true, schema: { type: string } }
 *     responses:
 *       200:
 *         description: Payment started (accessCode, reference, amount)
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
export const payPhysicalInterview = async (req, res) => {
  try {
    const app = await ownApp(req);
    if (!app) return fail(res, 404, "Application not found");
    if (app.physicalInterview?.status !== "AwaitingPayment") return fail(res, 400, "There's no unpaid invite for this candidate");
    res.json(await startPhysicalPayment(app, req.user));
  } catch (err) { handle(res, err, "payPhysicalInterview"); }
};

/**
 * @swagger
 * /engage/applications/{appId}/physical-interview/confirm:
 *   post:
 *     tags: [Candidates]
 *     summary: Verify the interview-fee payment and send the invite to the candidate
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - { in: path, name: appId, required: true, schema: { type: string } }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [reference]
 *             properties:
 *               reference: { type: string }
 *     responses:
 *       200:
 *         description: Invite sent
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 */
export const confirmPhysicalInterview = async (req, res) => {
  try {
    const pay = await settleExtraPayment(String(req.body.reference || ""), req.user._id);
    const app = await Application.findById(pay.application).select("physicalInterview").lean();
    res.json({ success: true, physicalInterview: app?.physicalInterview });
  } catch (err) { handle(res, err, "confirmPhysicalInterview"); }
};

/* ================= TALENT SEARCH (employer) ================= */

/**
 * @swagger
 * /engage/talent:
 *   get:
 *     tags: [Candidates]
 *     summary: Search jobseekers (employers only)
 *     description: Set available=true to list only jobseekers who turned their availability on. 12 per page.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - { in: query, name: q, schema: { type: string }, description: Matches name, job, job choices, state and local government }
 *       - { in: query, name: available, schema: { type: boolean } }
 *       - { in: query, name: page, schema: { type: integer, default: 1 } }
 *     responses:
 *       200:
 *         description: A page of jobseekers
 */
export const searchTalent = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = 12;
    const filter = { role: ROLES.JOBSEEKER, isBlacklisted: false };
    if (req.query.available === "true") filter.availabilityForUrgentWork = true;
    const q = String(req.query.q || "").trim().slice(0, 60);
    if (q) {
      const re = new RegExp(escapeRe(q), "i");
      filter.$or = [{ firstName: re }, { lastName: re }, { job: re }, { jobChoice: re }, { state: re }, { localGovernment: re }];
    }
    const [seekers, total] = await Promise.all([
      User.find(filter).sort({ availabilityForUrgentWork: -1, createdAt: -1 }).skip((page - 1) * limit).limit(limit)
        .select(CARD_FIELDS.join(" ")).lean(),
      User.countDocuments(filter),
    ]);
    res.json({ success: true, seekers, page, total, hasMore: page * limit < total });
  } catch (err) { handle(res, err, "searchTalent"); }
};

/**
 * @swagger
 * /engage/talent/{seekerId}:
 *   get:
 *     tags: [Candidates]
 *     summary: Full jobseeker profile (employers only)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - { in: path, name: seekerId, required: true, schema: { type: string } }
 *     responses:
 *       200:
 *         description: profile, education, work, certificates and cv
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
export const getTalentProfile = async (req, res) => {
  try {
    if (!validId(req.params.seekerId)) return fail(res, 404, "Jobseeker not found");
    const u = await User.findOne({ _id: req.params.seekerId, role: ROLES.JOBSEEKER, isBlacklisted: false })
      .select(`${PROFILE_FIELDS.join(" ")} cv education workExperience certificates`)
      .populate("education").populate("workExperience").populate("certificates")
      .lean();
    if (!u) return fail(res, 404, "Jobseeker not found");
    res.json({
      success: true,
      profile: { _id: u._id, ...pick(u, PROFILE_FIELDS) },
      education: u.education || [], work: u.workExperience || [], certificates: u.certificates || [],
      cv: u.cv || {},
    });
  } catch (err) { handle(res, err, "getTalentProfile"); }
};

const INVITE_STATUSES = ["Shortlisted", "Interviewed", "Scheduled", "Offer"];

/**
 * @swagger
 * /engage/talent/{seekerId}/invite:
 *   post:
 *     tags: [Candidates]
 *     summary: Shortlist a jobseeker for one of your live jobs
 *     description: >
 *       Creates an application marked source=invited (invited candidates are never hidden by the plan's applicant limit)
 *       and moves it to the chosen status. A message is optional and works like the status change message.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - { in: path, name: seekerId, required: true, schema: { type: string } }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [jobId]
 *             properties:
 *               jobId: { type: string }
 *               status: { type: string, enum: [Shortlisted, Interviewed, Scheduled, Offer], default: Shortlisted }
 *               subject: { type: string }
 *               message: { type: string }
 *     responses:
 *       201:
 *         description: Candidate shortlisted
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
export const inviteTalent = async (req, res) => {
  try {
    const { jobId } = req.body;
    const status = req.body.status || "Shortlisted";
    if (!INVITE_STATUSES.includes(status)) return fail(res, 400, "Choose a valid status");
    if (!validId(req.params.seekerId) || !validId(jobId)) return fail(res, 404, "Not found");

    const [seeker, job, employer] = await Promise.all([
      User.findOne({ _id: req.params.seekerId, role: ROLES.JOBSEEKER, isBlacklisted: false }).select("resume"),
      Job.findOne({ _id: jobId, employer: req.user._id, status: "Online", expiryDate: { $gt: new Date() } }),
      User.findById(req.user._id).select("email address companyName"),
    ]);
    if (!seeker) return fail(res, 404, "Jobseeker not found");
    if (!job) return fail(res, 400, "Pick one of your live jobs");

    let app = await Application.findOne({ job: job._id, applicant: seeker._id });
    if (app && ["Declined", "Sacked"].includes(app.status)) return fail(res, 400, `This application is closed (${app.status})`);
    if (!app) {
      app = await Application.create({
        job: job._id, applicant: seeker._id, companyId: employer._id,
        companyAddress: employer.address || "N/A", position: job.jobTitle,
        availability: "Invited by employer", resume: seeker.resume?.[0] || "N/A",
        openForStudents: job.openForStudents, source: "invited", priority: false,
      });
    }

    await applyStatusChange({
      app, job, employer, status,
      message: String(req.body.message || "").trim().slice(0, 3000),
      subject: cleanLine(req.body.subject),
    });
    res.status(201).json({ success: true, applicationId: app._id, status });
  } catch (err) {
    if (err.code === 11000) return fail(res, 409, "This candidate was just added to this job");
    handle(res, err, "inviteTalent");
  }
};

/* ================= WORK HISTORY ================= */

const buildWorkHistory = async (seekerId) => {
  const [apps, events] = await Promise.all([
    Application.find({ applicant: seekerId })
      .sort({ createdAt: -1 })
      .select("job companyId position status source createdAt dateHired reasonForRejection reasonForDecline")
      .populate("companyId", "companyName avatar")
      .populate("job", "jobTitle city state")
      .lean(),
    ApplicationEvent.find({ seeker: seekerId }).sort({ createdAt: 1 }).lean(),
  ]);

  const byApp = {};
  for (const e of events) (byApp[String(e.application)] ||= []).push({
    _id: e._id, type: e.type, status: e.status, title: e.title, note: e.note, actor: e.actor, at: e.createdAt,
  });

  const items = apps.map((a) => ({
    _id: a._id,
    jobTitle: a.job?.jobTitle || a.position,
    company: a.companyId?.companyName || "",
    location: [a.job?.city, a.job?.state].filter(Boolean).join(", "),
    status: a.status,
    source: a.source,
    appliedAt: a.createdAt,
    hiredAt: a.dateHired || null,
    closingReason:
      ["Rejected", "Sacked"].includes(a.status) ? a.reasonForRejection || ""
      : a.status === "Declined" ? a.reasonForDecline || "" : "",
    timeline: byApp[String(a._id)] || [],
  }));

  const count = (s) => items.filter((i) => i.status === s).length;
  return {
    summary: {
      total: items.length, hired: count("Hired"), rejected: count("Rejected"),
      sacked: count("Sacked"), declined: count("Declined"),
    },
    items,
  };
};

/**
 * @swagger
 * /engage/seekers/{seekerId}/work-history:
 *   get:
 *     tags: [Candidates]
 *     summary: A jobseeker's work history on the platform (employers only)
 *     description: Every application with its outcome (shortlisted, scheduled, offered, accepted, rejected, hired, sacked, declined), the reasons, and a timeline.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - { in: path, name: seekerId, required: true, schema: { type: string } }
 *     responses:
 *       200:
 *         description: summary and items
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
export const getSeekerWorkHistory = async (req, res) => {
  try {
    if (!validId(req.params.seekerId)) return fail(res, 404, "Jobseeker not found");
    const exists = await User.exists({ _id: req.params.seekerId, role: ROLES.JOBSEEKER });
    if (!exists) return fail(res, 404, "Jobseeker not found");
    res.json({ success: true, ...(await buildWorkHistory(req.params.seekerId)) });
  } catch (err) { handle(res, err, "getSeekerWorkHistory"); }
};

/**
 * @swagger
 * /engage/work-history/mine:
 *   get:
 *     tags: [Candidates]
 *     summary: The jobseeker's own work history
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: summary and items
 */
export const myWorkHistory = async (req, res) => {
  try {
    res.json({ success: true, ...(await buildWorkHistory(req.user._id)) });
  } catch (err) { handle(res, err, "myWorkHistory"); }
};

/* ================= JOBSEEKER ACCOUNT BOOST ================= */

/**
 * @swagger
 * /engage/account-boost:
 *   get:
 *     tags: [Boosts]
 *     summary: The jobseeker's account boost status and price
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: active, expiresAt, price, durationDays
 */
export const getAccountBoost = async (req, res) => {
  try {
    const b = await AccountBoost.findOne({ user: req.user._id }).lean();
    res.json({
      success: true,
      active: Boolean(b && b.expiresAt > new Date()),
      expiresAt: b?.expiresAt || null,
      price: ACCOUNT_BOOST.price,
      durationDays: ACCOUNT_BOOST.durationDays,
    });
  } catch (err) { handle(res, err, "getAccountBoost"); }
};

/**
 * @swagger
 * /engage/account-boost/payment:
 *   post:
 *     tags: [Boosts]
 *     summary: Start a Paystack payment for account boosting
 *     description: Boosted jobseekers are emailed every new job that matches their job choices, and are listed first among applicants. Renewing adds to the time left.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Payment started (accessCode, reference, amount)
 */
export const initAccountBoostPayment = async (req, res) => {
  try {
    const reference = `EJA-${req.user._id}-${Date.now()}`;
    const tx = await initTransaction({
      email: req.user.email, amount: ACCOUNT_BOOST.price, reference,
      metadata: { userId: String(req.user._id), purpose: "account_boost" },
    });
    await EngagementPayment.create({
      reference, purpose: "account_boost", payer: req.user._id, amount: ACCOUNT_BOOST.price,
    });
    res.json({ success: true, accessCode: tx.access_code, reference, amount: ACCOUNT_BOOST.price });
  } catch (err) { handle(res, err, "initAccountBoostPayment"); }
};

/**
 * @swagger
 * /engage/account-boost/confirm:
 *   post:
 *     tags: [Boosts]
 *     summary: Verify the account boost payment and activate it
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [reference]
 *             properties:
 *               reference: { type: string }
 *     responses:
 *       200:
 *         description: Account boost active
 */
export const confirmAccountBoostPayment = async (req, res) => {
  try {
    await settleExtraPayment(String(req.body.reference || ""), req.user._id);
    const b = await AccountBoost.findOne({ user: req.user._id }).lean();
    res.json({ success: true, active: Boolean(b && b.expiresAt > new Date()), expiresAt: b?.expiresAt || null });
  } catch (err) { handle(res, err, "confirmAccountBoostPayment"); }
};