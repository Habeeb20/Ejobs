import mongoose from "mongoose";
import User, { ROLES } from "../models/User.js";
import Job from "../models/Job.js";
import Application from "../models/Application.js";

const handle = (fn) => (req, res) => fn(req, res).catch((e) => res.status(e.status || 500).json({ message: e.message }));
const esc = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const oid = (id) => new mongoose.Types.ObjectId(id);
const sumBy = (rows, key = "_id") => Object.fromEntries(rows.map((r) => [r[key], r.n]));

// Never sent to the browser. (identityVerification.*.number / vin / rcNumber are already select:false.)
const HIDDEN =
  "-password -resetPasswordToken -resetPaswordExpiresAt -emailOtp -otpExpiresAt -pendingToken -faceData " +
  "-followers -applicationHistory -listedJobs -postHistory -jobOffers -notifications " +
  "-email -phoneNumber -whatsappNumber -identityVerification -referralCode -referredBy -referralCount -loyaltyPoints " +
  "-uniqueNumber -registrationMethod -createdByAdmin -createdByAdminName -createdByAdminEmail -createdByMarketer " +
  "-createdByMarketerName -createdByMarketerEmail -lastLogin -isBlacklisted";

const LIST_FIELDS =
  "companyName avatar companyPhone phoneNumber address state localGovernment country size employerType " +
  "businessVerified addressVerified followerCount createdAt";

// ---------- GET /api/employers ----------
export const listEmployers = handle(async (req, res) => {
  const { search, state, verified, sort = "newest" } = req.query;
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 12));

  const filter = { role: ROLES.EMPLOYER, isBlacklisted: { $ne: true } };
  if (state) filter.state = state;
  if (verified === "true") filter.businessVerified = true;
  if (verified === "false") filter.businessVerified = { $ne: true };
  if (search?.trim()) {
    const rx = new RegExp(esc(search.trim()), "i");
    filter.$or = [{ companyName: rx }, { state: rx }, { localGovernment: rx }, { employerType: rx }];
  }
  const order = { newest: { createdAt: -1 }, oldest: { createdAt: 1 }, name: { companyName: 1 }, followers: { followerCount: -1 } }[sort] || { createdAt: -1 };

  const [employers, total] = await Promise.all([
    User.find(filter).select(LIST_FIELDS).sort(order).skip((page - 1) * limit).limit(limit).lean(),
    User.countDocuments(filter),
  ]);

  // Counts only for the employers on this page: two grouped queries, not one per company.
  const ids = employers.map((e) => e._id);
  const [jobRows, appRows] = await Promise.all([
    Job.aggregate([
      { $match: { employer: { $in: ids } } },
      { $group: { _id: "$employer", total: { $sum: 1 }, online: { $sum: { $cond: [{ $eq: ["$status", "Online"] }, 1, 0] } } } },
    ]),
    Application.aggregate([
      { $match: { companyId: { $in: ids } } },
      { $group: { _id: "$companyId", total: { $sum: 1 }, hired: { $sum: { $cond: [{ $eq: ["$status", "Hired"] }, 1, 0] } } } },
    ]),
  ]);
  const jobs = Object.fromEntries(jobRows.map((r) => [String(r._id), r]));
  const apps = Object.fromEntries(appRows.map((r) => [String(r._id), r]));

  res.json({
    employers: employers.map((e) => ({
      ...e,
      jobsPosted: jobs[e._id]?.total || 0,
      jobsOnline: jobs[e._id]?.online || 0,
      applications: apps[e._id]?.total || 0,
      hired: apps[e._id]?.hired || 0,
    })),
    total, page, pages: Math.ceil(total / limit),
  });
});

// populate only models that are actually registered, so a missing model can't crash the endpoint
const populateIfRegistered = (q, path, model) => (mongoose.modelNames().includes(model) ? q.populate(path) : q);

// ---------- GET /api/employers/:id ----------
export const getEmployer = handle(async (req, res) => {
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) return res.status(400).json({ message: "Invalid employer id" });

  let q = User.findOne({ _id: id, role: ROLES.EMPLOYER, isBlacklisted: { $ne: true } }).select(HIDDEN);
  q = populateIfRegistered(q, "contactPerson", "contact");
  q = populateIfRegistered(q, "proofOfCompany", "proofOfCompany");
  q = populateIfRegistered(q, "verification", "EmployerVerification");
  const employer = await q.lean({ virtuals: true });
  if (!employer) return res.status(404).json({ message: "Employer not found" });

  const _id = oid(id);
  const [jobStatus, jobType, jobTotals, appStatus, appSource, appPriority, perJobApps, jobs] = await Promise.all([
    Job.aggregate([{ $match: { employer: _id } }, { $group: { _id: "$status", n: { $sum: 1 } } }]),
    Job.aggregate([{ $match: { employer: _id } }, { $group: { _id: "$jobType", n: { $sum: 1 } } }]),
    Job.aggregate([{ $match: { employer: _id } }, { $group: {
      _id: null, jobs: { $sum: 1 }, views: { $sum: "$totalViews" }, likes: { $sum: "$likeCount" },
      shares: { $sum: "$shareCount" }, applicants: { $sum: "$applicantCount" }, boosted: { $sum: { $cond: ["$isBoosted", 1, 0] } },
    } }]),
    Application.aggregate([{ $match: { companyId: _id } }, { $group: { _id: "$status", n: { $sum: 1 } } }]),
    Application.aggregate([{ $match: { companyId: _id } }, { $group: { _id: "$source", n: { $sum: 1 } } }]),
    Application.countDocuments({ companyId: _id, priority: true }),
    Application.aggregate([{ $match: { companyId: _id } }, { $group: { _id: { job: "$job", status: "$status" }, n: { $sum: 1 } } }]),
    Job.find({ employer: _id, status: "Online" }).sort({ createdAt: -1 }).limit(50)
      .select("jobTitle jobType status state city salary currency expiryDate createdAt applicantCount totalViews likeCount shareCount isBoosted boost.plan")
      .lean(),
  ]);

  const perJob = {};
  for (const r of perJobApps) (perJob[r._id.job] ||= {})[r._id.status] = r.n;

  const byStatus = sumBy(appStatus);
  const totalApps = Object.values(byStatus).reduce((a, b) => a + b, 0);
  const t = jobTotals[0] || {};

  res.json({
    employer,
    jobStats: {
      total: t.jobs || 0, boosted: t.boosted || 0, views: t.views || 0, likes: t.likes || 0, shares: t.shares || 0, applicants: t.applicants || 0,
      byStatus: sumBy(jobStatus), byType: sumBy(jobType),
    },
    applicationStats: {
      total: totalApps, byStatus, bySource: sumBy(appSource), priority: appPriority,
      hireRate: totalApps ? Math.round(((byStatus.Hired || 0) / totalApps) * 1000) / 10 : 0,
    },
    jobs: jobs.map((j) => ({ ...j, applications: perJob[j._id] || {} })), // latest 50
  });
});