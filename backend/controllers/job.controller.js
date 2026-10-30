
import mongoose from "mongoose";
import Job from "../models/Job.js";
import Application from "../models/Application.js";
import JobPayment from "../models/JobPayment.js";
import User, { ROLES } from "../models/User.js";
import { getPlan, publicPlan, publicPlans } from "../config/plans.js";
import { computeMatch } from "../utils/matchScore.js";
import { initTransaction } from "../utils/paystack.js";
import { settlePayment } from "../utils/settlePayment.js";
import { emitToUser, emailUser, esc } from "../utils/notify.js";
import { optionalAuth, num, salaryExpr, buildJobFilter, withUserFlags } from "../config/others.js";
/**
 * @swagger
 * tags:
 *   - name: Jobs
 *     description: Browsing, viewing, saving, sharing and applying for jobs
 *   - name: Employer Jobs
 *     description: Posting, paying for, renewing and managing jobs and applicants
 *   - name: Admin Jobs
 *     description: Super admin approval of jobs
 *
 * components:
 *   parameters:
 *     JobId:
 *       in: path
 *       name: id
 *       required: true
 *       schema:
 *         type: string
 *       description: The job id
 *   responses:
 *     BadRequest:
 *       description: Missing or invalid input
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ErrorResponse'
 *     Unauthorized:
 *       description: Missing, invalid or expired token
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ErrorResponse'
 *     Forbidden:
 *       description: Your role or your job plan doesn't allow this
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ErrorResponse'
 *     NotFound:
 *       description: Not found
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ErrorResponse'
 *     ServerError:
 *       description: Server error
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ErrorResponse'
 *   schemas:
 *     Plan:
 *       type: object
 *       properties:
 *         key: { type: string, enum: [Basic, Standard, Premium] }
 *         name: { type: string }
 *         price: { type: integer, description: Naira per job, example: 2000 }
 *         durationHours: { type: integer, example: 168 }
 *         maxApplicants: { type: integer, nullable: true, description: Applicants the employer can open (null = unlimited) }
 *         points: { type: integer, description: Loyalty points earned when the job goes live }
 *         renewable: { type: boolean }
 *         analytics: { type: boolean }
 *         matchScore: { type: boolean }
 *         liveAlerts: { type: boolean }
 *         targeting: { type: boolean }
 *         ads: { type: boolean }
 *     Targeting:
 *       type: object
 *       description: Premium only. Matching job seekers are notified when the job goes live.
 *       properties:
 *         states: { type: array, items: { type: string } }
 *         educationLevels: { type: array, items: { type: string } }
 *         jobCategories: { type: array, items: { type: string } }
 *     JobInput:
 *       type: object
 *       required: [jobType, jobTitle, jobFunction, industry, state, localGovernment, city, minimumQualification, workType, experienceLength, openForStudents, currency, salary, vacancyDuration, numberOfOpenings, jobSummary]
 *       properties:
 *         jobType: { type: string, enum: [Basic, Standard, Premium] }
 *         jobTitle: { type: string, example: Sales Executive }
 *         jobFunction: { type: string, example: Sales }
 *         industry: { type: string, example: Retail }
 *         state: { type: string, example: Lagos }
 *         localGovernment: { type: string, example: Ikeja }
 *         city: { type: string, example: Ikeja }
 *         minimumQualification: { type: string, example: HND }
 *         workType: { type: string, example: Full-time }
 *         experienceLength: { type: string, example: 2 years }
 *         jobLevel: { type: string }
 *         openForStudents: { type: string, enum: ["Yes", "No"] }
 *         currency: { type: string, example: NGN }
 *         salary: { type: string, example: "80,000 - 120,000" }
 *         vacancyDuration: { type: string, example: Within 2 weeks }
 *         numberOfOpenings: { type: string, example: "2" }
 *         jobSummary: { type: string }
 *         jobDescription: { type: array, items: { type: string } }
 *         jobSkills: { type: array, items: { type: string } }
 *         jobTag: { type: array, items: { type: string } }
 *         additionalInterviewQuestion: { type: array, items: { type: string } }
 *         requireCoverLetter: { type: boolean }
 *         requiredDocumentUpload: { type: boolean }
 *         virtualInterview: { type: boolean }
 *         targeting: { $ref: '#/components/schemas/Targeting' }
 *     Job:
 *       description: A job as the employer sees it
 *       allOf:
 *         - $ref: '#/components/schemas/JobInput'
 *         - type: object
 *           properties:
 *             _id: { type: string }
 *             status: { type: string, enum: [Draft, Awaiting Approval, Online, Offline, Rejected] }
 *             paymentStatus: { type: string, enum: [Free, Pending, Paid] }
 *             rejectionReason: { type: string }
 *             approvalDate: { type: string, format: date-time }
 *             expiryDate: { type: string, format: date-time }
 *             applicantCount: { type: integer }
 *             likeCount: { type: integer }
 *             shareCount: { type: integer }
 *             totalViews: { type: integer }
 *             plan: { $ref: '#/components/schemas/Plan' }
 *     JobSummary:
 *       description: A live job as a job seeker sees it in lists
 *       type: object
 *       properties:
 *         _id: { type: string }
 *         jobTitle: { type: string }
 *         city: { type: string }
 *         state: { type: string }
 *         workType: { type: string }
 *         salary: { type: string }
 *         currency: { type: string }
 *         likeCount: { type: integer }
 *         createdAt: { type: string, format: date-time }
 *         employer:
 *           type: object
 *           properties:
 *             companyName: { type: string }
 *             avatar: { type: string }
 *         liked: { type: boolean, description: Whether the current user saved it }
 *         applied: { type: boolean, description: Whether the current user applied }
 *     ApplicationInput:
 *       type: object
 *       required: [availability, resume]
 *       properties:
 *         availability: { type: string, example: Within 1 week }
 *         resume: { type: string, description: Link to the resume }
 *         coverLetter: { type: string, description: Required when the job requires one }
 *         additionalDocument: { type: string }
 *         additionalQuestionResponse:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               question: { type: string }
 *               answer: { type: string }
 */

const CLIENT = process.env.CLIENT_URL || "http://localhost:5173";
const fail = (res, status, message, extra = {}) => res.status(status).json({ success: false, message, ...extra });
const handle = (res, err, label) => {
  if (err.name === "ValidationError") return fail(res, 400, Object.values(err.errors)[0].message);
  console.error(`${label}:`, err);
  return fail(res, 500, "Something went wrong. Please try again.");
};




