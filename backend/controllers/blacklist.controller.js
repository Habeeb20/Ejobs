import mongoose from "mongoose";
import User from "../models/User.js";
import BlacklistRecord from "../models/Blacklist.js";
import { sendAccountStatusEmail } from "../utils/blacklistMail.js";
import {
  CATEGORIES,
  ELIGIBLE_ROLES,
  REASON_MAX,
  REASON_MIN,
  afterBlacklist,
  afterLift,
  displayName,
} from "../utils/blacklist.js";

const SAFE_FIELDS =
  "firstName lastName email phoneNumber role avatar companyName state localGovernment " +
  "isBlacklisted blacklistedAt blacklistedBy blacklistReason blacklistCategory createdAt";

/* ───────────── helpers ───────────── */
const clean = (v) => (typeof v === "string" ? v.trim() : "");
const fail = (res, status, message, extra = {}) => res.status(status).json({ success: false, message, ...extra });
const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const snapshot = (u) => ({ name: displayName(u), email: u.email || "", role: u.role });

// "john doe" matches first/last name, email, phone or company: every word must match something
const searchFilter = (search) => {
  const words = search.split(/\s+/).filter(Boolean).slice(0, 4);
  if (!words.length) return {};
  return {
    $and: words.map((w) => {
      const rx = new RegExp(escapeRegex(w), "i");
      return { $or: [{ firstName: rx }, { lastName: rx }, { email: rx }, { phoneNumber: rx }, { companyName: rx }] };
    }),
  };
};

const validateReason = (reason) => {
  if (reason.length < REASON_MIN) return `Give a clear reason (at least ${REASON_MIN} characters)`;
  if (reason.length > REASON_MAX) return `The reason is too long (max ${REASON_MAX} characters)`;
  return null;
};

const sendEmailQuietly = (user, type, reason) => {
  if (!user.email) return;
  sendAccountStatusEmail({ to: user.email, name: displayName(user), type, reason }).catch((err) =>
    console.error(`blacklist email (${type}) failed:`, err.message)
  );
};

/* ───────────── blacklist a user ───────────── */
export const blacklistUser = async (req, res) => {
  try {
    const { userId } = req.params;
    if (!mongoose.isValidObjectId(userId)) return fail(res, 400, "Invalid user id");

    const reason = clean(req.body.reason);
    const category = clean(req.body.category) || "other";
    const notify = req.body.notify !== false; // email the user unless told not to

    const reasonError = validateReason(reason);
    if (reasonError) return fail(res, 400, reasonError);
    if (!CATEGORIES.includes(category)) return fail(res, 400, "Choose a valid category");

    const actor = req.user;
    if (String(actor._id) === userId) return fail(res, 400, "You cannot blacklist yourself");

    const target = await User.findById(userId).select(SAFE_FIELDS);
    if (!target) return fail(res, 404, "User not found");
    if (!ELIGIBLE_ROLES.includes(target.role))
      return fail(res, 403, `${target.role} accounts cannot be blacklisted`);
    if (target.isBlacklisted) return fail(res, 409, "This user is already blacklisted");

    // The condition in the filter stops two superadmins blacklisting the same person at once
    const updated = await User.findOneAndUpdate(
      { _id: userId, isBlacklisted: { $ne: true } },
      {
        $set: {
          isBlacklisted: true,
          blacklistedAt: new Date(),
          blacklistedBy: actor._id,
          blacklistReason: reason,
          blacklistCategory: category,
        },
      },
      { new: true }
    ).select(SAFE_FIELDS);
    if (!updated) return fail(res, 409, "This user is already blacklisted");

    await BlacklistRecord.create({
      user: updated._id,
      action: "blacklist",
      reason,
      category,
      performedBy: actor._id,
      performedByName: displayName(actor),
      userSnapshot: snapshot(updated),
    });

    try {
      await afterBlacklist(updated);
    } catch (err) {
      console.error("afterBlacklist hook failed:", err);
    }
    if (notify) sendEmailQuietly(updated, "blacklisted", reason);

    res.status(201).json({ success: true, message: `${displayName(updated)} has been blacklisted`, user: updated });
  } catch (err) {
    console.error("blacklistUser:", err);
    fail(res, 500, "Could not blacklist this user. Please try again.");
  }
};

