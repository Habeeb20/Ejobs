import mongoose from "mongoose";

import User from "../models/User.js";
import Benefit, { BENEFIT_STATUS } from "../models/Benefit.js";
import BenefitAttendance from "../models/BenefitAttendance.js";
import BenefitSetting, { getSettings } from "../models/BenefitSetting.js";
import { getRequirements } from "../utils/benefitRequirements.js";
import { categorySummary, paymentSeries, statusSummary } from "../utils/benefitStats.js";
import { enforceAttendance } from "../utils/attendanceWatcher.js";

const fail = (res, status, message, extra = {}) =>
  res.status(status).json({ success: false, message, ...extra });

const ACTIVE_STATUSES = [BENEFIT_STATUS.APPROVED, BENEFIT_STATUS.PAID];
const addDays = (date, days) => new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Only fields the reviewer needs. Password, tokens and OTP fields are never exposed.
const APPLICANT_FIELDS = [
  "firstName lastName middleName email phoneNumber whatsappNumber avatar gender dateOfBirth",
  "address state localGovernment country uniqueNumber isBlacklisted createdAt",
  "isNINVerified faceData tenancyAgreement scanningEvidence residentialCard TIN",
  "bankName bankAcctName bankAcctNum",
  "nextOfKin nextOfKinNumber nextOfKinAddress nextOfKinRelationship",
  "guarantors guarantorVerified",
  "identityVerification.nin.verified identityVerification.nin.matchedName identityVerification.nin.last4",
].join(" ");

/**
 * @swagger
 * tags:
 *   name: Benefits (Admin)
 *   description: Reviewing benefit requests, payments, statistics, settings and venue attendance
 */

/**
 * @swagger
 * /api/benefits/admin/requests:
 *   get:
 *     summary: List benefit requests (super admin)
 *     tags: [Benefits (Admin)]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [pending, approved, rejected, paid] }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *         description: Benefit number, request reference, title, or the applicant's name, email or phone
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20, maximum: 100 }
 *     responses:
 *       200:
 *         description: A page of requests with the count for each status
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 total: { type: integer }
 *                 page: { type: integer }
 *                 pages: { type: integer }
 *                 counts: { type: object }
 *                 benefits:
 *                   type: array
 *                   items: { $ref: '#/components/schemas/Benefit' }
 *       403: { description: Super admin only }
 */
export const listRequests = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);
    const { status } = req.query;
    const search = String(req.query.search ?? "").trim();

    const filter = {};
    if (Object.values(BENEFIT_STATUS).includes(status)) filter.status = status;

    if (search) {
      const rx = new RegExp(escapeRegex(search), "i");
      const users = await User.find({
        $or: [{ firstName: rx }, { lastName: rx }, { email: rx }, { phoneNumber: rx }],
      })
        .select("_id")
        .limit(200);

      filter.$or = [
        { benefitNumber: rx },
        { requestRef: rx },
        { title: rx },
        { user: { $in: users.map((u) => u._id) } },
      ];
    }

    const [benefits, total, summary] = await Promise.all([
      Benefit.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .select("-requirementsSnapshot")
        .populate("user", "firstName lastName email phoneNumber avatar isBlacklisted"),
      Benefit.countDocuments(filter),
      statusSummary(),
    ]);

    const counts = Object.fromEntries(
      Object.entries(summary.byStatus).map(([k, v]) => [k, v.count])
    );

    res.json({ success: true, total, page, pages: Math.ceil(total / limit) || 1, counts, benefits });
  } catch (err) {
    console.error("listRequests:", err);
    fail(res, 500, "Could not load benefit requests. Please try again.");
  }
};

/**
 * @swagger
 * /api/benefits/admin/requests/{id}:
 *   get:
 *     summary: Full details of one request, the applicant and every qualification requirement
 *     tags: [Benefits (Admin)]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Request, applicant profile, live requirement checklist and recent check-ins
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 benefit: { $ref: '#/components/schemas/Benefit' }
 *                 applicant: { type: object }
 *                 requirements:
 *                   type: array
 *                   items: { $ref: '#/components/schemas/Requirement' }
 *                 attendance: { type: array, items: { type: object } }
 *       404: { description: Request not found }
 */
export const getRequestDetail = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return fail(res, 404, "Request not found");

    const benefit = await Benefit.findById(req.params.id);
    if (!benefit) return fail(res, 404, "Request not found");

    const [applicant, attendance] = await Promise.all([
      User.findById(benefit.user).select(APPLICANT_FIELDS).populate("guarantors").lean(),
      BenefitAttendance.find({ user: benefit.user }).sort({ checkedInAt: -1 }).limit(30),
    ]);
    if (!applicant) return fail(res, 404, "The applicant's account no longer exists");

    res.json({
      success: true,
      benefit,
      applicant,
      requirements: getRequirements(applicant),
      attendance,
    });
  } catch (err) {
    console.error("getRequestDetail:", err);
    fail(res, 500, "Could not load this request. Please try again.");
  }
};