// Only these fields can be set by the employer. Status, plan limits, points and
// payment fields are never read from the request body.
const JOB_FIELDS = [
  "contactMail", "jobTitle", "jobFunction", "industry", "localGovernment", "city",
  "minimumQualification", "workType", "experienceLength", "jobLevel", "openForStudents",
  "currency", "salary", "state", "vacancyDuration", "numberOfOpenings", "jobDescription",
  "jobSummary", "interviewQuestionResponse", "additionalInterviewQuestion", "jobTag",
  "jobSkills", "requireCoverLetter", "requiredDocumentUpload", "virtualInterview", "jobDuration",
];
const HIDDEN = "-uniqueViewers -likes -followers -reports -applications -numberOfApplicants -shares";

const pick = (obj = {}, keys) =>
  Object.fromEntries(keys.filter((k) => obj[k] !== undefined).map((k) => [k, obj[k]]));
const list = (v) => (Array.isArray(v) ? [...new Set(v.map((s) => String(s).trim()).filter(Boolean))].slice(0, 40) : []);
const cleanTargeting = (t = {}) => ({
  states: list(t.states), educationLevels: list(t.educationLevels), jobCategories: list(t.jobCategories),
});

const present = (job) => {
  const o = job.toObject ? job.toObject() : job;
  const expired = o.status === "Online" && o.expiryDate && new Date(o.expiryDate) <= new Date();
  return { ...o, status: expired ? "Offline" : o.status, plan: publicPlan(o.jobType) };
};
const ownJob = (req) =>
  mongoose.isValidObjectId(req.params.id)
    ? Job.findOne({ _id: req.params.id, employer: req.user._id })
    : Promise.resolve(null);

/* ================= PUBLIC ================= */

/**
 * @swagger
 * /jobs/plans:
 *   get:
 *     tags: [Jobs]
 *     summary: Plan rules (price, duration, limits and features)
 *     description: Public. The frontend builds its plan cards from this, so the UI always matches the server.
 *     responses:
 *       200:
 *         description: The three plans
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 plans:
 *                   type: array
 *                   items: { $ref: '#/components/schemas/Plan' }
 */
export const listPlans = (req, res) => res.json({ success: true, plans: publicPlans() });

/**
 * @swagger
 * /jobs/ads:
 *   get:
 *     tags: [Jobs]
 *     summary: Sponsored jobs (Premium only)
 *     description: Public. Returns a random sample of live Premium jobs. Basic and Standard jobs are never returned.
 *     responses:
 *       200:
 *         description: Up to 8 sponsored jobs
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 ads:
 *                   type: array
 *                   items: { $ref: '#/components/schemas/JobSummary' }
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
export const getAds = async (req, res) => {
  try {
    const docs = await Job.aggregate([
      { $match: { jobType: "Premium", status: "Online", expiryDate: { $gt: new Date() } } },
      { $sample: { size: 8 } },
      { $project: { jobTitle: 1, city: 1, state: 1, salary: 1, currency: 1, workType: 1, jobSummary: 1, employer: 1 } },
    ]);
    await Job.populate(docs, { path: "employer", select: "companyName avatar" });
    res.set("Cache-Control", "public, max-age=60");
    res.json({ success: true, ads: docs });
  } catch (err) { handle(res, err, "getAds"); }
};

/* ================= EMPLOYER ================= */

/**
 * @swagger
 * /jobs:
 *   post:
 *     tags: [Employer Jobs]
 *     summary: Create a job draft with a chosen plan
 *     description: >
 *       Saves the job as a Draft. Targeting is kept only for Premium jobs. Paid plans must then be
 *       paid for (POST /jobs/{id}/payment) before the job can be submitted for approval.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/JobInput'
 *     responses:
 *       201:
 *         description: Draft created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 job: { $ref: '#/components/schemas/Job' }
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
export const createJob = async (req, res) => {
  try {
    const plan = getPlan(req.body.jobType);
    if (!plan) return fail(res, 400, "Choose a plan: Basic, Standard or Premium");

    const job = await Job.create({
      ...pick(req.body, JOB_FIELDS),
      employer: req.user._id,
      jobType: plan.key,
      status: "Draft",
      paymentStatus: plan.price === 0 ? "Free" : "Pending",
      targeting: plan.targeting && req.body.targeting ? cleanTargeting(req.body.targeting) : undefined,
    });
    res.status(201).json({ success: true, job: present(job) });
  } catch (err) { handle(res, err, "createJob"); }
};

/**
 * @swagger
 * /jobs/{id}:
 *   put:
 *     tags: [Employer Jobs]
 *     summary: Edit a draft or rejected job
 *     description: >
 *       Only Draft and Rejected jobs can be edited. A rejected job goes back to Draft. The plan can be
 *       changed only while nothing has been paid.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/JobId'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/JobInput'
 *     responses:
 *       200:
 *         description: Job updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 job: { $ref: '#/components/schemas/Job' }
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
export const updateJob = async (req, res) => {
  try {
    const job = await ownJob(req);
    if (!job) return fail(res, 404, "Job not found");
    if (!["Draft", "Rejected"].includes(job.status)) return fail(res, 400, "This job can no longer be edited");

    Object.assign(job, pick(req.body, JOB_FIELDS));

    if (req.body.jobType && req.body.jobType !== job.jobType) {
      if (job.paymentStatus === "Paid") return fail(res, 400, "You've already paid for this plan");
      const next = getPlan(req.body.jobType);
      if (!next) return fail(res, 400, "Choose a plan: Basic, Standard or Premium");
      job.jobType = next.key;
      job.paymentStatus = next.price === 0 ? "Free" : "Pending";
    }
    const plan = getPlan(job.jobType);
    job.targeting = plan.targeting && req.body.targeting ? cleanTargeting(req.body.targeting) : plan.targeting ? job.targeting : undefined;

    if (job.status === "Rejected") { job.status = "Draft"; job.rejectionReason = ""; }
    await job.save();
    res.json({ success: true, job: present(job) });
  } catch (err) { handle(res, err, "updateJob"); }
};

/**
 * @swagger
 * /jobs/mine:
 *   get:
 *     tags: [Employer Jobs]
 *     summary: List the employer's own jobs
 *     description: Expired jobs are reported as Offline even if the cleanup task hasn't run yet.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: The employer's jobs, newest first
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 jobs:
 *                   type: array
 *                   items: { $ref: '#/components/schemas/Job' }
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
export const myJobs = async (req, res) => {
  try {
    const jobs = await Job.find({ employer: req.user._id }).sort({ createdAt: -1 }).select(HIDDEN).lean();
    res.json({ success: true, jobs: jobs.map(present) });
  } catch (err) { handle(res, err, "myJobs"); }
};

/**
 * @swagger
 * /jobs/{id}/submit:
 *   post:
 *     tags: [Employer Jobs]
 *     summary: Submit a job for super admin approval
 *     description: Free (Basic) jobs can be submitted straight away. Paid jobs must already be paid, otherwise 402.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/JobId'
 *     responses:
 *       200:
 *         description: The job is now Awaiting Approval
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 job: { $ref: '#/components/schemas/Job' }
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       402:
 *         description: Payment is required for this plan
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
export const submitJob = async (req, res) => {
  try {
    const job = await ownJob(req);
    if (!job) return fail(res, 404, "Job not found");
    if (!["Draft", "Rejected"].includes(job.status)) return fail(res, 400, "This job has already been submitted");

    const plan = getPlan(job.jobType);
    if (plan.price > 0 && job.paymentStatus !== "Paid") return fail(res, 402, "Payment is required for this plan");

    job.status = "Awaiting Approval";
    job.submittedAt = new Date();
    job.rejectionReason = "";
    if (plan.price === 0) job.paymentStatus = "Free";
    await job.save();
    res.json({ success: true, job: present(job) });
  } catch (err) { handle(res, err, "submitJob"); }
};

/* ---------- Payments (post a paid job, or renew) ---------- */

