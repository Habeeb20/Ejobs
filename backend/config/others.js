import User from "../models/User.js";
import jwt from "jsonwebtoken"
// Never fails: a missing or bad token just means "logged out"
export const optionalAuth = async (req, _res, next) => {
  try {
    const h = req.headers.authorization || "";
    if (h.startsWith("Bearer ")) {
      const { id } = jwt.verify(h.slice(7), process.env.JWT_SECRET);
      req.user = await User.findById(id).select("_id role");
    }
  } catch { /* expired or invalid token */ }
  next();
};

export const num = (v) => {
  const s = String(v ?? "").replace(/,/g, "").trim();
  return s !== "" && Number.isFinite(Number(s)) && Number(s) >= 0 ? Number(s) : null;
};

// Salary is stored as a string, so convert it before comparing
export const salaryExpr = (min, max) => ({
  $expr: {
    $let: {
      vars: {
        n: {
          $convert: {
            input: { $replaceAll: { input: { $toString: "$salary" }, find: ",", replacement: "" } },
            to: "double", onError: null, onNull: null,
          },
        },
      },
      in: {
        $and: [
          { $ne: ["$$n", null] },
          ...(min != null ? [{ $gte: ["$$n", min] }] : []),
          ...(max != null ? [{ $lte: ["$$n", max] }] : []),
        ],
      },
    },
  },
});

export const buildJobFilter = (query, { ignoreState = false } = {}) => {
  const filter = liveFilter();
  for (const k of ignoreState ? ["workType", "industry"] : ["state", "workType", "industry"]) {
    if (query[k]) filter[k] = String(query[k]);
  }

  const extra = [];
  const fn = String(query.jobFunction || "").trim().slice(0, 60);
  if (fn) {
    const re = new RegExp(escapeRe(fn), "i");
    extra.push({ $or: [{ jobFunction: re }, { jobTitle: re }] });
  }
  const q = String(query.q || "").trim().slice(0, 60);
  if (q) {
    const re = new RegExp(escapeRe(q), "i");
    extra.push({ $or: [{ jobTitle: re }, { jobFunction: re }, { industry: re }, { jobTag: re }, { city: re }] });
  }
  const min = num(query.minSalary);
  const max = num(query.maxSalary);
  if (min != null || max != null) extra.push(salaryExpr(min, max));

  if (extra.length) filter.$and = [...(filter.$and || []), ...extra];
  return filter;
};

// Adds liked / applied / followed for a logged-in user
export const withUserFlags = async (user, jobs) => {
  if (!user || !jobs.length) return jobs;
  const ids = jobs.map((j) => j._id);
  const [flags, followed] = await Promise.all([
    flagsFor(user._id, ids),
    Job.find({ _id: { $in: ids }, followers: user._id }).select("_id").lean(),
  ]);
  const followedSet = new Set(followed.map((j) => String(j._id)));
  return withFlags(jobs, flags).map((j) => ({ ...j, followed: followedSet.has(String(j._id)) }));
};