/**
 * @swagger
 * /api/benefits/admin/requests/{id}/approve:
 *   post:
 *     summary: Approve a pending request
 *     description: >
 *       Fails if the applicant no longer meets every requirement or is blacklisted.
 *       Approval starts the venue attendance clock.
 *     tags: [Benefits (Admin)]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               approvedAmount: { type: number, description: "Defaults to the requested amount. Cannot exceed it." }
 *               adminNote: { type: string }
 *     responses:
 *       200: { description: Approved }
 *       400: { description: Not pending, invalid amount, or requirements not met (see `missing`) }
 *       404: { description: Request not found }
 */
export const approveRequest = async (req, res) => {
  try {
    const benefit = await Benefit.findById(req.params.id);
    if (!benefit) return fail(res, 404, "Request not found");
    if (benefit.status !== BENEFIT_STATUS.PENDING)
      return fail(res, 400, "Only pending requests can be approved");

    const applicant = await User.findById(benefit.user).lean();
    if (!applicant) return fail(res, 404, "The applicant's account no longer exists");
    if (applicant.isBlacklisted) return fail(res, 400, "This applicant is blacklisted");

    const missing = getRequirements(applicant).filter((r) => !r.met);
    if (missing.length) return fail(res, 400, "The applicant no longer meets every requirement", { missing });

    const approvedAmount = Number(req.body.approvedAmount ?? benefit.amount);
    if (!Number.isFinite(approvedAmount) || approvedAmount <= 0 || approvedAmount > benefit.amount)
      return fail(res, 400, "Approved amount must be more than zero and no more than the requested amount");

    const settings = await getSettings();
    const now = new Date();

    benefit.set({
      status: BENEFIT_STATUS.APPROVED,
      approvedAmount,
      adminNote: String(req.body.adminNote ?? "").trim() || undefined,
      rejectionReason: undefined,
      reviewedBy: req.user._id,
      reviewedAt: now,
      lastAttendanceAt: now,
      nextAttendanceDue: addDays(now, settings.attendanceIntervalDays),
      absenceFlagged: false,
    });
    await benefit.save();

    res.json({ success: true, message: "Request approved", benefit });
  } catch (err) {
    console.error("approveRequest:", err);
    fail(res, 500, "Could not approve this request. Please try again.");
  }
};

/**
 * @swagger
 * /api/benefits/admin/requests/{id}/reject:
 *   post:
 *     summary: Reject a pending request
 *     tags: [Benefits (Admin)]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [reason]
 *             properties:
 *               reason: { type: string, example: Proof of residence is unclear. }
 *     responses:
 *       200: { description: Rejected }
 *       400: { description: Reason missing or request is not pending }
 *       404: { description: Request not found }
 */
export const rejectRequest = async (req, res) => {
  try {
    const reason = String(req.body.reason ?? "").trim();
    if (reason.length < 3) return fail(res, 400, "Give the applicant a reason for the rejection");

    const benefit = await Benefit.findOneAndUpdate(
      { _id: req.params.id, status: BENEFIT_STATUS.PENDING },
      {
        $set: {
          status: BENEFIT_STATUS.REJECTED,
          rejectionReason: reason,
          reviewedBy: req.user._id,
          reviewedAt: new Date(),
        },
      },
      { new: true }
    );

    if (!benefit) {
      const exists = await Benefit.exists({ _id: req.params.id });
      return exists
        ? fail(res, 400, "Only pending requests can be rejected")
        : fail(res, 404, "Request not found");
    }

    res.json({ success: true, message: "Request rejected", benefit });
  } catch (err) {
    console.error("rejectRequest:", err);
    fail(res, 500, "Could not reject this request. Please try again.");
  }
};

/**
 * @swagger
 * /api/benefits/admin/requests/{id}/pay:
 *   post:
 *     summary: Mark an approved request as paid
 *     description: >
 *       Records the payment and credits the approved amount to the job seeker's `accountBalance`.
 *       Remove the balance credit in the controller if you pay out entirely outside the app.
 *     tags: [Benefits (Admin)]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               paymentReference: { type: string, example: TRF-20261029-001 }
 *     responses:
 *       200: { description: Marked as paid }
 *       400: { description: Request is not approved }
 *       404: { description: Request not found }
 */