/**
 * @swagger
 * /jobs/{id}/payment:
 *   post:
 *     tags: [Employer Jobs]
 *     summary: Start a Paystack payment for posting or renewing a job
 *     description: >
 *       The amount always comes from the server's plan, never from the client. Basic jobs are free and
 *       cannot be renewed. Open the Paystack popup with the returned accessCode, then call
 *       POST /jobs/{id}/confirm.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/JobId'
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               purpose: { type: string, enum: [post, renew], default: post }
 *     responses:
 *       200:
 *         description: Payment started
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 accessCode: { type: string }
 *                 reference: { type: string }
 *                 amount: { type: integer, description: Naira }
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       403:
 *         description: This plan can't be renewed (code NOT_RENEWABLE)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
export const initPayment = async (req, res) => {
  try {
    const purpose = req.body.purpose === "renew" ? "renew" : "post";
    const job = await ownJob(req);
    if (!job) return fail(res, 404, "Job not found");
    const plan = getPlan(job.jobType);
    if (!plan || plan.price === 0) return fail(res, 400, "This plan is free. Submit it for approval instead.");

    if (purpose === "post") {
      if (!["Draft", "Rejected"].includes(job.status)) return fail(res, 400, "This job has already been submitted");
      if (job.paymentStatus === "Paid") return fail(res, 400, "Already paid. Submit it for approval.");
    } else {
      if (!plan.renewable) return fail(res, 403, `${plan.name} jobs can't be renewed`, { code: "NOT_RENEWABLE" });
      if (!["Online", "Offline"].includes(job.status) || !job.approvalDate)
        return fail(res, 400, "Only approved jobs can be renewed");
    }

    const reference = `EJ-${job._id}-${Date.now()}`;
    const tx = await initTransaction({
      email: req.user.email, amount: plan.price, reference,
      metadata: { jobId: String(job._id), purpose },
    });
    await JobPayment.create({ reference, job: job._id, employer: req.user._id, purpose, plan: plan.key, amount: plan.price });
    res.json({ success: true, accessCode: tx.access_code, reference, amount: plan.price });
  } catch (err) { handle(res, err, "initPayment"); }
};

/**
 * @swagger
 * /jobs/{id}/confirm:
 *   post:
 *     tags: [Employer Jobs]
 *     summary: Verify a Paystack payment and apply it to the job
 *     description: >
 *       Checks the payment with Paystack (status, amount and job). Safe to call more than once: a payment
 *       is applied only once. A paid post moves the job to Awaiting Approval; a paid renewal extends its expiry.
 *       The Paystack webhook calls the same logic, so a payment is still applied if the user closes the page.
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
 *         description: Payment applied (or already applied)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 job: { $ref: '#/components/schemas/Job' }
 *       400:
 *         description: Payment could not be confirmed yet
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
export const confirmPayment = async (req, res) => {
  try {
    const job = await settlePayment(String(req.body.reference || ""), req.user._id);
    res.json({ success: true, job: present(job) });
  } catch (err) {
    if (err.status) return fail(res, err.status, err.message);
    handle(res, err, "confirmPayment");
  }
};

/* ---------- Applicants and analytics ---------- */

