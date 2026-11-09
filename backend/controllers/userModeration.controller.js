import mongoose from "mongoose";
import User, { ROLES } from "../models/User.js";
import jobModel from "../models/Job.js";

// Admins and superadmins can moderate these roles only.
const MODERATABLE = [ROLES.JOBSEEKER, ROLES.EMPLOYER, ROLES.AGENT];
const ACTIONS = ["verify", "unverify", "block", "unblock"];

const LIST_FIELDS =
  "role email firstName lastName companyName avatar phoneNumber state " +
  "isVerified isBlocked isBlacklisted registrationMethod lastLogin createdAt " +
  "verifiedAt verifiedBy blockedAt blockedBy blockReason";

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const toBool = (v) => (v === "true" ? true : v === "false" ? false : undefined);
const cleanReason = (r) => String(r || "").trim().slice(0, 500);

const buildUpdate = (action, actorId, reason) => {
  const now = new Date();
  switch (action) {
    case "verify":
      return { isVerified: true, verifiedAt: now, verifiedBy: actorId };
    case "unverify":
      return { isVerified: false, verifiedAt: null, verifiedBy: null };
    case "block":
      return { isBlocked: true, blockedAt: now, blockedBy: actorId, blockReason: reason };
    case "unblock":
      return { isBlocked: false, blockedAt: null, blockedBy: null, blockReason: "" };
    default:
      return null;
  }
};

const DONE = {
  verify: "Account verified.",
  unverify: "Verification removed.",
  block: "Account blocked.",
  unblock: "Account unblocked.",
};

// GET /api/admin/users?role=&search=&verified=&blocked=&page=&limit=&sort=
export const listUsers = async (req, res) => {
  try {
    const { role = "all", search = "", verified, blocked, sort = "-createdAt" } = req.query;
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);

    const filter = { role: MODERATABLE.includes(role) ? role : { $in: MODERATABLE } };

    const v = toBool(verified);
    if (v !== undefined) filter.isVerified = v;
    const b = toBool(blocked);
    if (b !== undefined) filter.isBlocked = b;

    if (search.trim()) {
      const rx = new RegExp(escapeRegex(search.trim()), "i");
      filter.$or = [
        { email: rx },
        { firstName: rx },
        { lastName: rx },
        { companyName: rx },
        { phoneNumber: rx },
      ];
    }

    const sorts = {
      "-createdAt": { createdAt: -1 },
      createdAt: { createdAt: 1 },
      "-lastLogin": { lastLogin: -1 },
      lastLogin: { lastLogin: 1 },
    };

    const [users, total, summaryRows] = await Promise.all([
      User.find(filter)
        .select(LIST_FIELDS)
        .sort(sorts[sort] || sorts["-createdAt"])
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      User.countDocuments(filter),
      User.aggregate([
        { $match: { role: { $in: MODERATABLE } } },
        {
          $group: {
            _id: "$role",
            total: { $sum: 1 },
            verified: { $sum: { $cond: [{ $eq: ["$isVerified", true] }, 1, 0] } },
            blocked: { $sum: { $cond: [{ $eq: ["$isBlocked", true] }, 1, 0] } },
          },
        },
      ]),
    ]);

    const summary = Object.fromEntries(
      MODERATABLE.map((r) => [r, { total: 0, verified: 0, blocked: 0 }])
    );
    for (const row of summaryRows) {
      summary[row._id] = { total: row.total, verified: row.verified, blocked: row.blocked };
    }

    res.json({ users, total, page, pages: Math.max(Math.ceil(total / limit), 1), summary });
  } catch (err) {
    console.error("listUsers:", err);
    res.status(500).json({ message: "Could not load users." });
  }
};

// PATCH /api/admin/users/:id/:action   (action = verify | unverify | block | unblock)
// body: { reason, takeJobsOffline }
export const moderateUser = async (req, res) => {
  try {
    const { id, action } = req.params;

    if (!ACTIONS.includes(action)) {
      return res.status(400).json({ message: "Unknown action." });
    }
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid user id." });
    }
    if (String(req.user._id) === id) {
      return res.status(400).json({ message: "You can't change your own account." });
    }

    const reason = cleanReason(req.body?.reason);
    if (action === "block" && reason.length < 3) {
      return res.status(400).json({ message: "Add a reason before blocking an account." });
    }

    const user = await User.findOneAndUpdate(
      { _id: id, role: { $in: MODERATABLE } },
      { $set: buildUpdate(action, req.user._id, reason) },
      { new: true }
    ).select(LIST_FIELDS);

    if (!user) {
      return res.status(404).json({ message: "User not found, or this role can't be moderated here." });
    }

    let jobsTakenOffline = 0;
    if (action === "block" && user.role === ROLES.EMPLOYER && req.body?.takeJobsOffline) {
      const r = await jobModel.updateMany(
        { employer: user._id, status: "Online" },
        { $set: { status: "Offline" } }
      );
      jobsTakenOffline = r.modifiedCount;
    }

    res.json({ message: DONE[action], user, jobsTakenOffline });
  } catch (err) {
    console.error("moderateUser:", err);
    res.status(500).json({ message: "Could not update this account." });
  }
};

// POST /api/admin/users/bulk
// body: { ids: [], action, reason, takeJobsOffline }
export const bulkModerate = async (req, res) => {
  try {
    const { action, takeJobsOffline } = req.body || {};
    if (!ACTIONS.includes(action)) {
      return res.status(400).json({ message: "Unknown action." });
    }

    const ids = [...new Set(req.body?.ids || [])]
      .filter((id) => mongoose.isValidObjectId(id) && String(id) !== String(req.user._id))
      .slice(0, 100);
    if (!ids.length) {
      return res.status(400).json({ message: "Select at least one account." });
    }

    const reason = cleanReason(req.body?.reason);
    if (action === "block" && reason.length < 3) {
      return res.status(400).json({ message: "Add a reason before blocking accounts." });
    }

    const filter = { _id: { $in: ids }, role: { $in: MODERATABLE } };
    const result = await User.updateMany(filter, { $set: buildUpdate(action, req.user._id, reason) });

    let jobsTakenOffline = 0;
    if (action === "block" && takeJobsOffline) {
      const employerIds = await User.find({ _id: { $in: ids }, role: ROLES.EMPLOYER }).distinct("_id");
      if (employerIds.length) {
        const r = await jobModel.updateMany(
          { employer: { $in: employerIds }, status: "Online" },
          { $set: { status: "Offline" } }
        );
        jobsTakenOffline = r.modifiedCount;
      }
    }

    res.json({
      message: `${result.modifiedCount} account(s) updated.`,
      matched: result.matchedCount,
      modified: result.modifiedCount,
      skipped: ids.length - result.matchedCount,
      jobsTakenOffline,
    });
  } catch (err) {
    console.error("bulkModerate:", err);
    res.status(500).json({ message: "Could not update these accounts." });
  }
};