export const markPaid = async (req, res) => {
  try {
    const paymentReference =
      String(req.body.paymentReference ?? "").trim() || `PAY-${Date.now().toString(36).toUpperCase()}`;

    // The status filter makes a second click a no-op instead of a double payment
    const benefit = await Benefit.findOneAndUpdate(
      { _id: req.params.id, status: BENEFIT_STATUS.APPROVED },
      {
        $set: {
          status: BENEFIT_STATUS.PAID,
          paidAt: new Date(),
          paymentReference,
          paidBy: req.user._id,
        },
      },
      { new: true }
    );

    if (!benefit) {
      const exists = await Benefit.exists({ _id: req.params.id });
      return exists
        ? fail(res, 400, "Only approved requests can be marked as paid")
        : fail(res, 404, "Request not found");
    }

    await User.updateOne({ _id: benefit.user }, { $inc: { accountBalance: benefit.approvedAmount } });

    res.json({ success: true, message: "Marked as paid", benefit });
  } catch (err) {
    console.error("markPaid:", err);
    fail(res, 500, "Could not record this payment. Please try again.");
  }
};

/**
 * @swagger
 * /api/benefits/admin/stats:
 *   get:
 *     summary: Payment statistics across all beneficiaries
 *     description: Paid totals grouped daily (30 days), weekly (12), monthly (12), quarterly (8), half-yearly (6) or yearly (5).
 *     tags: [Benefits (Admin)]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: period
 *         schema: { $ref: '#/components/schemas/StatsPeriod' }
 *         description: Defaults to monthly
 *     responses:
 *       200:
 *         description: Series, status breakdown, categories and attendance counts
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 payments:
 *                   type: object
 *                   properties:
 *                     period: { type: string }
 *                     totals: { type: object }
 *                     series: { type: array, items: { type: object } }
 *                 summary: { type: object }
 *                 categories: { type: array, items: { type: object } }
 *                 attendance:
 *                   type: object
 *                   properties:
 *                     activeBeneficiaries: { type: integer }
 *                     flaggedForAbsence: { type: integer }
 */
export const getStats = async (req, res) => {
  try {
    const [payments, summary, categories, activeIds, flagged] = await Promise.all([
      paymentSeries(req.query.period),
      statusSummary(),
      categorySummary(),
      Benefit.distinct("user", { status: { $in: ACTIVE_STATUSES } }),
      Benefit.distinct("user", { status: { $in: ACTIVE_STATUSES }, absenceFlagged: true }),
    ]);

    res.json({
      success: true,
      payments,
      summary,
      categories,
      attendance: { activeBeneficiaries: activeIds.length, flaggedForAbsence: flagged.length },
    });
  } catch (err) {
    console.error("getStats:", err);
    fail(res, 500, "Could not load statistics. Please try again.");
  }
};

/**
 * @swagger
 * /api/benefits/admin/settings:
 *   get:
 *     summary: Get benefit settings
 *     tags: [Benefits (Admin)]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Current settings
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 settings: { $ref: '#/components/schemas/BenefitSettings' }
 *   put:
 *     summary: Update benefit settings (super admin)
 *     tags: [Benefits (Admin)]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/BenefitSettings' }
 *     responses:
 *       200: { description: Settings saved }
 *       400: { description: Invalid value }
 *
 * components:
 *   schemas:
 *     BenefitSettings:
 *       type: object
 *       properties:
 *         attendanceIntervalDays: { type: integer, minimum: 1, maximum: 365, example: 7 }
 *         venueName: { type: string }
 *         venueAddress: { type: string }
 *         maxBenefitAmount: { type: number, description: "0 means no limit" }
 */
export const getBenefitSettings = async (req, res) => {
  try {
    res.json({ success: true, settings: await getSettings() });
  } catch (err) {
    console.error("getBenefitSettings:", err);
    fail(res, 500, "Could not load settings. Please try again.");
  }
};

export const updateBenefitSettings = async (req, res) => {
  try {
    const interval = Number(req.body.attendanceIntervalDays);
    const max = Number(req.body.maxBenefitAmount ?? 0);

    if (!Number.isInteger(interval) || interval < 1 || interval > 365)
      return fail(res, 400, "Attendance interval must be a whole number of days between 1 and 365");
    if (!Number.isFinite(max) || max < 0) return fail(res, 400, "Maximum amount cannot be negative");

    await getSettings();
    const settings = await BenefitSetting.findOneAndUpdate(
      { key: "benefit" },
      {
        $set: {
          attendanceIntervalDays: interval,
          maxBenefitAmount: max,
          venueName: String(req.body.venueName ?? "").trim(),
          venueAddress: String(req.body.venueAddress ?? "").trim(),
          updatedBy: req.user._id,
        },
      },
      { new: true }
    );

    res.json({ success: true, message: "Settings saved", settings });
  } catch (err) {
    console.error("updateBenefitSettings:", err);
    fail(res, 500, "Could not save settings. Please try again.");
  }
};