/* ───────────── lift a blacklist ───────────── */
export const liftBlacklist = async (req, res) => {
  try {
    const { userId } = req.params;
    if (!mongoose.isValidObjectId(userId)) return fail(res, 400, "Invalid user id");

    const note = clean(req.body.reason);
    const notify = req.body.notify !== false;
    const noteError = validateReason(note);
    if (noteError) return fail(res, 400, noteError.replace("reason", "note"));

    const target = await User.findById(userId).select(SAFE_FIELDS);
    if (!target) return fail(res, 404, "User not found");
    if (!target.isBlacklisted) return fail(res, 409, "This user is not blacklisted");

    const updated = await User.findOneAndUpdate(
      { _id: userId, isBlacklisted: true },
      {
        $set: {
          isBlacklisted: false,
          blacklistedAt: null,
          blacklistedBy: null,
          blacklistReason: "",
          blacklistCategory: "",
        },
      },
      { new: true }
    ).select(SAFE_FIELDS);
    if (!updated) return fail(res, 409, "This user is not blacklisted");

    await BlacklistRecord.create({
      user: updated._id,
      action: "unblacklist",
      reason: note,
      performedBy: req.user._id,
      performedByName: displayName(req.user),
      userSnapshot: snapshot(updated),
    });

    try {
      await afterLift(updated);
    } catch (err) {
      console.error("afterLift hook failed:", err);
    }
    if (notify) sendEmailQuietly(updated, "reinstated", note);

    res.json({ success: true, message: `${displayName(updated)} has been reinstated`, user: updated });
  } catch (err) {
    console.error("liftBlacklist:", err);
    fail(res, 500, "Could not lift the blacklist. Please try again.");
  }
};

/* ───────────── list blacklisted users ───────────── */
export const listBlacklisted = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 10));

    const filter = { isBlacklisted: true, ...searchFilter(clean(req.query.search)) };
    if (ELIGIBLE_ROLES.includes(req.query.role)) filter.role = req.query.role;
    if (CATEGORIES.includes(req.query.category)) filter.blacklistCategory = req.query.category;

    const [users, total] = await Promise.all([
      User.find(filter)
        .select(SAFE_FIELDS)
        .populate("blacklistedBy", "firstName lastName email")
        .sort({ blacklistedAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      User.countDocuments(filter),
    ]);

    res.json({ success: true, users, total, page, pages: Math.max(1, Math.ceil(total / limit)) });
  } catch (err) {
    console.error("listBlacklisted:", err);
    fail(res, 500, "Could not load blacklisted users");
  }
};

/* ───────────── find users who can still be blacklisted ───────────── */
export const searchEligible = async (req, res) => {
  try {
    const search = clean(req.query.search);
    if (search.length < 2) return res.json({ success: true, users: [] });

    const filter = { isBlacklisted: { $ne: true }, role: { $in: ELIGIBLE_ROLES }, ...searchFilter(search) };
    if (ELIGIBLE_ROLES.includes(req.query.role)) filter.role = req.query.role;

    const users = await User.find(filter).select(SAFE_FIELDS).sort({ createdAt: -1 }).limit(8).lean();
    res.json({ success: true, users });
  } catch (err) {
    console.error("searchEligible:", err);
    fail(res, 500, "Could not search users");
  }
};

/* ───────────── history of one user ───────────── */
export const getHistory = async (req, res) => {
  try {
    const { userId } = req.params;
    if (!mongoose.isValidObjectId(userId)) return fail(res, 400, "Invalid user id");

    const records = await BlacklistRecord.find({ user: userId }).sort({ createdAt: -1 }).limit(100).lean();
    res.json({ success: true, records });
  } catch (err) {
    console.error("getHistory:", err);
    fail(res, 500, "Could not load history");
  }
};

/* ───────────── numbers for the dashboard cards ───────────── */
export const getStats = async (req, res) => {
  try {
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [total, grouped, blacklistedLast30Days, liftedLast30Days] = await Promise.all([
      User.countDocuments({ isBlacklisted: true }),
      User.aggregate([{ $match: { isBlacklisted: true } }, { $group: { _id: "$role", count: { $sum: 1 } } }]),
      BlacklistRecord.countDocuments({ action: "blacklist", createdAt: { $gte: since } }),
      BlacklistRecord.countDocuments({ action: "unblacklist", createdAt: { $gte: since } }),
    ]);

    const byRole = Object.fromEntries(ELIGIBLE_ROLES.map((r) => [r, 0]));
    grouped.forEach((g) => {
      if (g._id in byRole) byRole[g._id] = g.count;
    });

    res.json({ success: true, stats: { total, byRole, blacklistedLast30Days, liftedLast30Days } });
  } catch (err) {
    console.error("getStats:", err);
    fail(res, 500, "Could not load statistics");
  }
};
