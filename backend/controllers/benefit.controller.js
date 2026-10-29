import mongoose from "mongoose";

import User from "../models/User.js";
import Benefit, {
  BENEFIT_CATEGORIES,
  BENEFIT_STATUS,
  createBenefitNumber,
} from "../models/Benefit.js";
import BenefitAttendance from "../models/BenefitAttendance.js";
import { getSettings } from "../models/BenefitSetting.js";
import { getRequirements } from "../utils/benefitRequirements.js";
import { categorySummary, paymentSeries, statusSummary } from "../utils/benefitStats.js";

const fail = (res, status, message, extra = {}) =>
  res.status(status).json({ success: false, message, ...extra });

const OPEN_STATUSES = [BENEFIT_STATUS.PENDING, BENEFIT_STATUS.APPROVED];
const ACTIVE_STATUSES = [BENEFIT_STATUS.APPROVED, BENEFIT_STATUS.PAID];
const toObjectId = (id) => new mongoose.Types.ObjectId(String(id));

/**
 * @swagger
 * tags:
 *   name: Benefits
 *   description: Benefit requests made by job seekers
 *
 * components:
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 *   schemas:
 *     Requirement:
 *       type: object
 *       properties:
 *         key: { type: string, example: nin }
 *         label: { type: string, example: NIN verified }
 *         met: { type: boolean }
 *     Benefit:
 *       type: object
 *       properties:
 *         _id: { type: string }
 *         benefitNumber: { type: string, example: BEN-7K2M9XQA }
 *         requestRef: { type: string, example: REQ-4HT8N2PD }
 *         title: { type: string }
 *         description: { type: string }
 *         category: { type: string, enum: [medical, education, housing, emergency, business, other] }
 *         amount: { type: number, example: 50000 }
 *         approvedAmount: { type: number }
 *         neededBy: { type: string, format: date-time }
 *         status: { type: string, enum: [pending, approved, rejected, paid] }
 *         rejectionReason: { type: string }
 *         paidAt: { type: string, format: date-time }
 *         nextAttendanceDue: { type: string, format: date-time }
 *         absenceFlagged: { type: boolean }
 *         createdAt: { type: string, format: date-time }
 *     StatsPeriod:
 *       type: string
 *       enum: [daily, weekly, monthly, quarterly, half_year, yearly]
 */

/**
 * @swagger
 * /api/benefits/eligibility:
 *   get:
 *     summary: Check whether the logged-in job seeker qualifies to request a benefit
 *     tags: [Benefits]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Checklist with the result for each requirement
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 eligible: { type: boolean }
 *                 blacklisted: { type: boolean }
 *                 benefitNumber: { type: string, nullable: true }
 *                 maxAmount: { type: number, description: "0 means no limit" }
 *                 openRequest: { type: object, nullable: true }
 *                 requirements:
 *                   type: array
 *                   items: { $ref: '#/components/schemas/Requirement' }
 *       401: { description: Not logged in }
 */
export const getEligibility = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).lean();
    if (!user) return fail(res, 404, "User not found");

    const [settings, openRequest, existing] = await Promise.all([
      getSettings(),
      Benefit.findOne({ user: user._id, status: { $in: OPEN_STATUSES } }).select("requestRef status"),
      Benefit.findOne({ user: user._id }).select("benefitNumber"),
    ]);

    const requirements = getRequirements(user);
    const allMet = requirements.every((r) => r.met);

    res.json({
      success: true,
      eligible: allMet && !user.isBlacklisted && !openRequest,
      requirements,
      blacklisted: Boolean(user.isBlacklisted),
      openRequest,
      maxAmount: settings.maxBenefitAmount,
      benefitNumber: existing?.benefitNumber || null,
    });
  } catch (err) {
    console.error("getEligibility:", err);
    fail(res, 500, "Could not check your eligibility. Please try again.");
  }
};

/**
 * @swagger
 * /api/benefits:
 *   post:
 *     summary: Request a benefit
 *     description: >
 *       Only job seekers who meet every requirement (NIN, face, proof of residence, account number,
 *       next of kin, guarantor, TIN, residential card) and are not blacklisted can request.
 *       The first request creates the person's unique benefit number; later requests reuse it.
 *     tags: [Benefits]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, description, amount]
 *             properties:
 *               title: { type: string, example: School fees for my daughter }
 *               description: { type: string, example: Second term fees and books. }
 *               category: { type: string, enum: [medical, education, housing, emergency, business, other] }
 *               amount: { type: number, example: 50000 }
 *               neededBy: { type: string, format: date }
 *     responses:
 *       201:
 *         description: Request created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 message: { type: string }
 *                 benefit: { $ref: '#/components/schemas/Benefit' }
 *       400: { description: Invalid input, or requirements are missing (returned in `missing`) }
 *       403: { description: Account is blacklisted }
 *       409: { description: There is already a pending or approved request }
 */