/**
 * @swagger
 * /api/benefits/admin/attendance:
 *   post:
 *     summary: Record that a beneficiary is present at the venue
 *     description: >
 *       Looks the person up by benefit number and moves their next due date forward by the
 *       configured interval. If they were blacklisted for absence, set `liftBlacklist` to restore them.
 *     tags: [Benefits (Admin)]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [benefitNumber]
 *             properties:
 *               benefitNumber: { type: string, example: BEN-7K2M9XQA }
 *               note: { type: string }
 *               liftBlacklist: { type: boolean, default: false }
 *     responses:
 *       200: { description: Check-in recorded }
 *       400: { description: The person has no approved benefit }
 *       404: { description: Benefit number not found }
 *   get:
 *     summary: Recent venue check-ins
 *     tags: [Benefits (Admin)]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: benefitNumber
 *         schema: { type: string }
 *     responses:
 *       200: { description: Latest 50 check-ins }
 */
export const recordAttendance = async (req, res) => {
  try {
    const benefitNumber = String(req.body.benefitNumber ?? "").trim().toUpperCase();
    if (!benefitNumber) return fail(res, 400, "Enter the benefit number");

    const benefits = await Benefit.find({ benefitNumber });
    if (!benefits.length) return fail(res, 404, "No one has this benefit number");

    const active = benefits.filter((b) => ACTIVE_STATUSES.includes(b.status));
    if (!active.length) return fail(res, 400, "This person has no approved benefit to check in for");

    const userId = benefits[0].user;
    const settings = await getSettings();
    const now = new Date();
    const wasFlagged = active.some((b) => b.absenceFlagged);
    const lift = wasFlagged && Boolean(req.body.liftBlacklist);

    const update = {
      lastAttendanceAt: now,
      nextAttendanceDue: addDays(now, settings.attendanceIntervalDays),
    };
    if (lift) {
      update.absenceFlagged = false;
      update.absenceFlaggedAt = null;
    }

    await Benefit.updateMany({ _id: { $in: active.map((b) => b._id) } }, { $set: update });
    if (lift) await User.updateOne({ _id: userId }, { $set: { isBlacklisted: false } });

    await BenefitAttendance.create({
      user: userId,
      benefit: active[0]._id,
      benefitNumber,
      markedBy: req.user._id,
      checkedInAt: now,
      note: String(req.body.note ?? "").trim() || undefined,
      liftedBlacklist: lift,
    });

    const person = await User.findById(userId).select("firstName lastName");

    res.json({
      success: true,
      message: lift ? "Check-in recorded and blacklist lifted" : "Check-in recorded",
      person: person ? `${person.firstName || ""} ${person.lastName || ""}`.trim() : null,
      nextAttendanceDue: update.nextAttendanceDue,
      stillBlacklisted: wasFlagged && !lift,
    });
  } catch (err) {
    console.error("recordAttendance:", err);
    fail(res, 500, "Could not record this check-in. Please try again.");
  }
};

export const listAttendance = async (req, res) => {
  try {
    const filter = {};
    const benefitNumber = String(req.query.benefitNumber ?? "").trim().toUpperCase();
    if (benefitNumber) filter.benefitNumber = benefitNumber;

    const records = await BenefitAttendance.find(filter)
      .sort({ checkedInAt: -1 })
      .limit(50)
      .populate("user", "firstName lastName")
      .populate("markedBy", "firstName lastName");

    res.json({ success: true, records });
  } catch (err) {
    console.error("listAttendance:", err);
    fail(res, 500, "Could not load check-ins. Please try again.");
  }
};

/**
 * @swagger
 * /api/benefits/admin/attendance/enforce:
 *   post:
 *     summary: Run the absence check now
 *     description: >
 *       Blacklists every beneficiary whose venue check-in is overdue. The same check runs
 *       automatically every hour.
 *     tags: [Benefits (Admin)]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Number of people blacklisted
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 blacklisted: { type: integer }
 */
export const runAttendanceCheck = async (req, res) => {
  try {
    const result = await enforceAttendance();
    res.json({ success: true, ...result });
  } catch (err) {
    console.error("runAttendanceCheck:", err);
    fail(res, 500, "Could not run the absence check. Please try again.");
  }
};