/**
 * @swagger
 * /jobs/{id}/applicants:
 *   get:
 *     tags: [Employer Jobs]
 *     summary: Applicants for a job, limited by plan
 *     description: >
 *       Basic shows the first 10 applicants, Standard the top 50, Premium all. Standard and Premium are
 *       sorted by best match and include matchScore and matchBreakdown. Basic never includes match data.
 *       `locked` is how many applicants the plan hides.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/JobId'
 *     responses:
 *       200:
 *         description: Visible applicants
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 plan: { $ref: '#/components/schemas/Plan' }
 *                 total: { type: integer }
 *                 locked: { type: integer }
 *                 applicants:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       _id: { type: string }
 *                       status: { type: string }
 *                       matchScore: { type: integer, nullable: true }
 *                       matchBreakdown: { type: object, nullable: true }
 *                       createdAt: { type: string, format: date-time }
 *                       applicant: { type: object }
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
export const getApplicants = async (req, res) => {
  try {
    const job = await ownJob(req);
    if (!job) return fail(res, 404, "Job not found");
    const plan = getPlan(job.jobType);

    const query = Application.find({ job: job._id })
      .select(plan.matchScore ? "" : "-matchScore -matchBreakdown")
      .sort(plan.matchScore ? { matchScore: -1, createdAt: 1 } : { createdAt: 1 })
      .populate("applicant");
    if (Number.isFinite(plan.maxApplicants)) query.limit(plan.maxApplicants);

    const [applicants, total] = await Promise.all([query.lean(), Application.countDocuments({ job: job._id })]);
    
    res.json({
      success: true,
      job: { _id: job._id, jobTitle: job.jobTitle, jobType: job.jobType, status: present(job).status },
      plan: publicPlan(job.jobType),
      applicants, total,
      locked: Math.max(0, total - applicants.length),
    });
  } catch (err) { handle(res, err, "getApplicants"); }
};

/**
 * @swagger
 * /jobs/{id}/analytics:
 *   get:
 *     tags: [Employer Jobs]
 *     summary: Chart data for a job (Standard and Premium only)
 *     description: >
 *       Totals include unique viewers, total page views, applicants, likes, shares and the average match.
 *       Basic jobs get 403 with code PLAN_UPGRADE_REQUIRED.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/JobId'
 *     responses:
 *       200:
 *         description: Analytics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 totals:
 *                   type: object
 *                   properties:
 *                     views: { type: integer, description: Unique logged-in job seekers who viewed it }
 *                     totalViews: { type: integer, description: Every page view, including shared-link visitors }
 *                     applicants: { type: integer }
 *                     likes: { type: integer }
 *                     shares: { type: integer }
 *                     avgMatch: { type: integer, nullable: true }
 *                 perDay:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       date: { type: string }
 *                       label: { type: string }
 *                       applications: { type: integer }
 *                 byStatus:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       status: { type: string }
 *                       count: { type: integer }
 *                 matchBuckets:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       label: { type: string }
 *                       count: { type: integer }
 *                 shareChannels:
 *                   type: object
 *                   additionalProperties: { type: integer }
 *       403:
 *         description: Analytics need a Standard or Premium job (code PLAN_UPGRADE_REQUIRED)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
export const getAnalytics = async (req, res) => {
  try {
    const job = await ownJob(req);
    if (!job) return fail(res, 404, "Job not found");
    const plan = getPlan(job.jobType);
    if (!plan.analytics)
      return fail(res, 403, "Analytics are available on Standard and Premium jobs", { code: "PLAN_UPGRADE_REQUIRED" });

    const jobId = job._id;
    const since = new Date(Date.now() - 13 * 864e5);
    since.setHours(0, 0, 0, 0);
    const scored = { job: jobId, matchScore: { $ne: null } };

    const [perDayRaw, byStatus, buckets, avg] = await Promise.all([
      Application.aggregate([
        { $match: { job: jobId, createdAt: { $gte: since } } },
        { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt", timezone: "Africa/Lagos" } }, count: { $sum: 1 } } },
      ]),
      Application.aggregate([{ $match: { job: jobId } }, { $group: { _id: "$status", count: { $sum: 1 } } }]),
      Application.aggregate([
        { $match: scored },
        { $bucket: { groupBy: "$matchScore", boundaries: [0, 40, 60, 80, 101], default: "other", output: { count: { $sum: 1 } } } },
      ]),
      Application.aggregate([{ $match: scored }, { $group: { _id: null, avg: { $avg: "$matchScore" } } }]),
    ]);

    const counts = Object.fromEntries(perDayRaw.map((d) => [d._id, d.count]));
    const perDay = Array.from({ length: 14 }, (_, i) => {
      const d = new Date(Date.now() - (13 - i) * 864e5);
      const key = d.toLocaleDateString("en-CA", { timeZone: "Africa/Lagos" });
      return { date: key, label: d.toLocaleDateString("en-NG", { day: "numeric", month: "short", timeZone: "Africa/Lagos" }), applications: counts[key] || 0 };
    });
    const labels = { 0: "0-39%", 40: "40-59%", 60: "60-79%", 80: "80-100%" };
    const matchBuckets = Object.entries(labels).map(([k, label]) => ({
      label, count: buckets.find((b) => String(b._id) === k)?.count || 0,
    }));

    res.json({
      success: true,
      totals: {
        views: job.uniqueViewers?.length || 0,
        totalViews: job.totalViews || 0,
        applicants: job.applicantCount,
        likes: job.likeCount,
        shares: job.shareCount || 0,
        avgMatch: avg[0] ? Math.round(avg[0].avg) : null,
      },
      perDay,
      byStatus: byStatus.map((s) => ({ status: s._id, count: s.count })),
      matchBuckets,
      shareChannels: job.shareStats?.toObject ? job.shareStats.toObject() : job.shareStats || {},
    });
  } catch (err) { handle(res, err, "getAnalytics"); }
};

/* ================= EMPLOYER: UPDATE AN APPLICANT'S STATUS ================= */

const EMPLOYER_STATUSES = ["Shortlisted", "Interviewed", "Scheduled", "Offer", "Rejected"];

// Applicants hidden by the plan limit can't be actioned either
const isVisibleToEmployer = async (app, plan) => {
  if (!Number.isFinite(plan.maxApplicants)) return true;
  const ahead = await Application.countDocuments(
    plan.matchScore
      ? { job: app.job, $or: [{ matchScore: { $gt: app.matchScore ?? -1 } }, { matchScore: app.matchScore ?? null, createdAt: { $lt: app.createdAt } }] }
      : { job: app.job, createdAt: { $lt: app.createdAt } }
  );
  return ahead < plan.maxApplicants;
};

/**
 * @swagger
 * /jobs/applications/{appId}/status:
 *   patch:
 *     tags: [Employer Jobs]
 *     summary: Change an applicant's status
 *     description: >
 *       The job seeker is notified in real time and by email. Applicants hidden by the plan's
 *       applicant limit can't be actioned (403, code PLAN_LIMIT).
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: appId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [status]
 *             properties:
 *               status: { type: string, enum: [Shortlisted, Interviewed, Scheduled, Offer, Rejected] }
 *               reason: { type: string, description: Shown to the job seeker when rejecting }
 *     responses:
 *       200:
 *         description: Status updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 status: { type: string }
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
export const updateApplicationStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const reason = String(req.body.reason || "").trim();
    if (!EMPLOYER_STATUSES.includes(status)) return fail(res, 400, "Choose a valid status");
    if (!mongoose.isValidObjectId(req.params.appId)) return fail(res, 404, "Application not found");

    const app = await Application.findOne({ _id: req.params.appId, companyId: req.user._id });
    if (!app) return fail(res, 404, "Application not found");
    const job = await Job.findById(app.job).select("jobTitle jobType");
    const plan = getPlan(job.jobType);
    if (!(await isVisibleToEmployer(app, plan)))
      return fail(res, 403, `This applicant is hidden on your ${plan.name} plan`, { code: "PLAN_LIMIT" });

    app.status = status;
    app.reasonForRejection = status === "Rejected" ? reason : "";
    await app.save();

    const seeker = await User.findById(app.applicant).select("email");
    emitToUser(app.applicant, "application:status", { applicationId: app._id, jobTitle: job.jobTitle, status });
    emailUser(seeker?.email, `Update on your application: ${job.jobTitle}`, "Application update",
      `<p>Your application for <strong>${esc(job.jobTitle)}</strong> is now <strong>${esc(status)}</strong>.</p>${status === "Rejected" && reason ? `<p><em>${esc(reason)}</em></p>` : ""}`,
      { url: `${CLIENT}/dashboard`, label: "View my applications" });

    res.json({ success: true, status: app.status });
  } catch (err) { handle(res, err, "updateApplicationStatus"); }
};

/* ================= JOB SEEKER: BROWSE, VIEW, LIKE, SHARE, APPLY ================= */

const PUBLIC_FIELDS =
  "jobTitle jobFunction industry city state localGovernment workType salary currency numberOfOpenings openForStudents createdAt expiryDate likeCount shareCount employer";
const DETAIL_FIELDS =
  `${PUBLIC_FIELDS} jobSummary jobDescription jobSkills jobTag minimumQualification experienceLength jobLevel vacancyDuration virtualInterview requireCoverLetter requiredDocumentUpload`;