export const createBenefit = async (req, res) => {
  try {
    const title = String(req.body.title ?? "").trim();
    const description = String(req.body.description ?? "").trim();
    const category = BENEFIT_CATEGORIES.includes(req.body.category) ? req.body.category : "other";
    const amount = Number(req.body.amount);
    const neededBy = req.body.neededBy ? new Date(req.body.neededBy) : undefined;

    if (title.length < 3) return fail(res, 400, "Enter a title of at least 3 characters");
    if (description.length < 10) return fail(res, 400, "Describe why you need this benefit (at least 10 characters)");
    if (!Number.isFinite(amount) || amount <= 0) return fail(res, 400, "Enter an amount greater than zero");
    if (neededBy && Number.isNaN(neededBy.getTime())) return fail(res, 400, "Enter a valid date");

    const user = await User.findById(req.user._id);
    if (!user) return fail(res, 404, "User not found");
    if (user.isBlacklisted)
      return fail(res, 403, "Your account is blacklisted, so you can't request a benefit right now.");

    const requirements = getRequirements(user);
    const missing = requirements.filter((r) => !r.met);
    if (missing.length)
      return fail(res, 400, "Complete all requirements before requesting a benefit", { missing });

    const settings = await getSettings();
    if (settings.maxBenefitAmount > 0 && amount > settings.maxBenefitAmount)
      return fail(res, 400, `The most you can request is ₦${settings.maxBenefitAmount.toLocaleString("en-NG")}`);

    const open = await Benefit.findOne({ user: user._id, status: { $in: OPEN_STATUSES } });
    if (open) return fail(res, 409, "You already have a request in progress. Wait for it to be completed first.");

    const previous = await Benefit.findOne({ user: user._id }).select("benefitNumber");
    const benefitNumber = previous?.benefitNumber || (await createBenefitNumber());

    const benefit = await Benefit.create({
      user: user._id,
      benefitNumber,
      title,
      description,
      category,
      amount,
      neededBy,
      requirementsSnapshot: requirements,
    });

    await User.updateOne({ _id: user._id }, { $addToSet: { benefits: benefit._id } });

    res.status(201).json({ success: true, message: "Benefit request submitted", benefit });
  } catch (err) {
    console.error("createBenefit:", err);
    fail(res, 500, "Could not submit your request. Please try again.");
  }
};

/**
 * @swagger
 * /api/benefits/mine:
 *   get:
 *     summary: List the logged-in job seeker's benefit requests
 *     tags: [Benefits]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Requests, newest first
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 benefitNumber: { type: string, nullable: true }
 *                 benefits:
 *                   type: array
 *                   items: { $ref: '#/components/schemas/Benefit' }
 */
export const getMyBenefits = async (req, res) => {
  try {
    const benefits = await Benefit.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .select("-requirementsSnapshot");

    res.json({ success: true, benefitNumber: benefits[0]?.benefitNumber || null, benefits });
  } catch (err) {
    console.error("getMyBenefits:", err);
    fail(res, 500, "Could not load your benefits. Please try again.");
  }
};

/**
 * @swagger
 * /api/benefits/mine/stats:
 *   get:
 *     summary: Benefit statistics for the logged-in job seeker
 *     description: Totals by status, spending by category and a payment series for the chosen period.
 *     tags: [Benefits]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: period
 *         schema: { $ref: '#/components/schemas/StatsPeriod' }
 *         description: Defaults to monthly
 *     responses:
 *       200:
 *         description: Statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 summary:
 *                   type: object
 *                   properties:
 *                     totalRequests: { type: integer }
 *                     totalPaid: { type: number }
 *                     byStatus: { type: object }
 *                 categories:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       category: { type: string }
 *                       count: { type: integer }
 *                       amount: { type: number }
 *                 payments:
 *                   type: object
 *                   properties:
 *                     period: { type: string }
 *                     totals: { type: object }
 *                     series:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           key: { type: string }
 *                           label: { type: string }
 *                           amount: { type: number }
 *                           count: { type: integer }
 */
export const getMyStats = async (req, res) => {
  try {
    const match = { user: toObjectId(req.user._id) };
    const [payments, summary, categories] = await Promise.all([
      paymentSeries(req.query.period, match),
      statusSummary(match),
      categorySummary(match),
    ]);

    res.json({ success: true, summary, categories, payments });
  } catch (err) {
    console.error("getMyStats:", err);
    fail(res, 500, "Could not load your statistics. Please try again.");
  }
};

/**
 * @swagger
 * /api/benefits/mine/attendance:
 *   get:
 *     summary: Venue attendance status for the logged-in job seeker
 *     description: >
 *       Beneficiaries must be at the venue at least once every `intervalDays`. Missing a check-in
 *       blacklists the account from all employers until an admin lifts it.
 *     tags: [Benefits]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Attendance status and recent check-ins
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 tracked: { type: boolean, description: "true once a benefit has been approved" }
 *                 intervalDays: { type: integer }
 *                 venueName: { type: string }
 *                 venueAddress: { type: string }
 *                 lastAttendanceAt: { type: string, format: date-time, nullable: true }
 *                 nextAttendanceDue: { type: string, format: date-time, nullable: true }
 *                 absenceFlagged: { type: boolean }
 *                 blacklisted: { type: boolean }
 *                 history: { type: array, items: { type: object } }
 */
export const getMyAttendance = async (req, res) => {
  try {
    const [settings, active, history, user] = await Promise.all([
      getSettings(),
      Benefit.findOne({ user: req.user._id, status: { $in: ACTIVE_STATUSES } })
        .sort({ updatedAt: -1 })
        .select("lastAttendanceAt nextAttendanceDue absenceFlagged"),
      BenefitAttendance.find({ user: req.user._id })
        .sort({ checkedInAt: -1 })
        .limit(20)
        .select("checkedInAt note"),
      User.findById(req.user._id).select("isBlacklisted"),
    ]);

    res.json({
      success: true,
      tracked: Boolean(active),
      intervalDays: settings.attendanceIntervalDays,
      venueName: settings.venueName,
      venueAddress: settings.venueAddress,
      lastAttendanceAt: active?.lastAttendanceAt || null,
      nextAttendanceDue: active?.nextAttendanceDue || null,
      absenceFlagged: Boolean(active?.absenceFlagged),
      blacklisted: Boolean(user?.isBlacklisted),
      history,
    });
  } catch (err) {
    console.error("getMyAttendance:", err);
    fail(res, 500, "Could not load your attendance. Please try again.");
  }
};