const liveFilter = () => ({ status: "Online", expiryDate: { $gt: new Date() } }); // expired jobs never show
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const validId = (id) => mongoose.isValidObjectId(id);

const flagsFor = async (userId, jobIds) => {
  const [liked, applied] = await Promise.all([
    Job.find({ _id: { $in: jobIds }, likes: userId }).select("_id").lean(),
    Application.find({ job: { $in: jobIds }, applicant: userId }).select("job").lean(),
  ]);
  return { liked: new Set(liked.map((j) => String(j._id))), applied: new Set(applied.map((a) => String(a.job))) };
};
const withFlags = (jobs, f) =>
  jobs.map((j) => ({ ...j, liked: f.liked.has(String(j._id)), applied: f.applied.has(String(j._id)) }));

/**
 * @swagger
 * /jobs/browse:
 *   get:
 *     tags: [Jobs]
 *     summary: Search live jobs
 *     description: Only Online jobs that haven't expired are returned. 12 per page.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - { in: query, name: q, schema: { type: string }, description: Matches title, category, industry, tags and city }
 *       - { in: query, name: state, schema: { type: string } }
 *       - { in: query, name: workType, schema: { type: string } }
 *       - { in: query, name: industry, schema: { type: string } }
 *       - { in: query, name: page, schema: { type: integer, default: 1 } }
 *     responses:
 *       200:
 *         description: A page of jobs
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 page: { type: integer }
 *                 total: { type: integer }
 *                 hasMore: { type: boolean }
 *                 jobs:
 *                   type: array
 *                   items: { $ref: '#/components/schemas/JobSummary' }
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
export const browseJobs = async (req, res) => {
  try {
    const q = String(req.query.q || "").trim().slice(0, 60);
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = 12;
    const filter = liveFilter();
    for (const k of ["state", "workType", "industry"]) if (req.query[k]) filter[k] = String(req.query[k]);
    if (q) {
      const re = new RegExp(escapeRe(q), "i");
      filter.$or = [{ jobTitle: re }, { jobFunction: re }, { industry: re }, { jobTag: re }, { city: re }];
    }
    const [jobs, total] = await Promise.all([
      Job.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit)
        .select(PUBLIC_FIELDS).populate("employer", "companyName avatar").lean(),
      Job.countDocuments(filter),
    ]);
    const f = await flagsFor(req.user._id, jobs.map((j) => j._id));
    res.json({ success: true, jobs: withFlags(jobs, f), page, total, hasMore: page * limit < total });
  } catch (err) { handle(res, err, "browseJobs"); }
};

/**
 * @swagger
 * /jobs/{id}/details:
 *   get:
 *     tags: [Jobs]
 *     summary: Open a job (records a view)
 *     description: >
 *       View logic: the job seeker is added to the job's unique viewers once, and the total view counter
 *       goes up on every open. Returns whether the user has saved or applied.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/JobId'
 *     responses:
 *       200:
 *         description: The job
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 job:
 *                   allOf:
 *                     - $ref: '#/components/schemas/JobSummary'
 *                     - type: object
 *                       properties:
 *                         jobSummary: { type: string }
 *                         jobDescription: { type: array, items: { type: string } }
 *                         jobSkills: { type: array, items: { type: string } }
 *                         additionalInterviewQuestion: { type: array, items: { type: string } }
 *       404:
 *         description: Not found, expired or not live
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
export const getJobDetails = async (req, res) => {
  try {
    if (!validId(req.params.id)) return fail(res, 404, "Job not found");
    const job = await Job.findOne({ _id: req.params.id, ...liveFilter() })
      .select(`${DETAIL_FIELDS} additionalInterviewQuestion`)
      .populate("employer", "companyName avatar aboutUs size employerType state")
      .lean();
    if (!job) return fail(res, 404, "This job is no longer open");

    // One atomic update: unique viewer (once per seeker) + total views (every open)
    const update = { $inc: { totalViews: 1 } };
    if (req.user.role === ROLES.JOBSEEKER) update.$addToSet = { uniqueViewers: req.user._id };
    await Job.updateOne({ _id: job._id }, update);

    const f = await flagsFor(req.user._id, [job._id]);
    res.json({ success: true, job: withFlags([job], f)[0] });
  } catch (err) { handle(res, err, "getJobDetails"); }
};

/**
 * @swagger
 * /jobs/public/{id}:
 *   get:
 *     tags: [Jobs]
 *     summary: View a shared job without logging in
 *     description: >
 *       Public. This is what a shared link opens. It counts one total view (anonymous visitors don't
 *       add to unique viewers). Expired or offline jobs return 404.
 *     parameters:
 *       - $ref: '#/components/parameters/JobId'
 *     responses:
 *       200:
 *         description: The job
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 job: { $ref: '#/components/schemas/JobSummary' }
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
export const viewPublicJob = async (req, res) => {
  try {
    if (!validId(req.params.id)) return fail(res, 404, "Job not found");
    const job = await Job.findOneAndUpdate(
      { _id: req.params.id, ...liveFilter() },
      { $inc: { totalViews: 1 } },
      { new: true }
    ).select(DETAIL_FIELDS).populate("employer", "companyName avatar aboutUs").lean();
    if (!job) return fail(res, 404, "This job is no longer open");
    res.json({ success: true, job });
  } catch (err) { handle(res, err, "viewPublicJob"); }
};

/**
 * @swagger
 * /jobs/{id}/like:
 *   post:
 *     tags: [Jobs]
 *     summary: Save or unsave a job (like toggle)
 *     description: >
 *       Toggles the like. Each direction runs only once per user, so the counter can't drift even with
 *       double taps. Liked jobs appear in Saved jobs.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/JobId'
 *     responses:
 *       200:
 *         description: New like state
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 liked: { type: boolean }
 *                 likeCount: { type: integer }
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
export const toggleLike = async (req, res) => {
  try {
    if (!validId(req.params.id)) return fail(res, 404, "Job not found");
    const uid = req.user._id;
    const had = await Job.exists({ _id: req.params.id, likes: uid });
    const job = await Job.findOneAndUpdate(
      had ? { _id: req.params.id, likes: uid } : { _id: req.params.id, likes: { $ne: uid } },
      had ? { $pull: { likes: uid }, $inc: { likeCount: -1 } } : { $addToSet: { likes: uid }, $inc: { likeCount: 1 } },
      { new: true }
    ).select("likeCount");
    if (!job) return fail(res, 404, "Job not found");
    res.json({ success: true, liked: !had, likeCount: Math.max(0, job.likeCount) });
  } catch (err) { handle(res, err, "toggleLike"); }
};

const SHARE_CHANNELS = ["whatsapp", "facebook", "twitter", "linkedin", "telegram", "email", "copy", "other"];

/**
 * @swagger
 * /jobs/{id}/share:
 *   post:
 *     tags: [Jobs]
 *     summary: Record that the user shared a job
 *     description: >
 *       Share logic: each user counts once per channel per job, so repeated taps can't inflate the number.
 *       Returns the link to share (it opens the public job page) and ready-made text. Totals per channel
 *       appear in the employer's analytics.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/JobId'
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               channel:
 *                 type: string
 *                 enum: [whatsapp, facebook, twitter, linkedin, telegram, email, copy, other]
 *                 default: other
 *     responses:
 *       200:
 *         description: Share recorded
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 counted: { type: boolean, description: False when this user already shared via this channel }
 *                 shareCount: { type: integer }
 *                 shareUrl: { type: string }
 *                 text: { type: string }
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
export const shareJob = async (req, res) => {
  try {
    if (!validId(req.params.id)) return fail(res, 404, "Job not found");
    const uid = req.user._id;
    const channel = SHARE_CHANNELS.includes(String(req.body.channel).toLowerCase())
      ? String(req.body.channel).toLowerCase() : "other";
    const live = { _id: req.params.id, ...liveFilter() };
    const reply = (job, counted) => res.json({
      success: true, counted, shareCount: job.shareCount || 0,
      shareUrl: `${CLIENT}/jobs/${job._id}`, text: `${job.jobTitle} is hiring on EJob`,
    });

    const job = await Job.findOneAndUpdate(
      { ...live, shares: { $not: { $elemMatch: { user: uid, channel } } } },
      { $push: { shares: { user: uid, channel, at: new Date() } }, $inc: { shareCount: 1, [`shareStats.${channel}`]: 1 } },
      { new: true }
    ).select("jobTitle shareCount");
    if (job) return reply(job, true);

    const existing = await Job.findOne(live).select("jobTitle shareCount");
    if (!existing) return fail(res, 404, "This job is no longer open");
    reply(existing, false);
  } catch (err) { handle(res, err, "shareJob"); }
};

/**
 * @swagger
 * /jobs/saved/mine:
 *   get:
 *     tags: [Jobs]
 *     summary: The job seeker's saved (liked) jobs
 *     description: Jobs that have expired are left out.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Saved jobs
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 jobs:
 *                   type: array
 *                   items: { $ref: '#/components/schemas/JobSummary' }
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
export const savedJobs = async (req, res) => {
  try {
    const jobs = await Job.find({ likes: req.user._id, ...liveFilter() })
      .sort({ updatedAt: -1 }).select(PUBLIC_FIELDS).populate("employer", "companyName avatar").lean();
    const f = await flagsFor(req.user._id, jobs.map((j) => j._id));
    res.json({ success: true, jobs: withFlags(jobs, f) });
  } catch (err) { handle(res, err, "savedJobs"); }
};

/**
 * @swagger
 * /jobs/applications/mine:
 *   get:
 *     tags: [Jobs]
 *     summary: The job seeker's applications and their progress
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Applications, newest first
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 applications:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       _id: { type: string }
 *                       position: { type: string }
 *                       status: { type: string, enum: [Applied, Shortlisted, Interviewed, Offer, Rejected, Accepted, Scheduled] }
 *                       reasonForRejection: { type: string }
 *                       createdAt: { type: string, format: date-time }
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
export const myApplications = async (req, res) => {
  try {
    const applications = await Application.find({ applicant: req.user._id })
      .sort({ createdAt: -1 })
      .select("job position status createdAt reasonForRejection companyId")
      .populate("job", "jobTitle city state status expiryDate")
      .populate("companyId", "companyName avatar")
      .lean();
    res.json({ success: true, applications });
  } catch (err) { handle(res, err, "myApplications"); }
};

/**
 * @swagger
 * /jobs/{id}/apply:
 *   post:
 *     tags: [Jobs]
 *     summary: Apply for a job
 *     description: >
 *       One application per person per job (409 if repeated). For Standard and Premium jobs the system
 *       calculates a match percentage and the employer is notified in real time and by email.
 *       Basic jobs get neither. A cover letter is required when the job asks for one.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/JobId'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ApplicationInput'
 *     responses:
 *       201:
 *         description: Application sent
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 message: { type: string }
 *                 applicationId: { type: string }
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       404:
 *         description: The job is no longer open
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       409:
 *         description: Already applied
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
export const applyToJob = async (req, res) => {
  try {
    const { availability, resume, coverLetter = "", additionalDocument = "", additionalQuestionResponse = [] } = req.body;
    if (!availability?.trim() || !resume?.trim()) return fail(res, 400, "Availability and resume are required");
    if (!validId(req.params.id)) return fail(res, 404, "Job not found");

    const job = await Job.findOne({ _id: req.params.id, ...liveFilter() });
    if (!job) return fail(res, 404, "This job is no longer open");
    if (job.requireCoverLetter && !String(coverLetter).trim()) return fail(res, 400, "A cover letter is required for this job");
    const plan = getPlan(job.jobType);

    const [seeker, employer] = await Promise.all([
      User.findById(req.user._id).populate("workExperience"),
      User.findById(job.employer).select("email address companyName"),
    ]);

    // Match percentage is calculated for Standard and Premium jobs only
    const match = plan.matchScore ? computeMatch(job, seeker) : null;

    let application;
    try {
      application = await Application.create({
        job: job._id, applicant: seeker._id, companyId: job.employer,
        companyAddress: employer?.address || "N/A", position: job.jobTitle,
        availability: availability.trim(), resume: resume.trim(), coverLetter, additionalDocument,
        additionalQuestionResponse: Array.isArray(additionalQuestionResponse) ? additionalQuestionResponse.slice(0, 10) : [],
        openForStudents: job.openForStudents,
        matchScore: match?.score ?? null, matchBreakdown: match?.breakdown ?? null,
      });
    } catch (e) {
      if (e.code === 11000) return fail(res, 409, "You've already applied for this job");
      throw e;
    }

    await Promise.all([
      Job.updateOne({ _id: job._id }, {
        $push: { applications: application._id, numberOfApplicants: seeker._id },
        $inc: { applicantCount: 1 },
      }),
      User.updateOne({ _id: seeker._id }, { $addToSet: { appliedJobs: application._id } }),
    ]);

    // Real-time and email alerts: Standard and Premium only
    if (plan.liveAlerts) {
      const name = [seeker.firstName, seeker.lastName].filter(Boolean).join(" ") || "A candidate";
      emitToUser(job.employer, "application:new", {
        jobId: job._id, jobTitle: job.jobTitle, applicant: name, matchScore: match.score,
      });
      emailUser(
        employer?.email, `New application for ${job.jobTitle}`, "New application",
        `<p><strong>${esc(name)}</strong> just applied for <strong>${esc(job.jobTitle)}</strong>.</p>
         <p>Match: <strong>${match.score}%</strong></p>`,
        { url: `${CLIENT}/dashboard`, label: "View applicant" }
      );
    }
    res.status(201).json({ success: true, message: "Application sent", applicationId: application._id });
  } catch (err) { handle(res, err, "applyToJob"); }
};

/* ================= SUPER ADMIN: APPROVAL ================= */

/**
 * @swagger
 * /jobs/admin/pending:
 *   get:
 *     tags: [Admin Jobs]
 *     summary: Jobs waiting for approval (super admin)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: The approval queue, oldest first
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 jobs:
 *                   type: array
 *                   items: { $ref: '#/components/schemas/Job' }
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
export const listPending = async (req, res) => {
  try {
    const jobs = await Job.find({ status: "Awaiting Approval" })
      .sort({ submittedAt: 1 })
      .populate("employer", "companyName email phoneNumber businessVerified addressVerified")
      .select(HIDDEN)
      .lean();
    res.json({ success: true, jobs: jobs.map((j) => ({ ...j, plan: publicPlan(j.jobType) })) });
  } catch (err) { handle(res, err, "listPending"); }
};

// Premium audiences: only runs when the employer set at least one targeting filter
const notifyTargetedSeekers = async (job) => {
  const t = job.targeting || {};
  if (!t.states?.length && !t.educationLevels?.length && !t.jobCategories?.length) return;
  const q = { role: "jobseeker", isVerified: true, isBlacklisted: false };
  if (t.states?.length) q.state = { $in: t.states };
  if (t.educationLevels?.length) q.educationLevel = { $in: t.educationLevels };
  if (t.jobCategories?.length) q.jobChoice = { $in: t.jobCategories };

  const seekers = await User.find(q).select("_id email").limit(500).lean();
  for (const s of seekers) emitToUser(s._id, "job:targeted", { jobId: job._id, jobTitle: job.jobTitle });
  for (let i = 0; i < seekers.length; i += 20) {
    await Promise.allSettled(
      seekers.slice(i, i + 20).map((s) =>
        emailUser(s.email, `New job for you: ${job.jobTitle}`, "A job that fits you",
          `<p><strong>${esc(job.jobTitle)}</strong> in ${esc(job.city)}, ${esc(job.state)} matches your profile.</p>`,
          { url: `${CLIENT}/dashboard`, label: "View job" }))
    );
  }
};

/**
 * @swagger
 * /jobs/admin/{id}/approve:
 *   post:
 *     tags: [Admin Jobs]
 *     summary: Approve a job so it goes live (super admin)
 *     description: >
 *       Sets the expiry from the job's plan (24 hours, 7 days or 1 month), marks Premium jobs as featured,
 *       awards the Premium employer 10 loyalty points once, notifies the employer, and for Premium jobs
 *       with targeting notifies the matching job seekers. Approval is atomic: two admins can't approve the same job.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/JobId'
 *     responses:
 *       200:
 *         description: The job is Online
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 job: { $ref: '#/components/schemas/Job' }
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       409:
 *         description: The job isn't waiting for approval
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
export const approveJob = async (req, res) => {
  try {
    if (!validId(req.params.id)) return fail(res, 404, "Job not found");
    const found = await Job.findById(req.params.id);
    if (!found) return fail(res, 404, "Job not found");
    const plan = getPlan(found.jobType);

    const now = new Date();
    const job = await Job.findOneAndUpdate(
      { _id: found._id, status: "Awaiting Approval" },
      { $set: {
          status: "Online", approvalDate: now, expiryDate: new Date(now.getTime() + plan.durationMs),
          reviewedBy: req.user._id, featuredJob: plan.ads, rejectionReason: "",
      } },
      { new: true }
    );
    if (!job) return fail(res, 409, "This job isn't waiting for approval");

    // Premium bonus points, paid once when the job goes live
    let pointsAwarded = 0;
    if (plan.points > 0) {
      const claimed = await Job.findOneAndUpdate({ _id: job._id, pointsAwarded: false }, { $set: { pointsAwarded: true } });
      if (claimed) {
        await User.updateOne({ _id: job.employer }, { $inc: { loyaltyPoints: plan.points } });
        pointsAwarded = plan.points;
      }
    }

    const employer = await User.findById(job.employer).select("email");
    emitToUser(job.employer, "job:approved", { jobId: job._id, jobTitle: job.jobTitle, pointsAwarded });
    emailUser(employer?.email, "Your job is live", "Your job is live",
      `<p><strong>${esc(job.jobTitle)}</strong> has been approved and is now visible to job seekers.</p>${pointsAwarded ? `<p>You earned <strong>${pointsAwarded} loyalty points</strong>.</p>` : ""}`,
      { url: `${CLIENT}/dashboard`, label: "Open dashboard" });

    if (plan.targeting) notifyTargetedSeekers(job).catch((e) => console.error("targeting:", e));
    res.json({ success: true, job: present(job) });
  } catch (err) { handle(res, err, "approveJob"); }
};

/**
 * @swagger
 * /jobs/admin/{id}/reject:
 *   post:
 *     tags: [Admin Jobs]
 *     summary: Reject a job and send it back to the employer (super admin)
 *     description: The employer is notified with the reason, can edit the job and resubmit it without paying again.
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
 *             required: [reason]
 *             properties:
 *               reason: { type: string, minLength: 5, example: Please add the salary range }
 *     responses:
 *       200:
 *         description: The job is Rejected
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 job: { $ref: '#/components/schemas/Job' }
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       409:
 *         description: The job isn't waiting for approval
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
export const rejectJob = async (req, res) => {
  try {
    const reason = String(req.body.reason || "").trim();
    if (reason.length < 5) return fail(res, 400, "Give the employer a reason (at least 5 characters)");
    if (!validId(req.params.id)) return fail(res, 404, "Job not found");

    const job = await Job.findOneAndUpdate(
      { _id: req.params.id, status: "Awaiting Approval" },
      { $set: { status: "Rejected", rejectionReason: reason, reviewedBy: req.user._id } },
      { new: true }
    );
    if (!job) return fail(res, 409, "This job isn't waiting for approval");

    const employer = await User.findById(job.employer).select("email");
    emitToUser(job.employer, "job:rejected", { jobId: job._id, jobTitle: job.jobTitle, reason });
    emailUser(employer?.email, "Your job needs changes", "Your job wasn't approved",
      `<p><strong>${esc(job.jobTitle)}</strong> needs changes before it can go live.</p><p><em>${esc(reason)}</em></p>`,
      { url: `${CLIENT}/dashboard`, label: "Edit job" });
    res.json({ success: true, job: present(job) });
  } catch (err) { handle(res, err, "rejectJob"); }
};







// ---- shared by browseJobs and getPublicJobs ----
const parseJobQuery = (query) => {
  const q = String(query.q || "").trim().slice(0, 60);
  const page = Math.max(1, parseInt(query.page) || 1);
  const limit = Math.min(30, Math.max(1, parseInt(query.limit) || 12));

  const filter = liveFilter();
  for (const k of ["state", "workType", "industry"]) if (query[k]) filter[k] = String(query[k]);
  if (q) {
    const re = new RegExp(escapeRe(q), "i");
    filter.$or = [{ jobTitle: re }, { jobFunction: re }, { industry: re }, { jobTag: re }, { city: re }];
  }
  return { filter, page, limit };
};

const findJobsPage = async ({ filter, page, limit }) => {
  const [jobs, total] = await Promise.all([
    Job.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .select(PUBLIC_FIELDS)
      .populate("employer", "companyName avatar")
      .lean(),
    Job.countDocuments(filter),
  ]);
  return { jobs, total };
};

/**
 * @swagger
 * /jobs/public:
 *   get:
 *     tags: [Jobs]
 *     summary: Browse live jobs without logging in
 *     description: >
 *       Public endpoint for the public jobs page. No token is needed. Only Online jobs
 *       that haven't expired are returned, newest first. Results are paginated
 *       (12 per page by default, 30 at most) and cached for 60 seconds.
 *     security: []
 *     parameters:
 *       - { in: query, name: q, schema: { type: string }, description: Matches title, category, industry, tags and city }
 *       - { in: query, name: state, schema: { type: string } }
 *       - { in: query, name: workType, schema: { type: string } }
 *       - { in: query, name: industry, schema: { type: string } }
 *       - { in: query, name: page, schema: { type: integer, default: 1 } }
 *       - { in: query, name: limit, schema: { type: integer, default: 12, maximum: 30 } }
 *     responses:
 *       200:
 *         description: A page of jobs
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 page: { type: integer }
 *                 total: { type: integer }
 *                 hasMore: { type: boolean }
 *                 jobs:
 *                   type: array
 *                   items: { $ref: '#/components/schemas/JobSummary' }
 *       429:
 *         description: Too many requests
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
export const getPublicJobs = async (req, res) => {
  try {
    const params = parseJobQuery(req.query);
    const { jobs, total } = await findJobsPage(params);

    // Same for every visitor, so browsers and CDNs can cache it briefly
    res.set("Cache-Control", "public, max-age=60");
    res.json({
      success: true,
      jobs,
      page: params.page,
      total,
      hasMore: params.page * params.limit < total,
    });
  } catch (err) {
    handle(res, err, "getPublicJobs");
  }
};


















































/**
 * @swagger
 * /jobs/all:
 *   get:
 *     tags: [Jobs]
 *     summary: Public job board search (login optional)
 *     description: >
 *       Live jobs only, featured first, then newest. Page 1 also returns stateCounts
 *       (jobs per state, ignoring the state filter) and industries (filter options).
 *       If a valid token is sent, each job also carries liked, applied and followed.
 *     security: []
 *     parameters:
 *       - { in: query, name: jobFunction, schema: { type: string }, description: Matches job function or title }
 *       - { in: query, name: q, schema: { type: string }, description: Matches title, function, industry, tags and city }
 *       - { in: query, name: industry, schema: { type: string } }
 *       - { in: query, name: state, schema: { type: string } }
 *       - { in: query, name: workType, schema: { type: string } }
 *       - { in: query, name: minSalary, schema: { type: number } }
 *       - { in: query, name: maxSalary, schema: { type: number } }
 *       - { in: query, name: page, schema: { type: integer, default: 1 } }
 *       - { in: query, name: limit, schema: { type: integer, default: 12, maximum: 30 } }
 *     responses:
 *       200:
 *         description: A page of jobs
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 page: { type: integer }
 *                 total: { type: integer }
 *                 hasMore: { type: boolean }
 *                 jobs: { type: array, items: { $ref: '#/components/schemas/JobSummary' } }
 *                 stateCounts:
 *                   type: array
 *                   items: { type: object, properties: { state: { type: string }, count: { type: integer } } }
 *                 industries: { type: array, items: { type: string } }
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
export const getAllJobs = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(30, Math.max(1, parseInt(req.query.limit) || 12));
    const filter = buildJobFilter(req.query);

    const [jobs, total] = await Promise.all([
      Job.find(filter)
        .sort({ featuredJob: -1, createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .select(PUBLIC_FIELDS)
        .populate("employer", "companyName avatar")
        .lean(),
      Job.countDocuments(filter),
    ]);

    const body = {
      success: true,
      jobs: await withUserFlags(req.user, jobs),
      page, total, hasMore: page * limit < total,
    };

    if (page === 1) {
      const [stateCounts, industries] = await Promise.all([
        Job.aggregate([
          { $match: buildJobFilter(req.query, { ignoreState: true }) },
          { $group: { _id: "$state", count: { $sum: 1 } } },
          { $sort: { count: -1, _id: 1 } },
        ]),
        Job.distinct("industry", liveFilter()),
      ]);
      body.stateCounts = stateCounts.map((s) => ({ state: s._id, count: s.count }));
      body.industries = industries.filter(Boolean).sort();
    }

    res.vary("Authorization");
    res.set("Cache-Control", req.user ? "private, no-store" : "public, max-age=60");
    res.json(body);
  } catch (err) {
    handle(res, err, "getAllJobs");
  }
};

/**
 * @swagger
 * /jobs/{id}/follow:
 *   post:
 *     tags: [Jobs]
 *     summary: Follow or unfollow a job (toggle)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: string } }
 *     responses:
 *       200:
 *         description: New follow state
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 followed: { type: boolean }
 *                 followCount: { type: integer }
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         description: Job not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
export const followJob = async (req, res) => {
  try {
    const { id } = req.params;
    const uid = req.user._id;

    // Conditional updates keep the count correct even with double taps
    const on = await Job.findOneAndUpdate(
      { _id: id, followers: { $ne: uid } },
      { $addToSet: { followers: uid }, $inc: { followCount: 1 } },
      { new: true }
    ).select("followCount");
    if (on) return res.json({ success: true, followed: true, followCount: on.followCount });

    const off = await Job.findOneAndUpdate(
      { _id: id, followers: uid },
      { $pull: { followers: uid }, $inc: { followCount: -1 } },
      { new: true }
    ).select("followCount");
    if (!off) return res.status(404).json({ success: false, message: "Job not found" });
    res.json({ success: true, followed: false, followCount: Math.max(0, off.followCount) });
  } catch (err) {
    handle(res, err, "followJob");
  }
};