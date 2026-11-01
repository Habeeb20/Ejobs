import User, { ROLES } from "../models/User.js";
import Job from "../models/Job.js";                   // change to your job model's file name
import Application from "../models/Application.js";   // change to your application model's file name
import Benefit from "../models/Benefit.js";           // change to your benefit model's file name

const TTL = 5 * 60 * 1000; // heavy aggregations, so cache for 5 minutes
const MIN_GROUP = 3;       // groups of people smaller than this are hidden on the public page
let cache = null;

const BLANK = ["", "none", "None", null];
const seekers = { role: ROLES.JOBSEEKER };
const employers = { role: ROLES.EMPLOYER };
const changers = { role: ROLES.JOBSEEKER, jobDecision: "jobchanger" };

/* ---------------- helpers ---------------- */

// Runs an object of promises in parallel and returns an object of results
const all = async (obj) => {
  const keys = Object.keys(obj);
  const vals = await Promise.all(Object.values(obj));
  return Object.fromEntries(keys.map((k, i) => [k, vals[i]]));
};

const count = (M, m = {}) => M.countDocuments(m);

// Most common values of a text field (case-insensitive)
const top = (M, match, field, limit = 15) =>
  M.aggregate([
    { $match: { ...match, [field]: { $exists: true, $nin: BLANK } } },
    { $group: { _id: { $toLower: { $trim: { input: `$${field}` } } }, name: { $first: `$${field}` }, value: { $sum: 1 } } },
    { $sort: { value: -1 } }, { $limit: limit },
    { $project: { _id: 0, name: 1, value: 1 } },
  ]);

// Same, for a field that holds an array of strings
const topArray = (M, match, field, limit = 15) =>
  M.aggregate([
    { $match: match },
    { $unwind: `$${field}` },
    { $match: { [field]: { $nin: BLANK } } },
    { $group: { _id: { $toLower: { $trim: { input: `$${field}` } } }, name: { $first: `$${field}` }, value: { $sum: 1 } } },
    { $sort: { value: -1 } }, { $limit: limit },
    { $project: { _id: 0, name: 1, value: 1 } },
  ]);

// Count of docs per combination of fields (state + LGA + city ...)
const combos = (M, match, fields, limit = 400) => {
  const id = Object.fromEntries(fields.map((f) => [f, { $toLower: { $trim: { input: `$${f}` } } }]));
  const label = Object.fromEntries(fields.map((f) => [f, { $first: `$${f}` }]));
  const nonBlank = Object.fromEntries(fields.map((f) => [f, { $exists: true, $nin: BLANK }]));
  return M.aggregate([
    { $match: { ...match, ...nonBlank } },
    { $group: { _id: id, ...label, value: { $sum: 1 } } },
    { $sort: { value: -1 } }, { $limit: limit },
    { $project: { _id: 0, ...Object.fromEntries(fields.map((f) => [f, 1])), value: 1 } },
  ]);
};

// Yes/no fields: how many docs have each flag set to true
const flags = async (M, match, pairs) => {
  const g = { _id: null, total: { $sum: 1 } };
  pairs.forEach(([, path], i) => { g[`f${i}`] = { $sum: { $cond: [{ $eq: [`$${path}`, true] }, 1, 0] } }; });
  const [r] = await M.aggregate([{ $match: match }, { $group: g }]);
  return pairs.map(([name], i) => ({ name, value: r?.[`f${i}`] || 0, total: r?.total || 0 }));
};

const sum = async (M, match, expr) => {
  const [r] = await M.aggregate([{ $match: match }, { $group: { _id: null, v: { $sum: expr } } }]);
  return r?.v || 0;
};

const monthKeys = (n = 12) => {
  const now = new Date();
  return Array.from({ length: n }, (_, i) =>
    new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (n - 1 - i), 1)).toISOString().slice(0, 7));
};
// Counts per month for the last 12 months (gaps filled with 0)
const monthly = async (M, match, dateField = "createdAt", amountExpr = null) => {
  const keys = monthKeys();
  const rows = await M.aggregate([
    { $match: { ...match, [dateField]: { $gte: new Date(`${keys[0]}-01T00:00:00Z`) } } },
    { $group: { _id: { $dateToString: { format: "%Y-%m", date: `$${dateField}` } }, value: { $sum: amountExpr || 1 } } },
  ]);
  const map = Object.fromEntries(rows.map((r) => [r._id, r.value]));
  return keys.map((month) => ({ month, value: map[month] || 0 }));
};

const since = (hours) => ({ $gte: new Date(Date.now() - hours * 3600 * 1000) });

// Salary is stored as text, so convert it (commas removed) before doing maths
const SAL = {
  $convert: {
    input: { $replaceAll: { input: { $ifNull: ["$salary", ""] }, find: ",", replacement: "" } },
    to: "double", onError: null, onNull: null,
  },
};
const NGN = /^(ngn|₦|naira)/i;
const toNum = (field) => ({ $convert: { input: `$${field}`, to: "double", onError: 0, onNull: 0 } });

// Applications grouped by a field of the job they were made for
const appsByJobField = (field, match = {}, limit = 15) =>
  Application.aggregate([
    { $match: match },
    { $lookup: { from: Job.collection.name, localField: "job", foreignField: "_id", as: "j" } },
    { $unwind: "$j" },
    { $match: { [`j.${field}`]: { $nin: BLANK } } },
    { $group: { _id: { $toLower: `$j.${field}` }, name: { $first: `$j.${field}` }, value: { $sum: 1 } } },
    { $sort: { value: -1 } }, { $limit: limit },
    { $project: { _id: 0, name: 1, value: 1 } },
  ]);

/* ---------------- sections ---------------- */

const kpis = () => {
  const now = new Date();
  const live = { status: "Online", expiryDate: { $gt: now } };
  return all({
    totalUsers: count(User), jobseekers: count(User, seekers), employers: count(User, employers),
    jobseekerChangers: count(User, changers),
    totalJobs: count(Job, { status: { $ne: "Draft" } }), liveJobs: count(Job, live),
    awaitingApproval: count(Job, { status: "Awaiting Approval" }),
    jobs24h: count(Job, { createdAt: since(24), status: { $ne: "Draft" } }),
    jobs7d: count(Job, { createdAt: since(24 * 7), status: { $ne: "Draft" } }),
    jobs30d: count(Job, { createdAt: since(24 * 30), status: { $ne: "Draft" } }),
    users24h: count(User, { createdAt: since(24) }), users7d: count(User, { createdAt: since(24 * 7) }),
    users30d: count(User, { createdAt: since(24 * 30) }),
    activeUsers7d: count(User, { lastLogin: since(24 * 7) }), activeUsers30d: count(User, { lastLogin: since(24 * 30) }),
    applications: count(Application), applications24h: count(Application, { createdAt: since(24) }),
    applications7d: count(Application, { createdAt: since(24 * 7) }),
    employed: count(Application, { status: "Offer" }), accepted: count(Application, { status: "Accepted" }),
    benefitRequests: count(Benefit),
    benefitsPaidAmount: sum(Benefit, { status: "paid" }, { $ifNull: ["$approvedAmount", "$amount"] }),
  });
};

// Public page: no wallet balances, points, referral counts, staff names or account flags
const usersSection = () =>
  all({
    byRole: top(User, { role: { $in: [ROLES.JOBSEEKER, ROLES.EMPLOYER] } }, "role"),
    byRegistrationMethod: top(User, {}, "registrationMethod"),
    signupsMonthly: monthly(User, {}),
    seekerSignupsMonthly: monthly(User, seekers),
    employerSignupsMonthly: monthly(User, employers),
    byState: top(User, {}, "state", 40),
    byCountry: top(User, {}, "country", 10),
  });

// Public page: no race, disability or criminal record breakdowns
const seekersSection = () =>
  all({
    total: count(User, seekers),
    byGender: top(User, seekers, "gender"),
    byMaritalStatus: top(User, seekers, "maritalStatus"),
    byEducation: top(User, seekers, "educationLevel"),
    byJobMode: top(User, seekers, "jobMode"),
    byWorkingMode: top(User, seekers, "workingMode"),
    byJobDecision: topArray(User, seekers, "jobDecision"),
    byJobChoice: topArray(User, seekers, "jobChoice", 25),
    byInterestedJob: topArray(User, seekers, "interestedJob", 15),
    topSkills: topArray(User, seekers, "cv.skills", 20),
    topLanguages: topArray(User, seekers, "cv.languages", 12),
    byHandworkSkill: top(User, seekers, "handworkSkill", 15),
    byWorkOutside: top(User, seekers, "workOutside", 5),
    byAnyChild: top(User, seekers, "anyChild", 5),
    byLiveAlone: top(User, seekers, "liveAlone", 5),
    byCvTemplate: top(User, seekers, "cv.template", 5),
    flags: flags(User, seekers, [
      ["NIN verified", "isNINVerified"], ["Certified", "isCertified"], ["Guarantor verified", "guarantorVerified"],
      ["Urgent work available", "availabilityForUrgentWork"], ["CV shows photo", "cv.showPhoto"],
    ]),
    byState: top(User, seekers, "state", 40),
    byLocation: combos(User, seekers, ["state", "localGovernment"]),
    withApplications: count(User, { ...seekers, "appliedJobs.0": { $exists: true } }),
    withBenefits: count(User, { ...seekers, "benefits.0": { $exists: true } }),
    withCvFiles: count(User, { ...seekers, "cv.pdfUrl": { $nin: BLANK } }),
  });

const changersSection = () =>
  all({
    total: count(User, changers),
    share: count(User, seekers),
    monthly: monthly(User, changers),
    byState: top(User, changers, "state", 40),
    byLocation: combos(User, changers, ["state", "localGovernment"]),
    byGender: top(User, changers, "gender"),
    byEducation: top(User, changers, "educationLevel"),
    byJobMode: top(User, changers, "jobMode"),
    byWorkingMode: top(User, changers, "workingMode"),
    byJobChoice: topArray(User, changers, "jobChoice", 20),
    topSkills: topArray(User, changers, "cv.skills", 15),
    byMaritalStatus: top(User, changers, "maritalStatus"),
    flags: flags(User, changers, [
      ["NIN verified", "isNINVerified"], ["Certified", "isCertified"], ["Urgent work available", "availabilityForUrgentWork"],
    ]),
  });

const employersSection = () =>
  all({
    total: count(User, employers),
    monthly: monthly(User, employers),
    bySize: top(User, employers, "size"),
    byType: top(User, employers, "employerType"),
    byState: top(User, employers, "state", 40),
    byLocation: combos(User, employers, ["state", "localGovernment"]),
    flags: flags(User, employers, [
      ["Address verified", "addressVerified"], ["Business verified", "businessVerified"],
      ["Identity approved", "identityVerification.approved"], ["NIN verified", "identityVerification.nin.verified"],
      ["BVN verified", "identityVerification.bvn.verified"], ["CAC verified", "identityVerification.cac.verified"],
      ["Voter's card verified", "identityVerification.votersCard.verified"],
      ["Driver's licence verified", "identityVerification.driverLicense.verified"],
      ["Passport verified", "identityVerification.passport.verified"],
    ]),
    byEstablished: User.aggregate([
      { $match: { ...employers, yearOfEstablishment: { $gt: 1900 } } },
      { $group: { _id: "$yearOfEstablishment", value: { $sum: 1 } } },
      { $sort: { _id: 1 } }, { $project: { _id: 0, name: { $toString: "$_id" }, value: 1 } },
    ]),
    followers: sum(User, employers, "$followerCount"),
    topByJobs: Job.aggregate([
      { $match: { status: { $ne: "Draft" } } },
      { $group: { _id: "$employer", jobs: { $sum: 1 }, views: { $sum: "$totalViews" }, applicants: { $sum: "$applicantCount" } } },
      { $sort: { jobs: -1 } }, { $limit: 10 },
      { $lookup: { from: User.collection.name, localField: "_id", foreignField: "_id", as: "u" } },
      { $unwind: { path: "$u", preserveNullAndEmptyArrays: true } },
      { $project: { _id: 0, name: { $ifNull: ["$u.companyName", "Unknown"] }, jobs: 1, views: 1, applicants: 1 } },
    ]),
  });

const jobsSection = () => {
  const real = { status: { $ne: "Draft" } };
  const live = { status: "Online", expiryDate: { $gt: new Date() } };
  const salLabels = ["Under 50k", "50k to 100k", "100k to 200k", "200k to 300k", "300k to 500k", "500k to 1M", "Over 1M"];
  return all({
    byStatus: top(Job, {}, "status"),
    byPlan: top(Job, real, "jobType"),
    byPayment: top(Job, real, "paymentStatus"),
    byIndustry: top(Job, real, "industry", 30),
    byFunction: top(Job, real, "jobFunction", 25),
    byWorkType: top(Job, real, "workType"),
    byLevel: top(Job, real, "jobLevel"),
    byExperience: top(Job, real, "experienceLength"),
    byQualification: top(Job, real, "minimumQualification"),
    byCurrency: top(Job, real, "currency", 6),
    byStudents: top(Job, real, "openForStudents", 5),
    bySource: top(Job, real, "jobFrom", 8),
    byVacancy: top(Job, real, "vacancyDuration", 10),
    topSkills: topArray(Job, real, "jobSkills", 25),
    topTags: topArray(Job, real, "jobTag", 20),
    monthly: monthly(Job, real),
    approvedMonthly: monthly(Job, { approvalDate: { $exists: true } }, "approvalDate"),
    flags: flags(Job, real, [
      ["Featured", "featuredJob"], ["Validated", "isValidated"], ["Virtual interview", "virtualInterview"],
      ["Cover letter required", "requireCoverLetter"], ["Documents required", "requiredDocumentUpload"], ["Starred", "isStarred"],
    ]),
    byState: top(Job, real, "state", 40),
    liveByState: top(Job, live, "state", 40),
    byLocation: combos(Job, real, ["state", "localGovernment", "city"]),
    liveByLocation: combos(Job, live, ["state", "localGovernment", "city"]),
    industryByState: combos(Job, real, ["state", "industry"], 200),
    totalOpenings: sum(Job, real, toNum("numberOfOpenings")),
    renewals: sum(Job, real, "$renewCount"),
    engagement: Job.aggregate([
      { $match: real },
      { $group: {
        _id: null, views: { $sum: "$totalViews" }, likes: { $sum: "$likeCount" }, shares: { $sum: "$shareCount" },
        follows: { $sum: "$followCount" }, applicants: { $sum: "$applicantCount" },
        whatsapp: { $sum: "$shareStats.whatsapp" }, facebook: { $sum: "$shareStats.facebook" }, twitter: { $sum: "$shareStats.twitter" },
        linkedin: { $sum: "$shareStats.linkedin" }, telegram: { $sum: "$shareStats.telegram" }, email: { $sum: "$shareStats.email" },
        copy: { $sum: "$shareStats.copy" }, other: { $sum: "$shareStats.other" },
      } },
      { $project: { _id: 0 } },
    ]).then((r) => r[0] || {}),
    topViewed: Job.find(real).sort({ totalViews: -1 }).limit(10)
      .select("jobTitle state industry totalViews likeCount shareCount applicantCount").lean(),
    salaryByCurrency: Job.aggregate([
      { $addFields: { sal: SAL } }, { $match: { sal: { $gt: 0 } } },
      { $group: { _id: "$currency", avg: { $avg: "$sal" }, min: { $min: "$sal" }, max: { $max: "$sal" }, count: { $sum: 1 } } },
      { $project: { _id: 0, currency: "$_id", avg: 1, min: 1, max: 1, count: 1 } },
    ]),
    salaryBuckets: Job.aggregate([
      { $match: { currency: NGN } }, { $addFields: { sal: SAL } }, { $match: { sal: { $gt: 0 } } },
      { $bucket: { groupBy: "$sal", boundaries: [0, 5e4, 1e5, 2e5, 3e5, 5e5, 1e6, 1e12], default: "other", output: { value: { $sum: 1 } } } },
    ]).then((rows) => rows.filter((r) => r._id !== "other")
      .map((r) => ({ name: salLabels[[0, 5e4, 1e5, 2e5, 3e5, 5e5, 1e6].indexOf(r._id)], value: r.value }))),
    salaryByState: Job.aggregate([
      { $match: { currency: NGN } }, { $addFields: { sal: SAL } }, { $match: { sal: { $gt: 0 } } },
      { $group: { _id: { $toLower: "$state" }, name: { $first: "$state" }, avg: { $avg: "$sal" }, count: { $sum: 1 } } },
      { $sort: { avg: -1 } }, { $limit: 15 }, { $project: { _id: 0, name: 1, value: { $round: ["$avg", 0] }, count: 1 } },
    ]),
    salaryByIndustry: Job.aggregate([
      { $match: { currency: NGN } }, { $addFields: { sal: SAL } }, { $match: { sal: { $gt: 0 } } },
      { $group: { _id: { $toLower: "$industry" }, name: { $first: "$industry" }, avg: { $avg: "$sal" }, count: { $sum: 1 } } },
      { $sort: { avg: -1 } }, { $limit: 15 }, { $project: { _id: 0, name: 1, value: { $round: ["$avg", 0] }, count: 1 } },
    ]),
  });
};

const applicationsSection = () => {
  const ORDER = ["Applied", "Shortlisted", "Interviewed", "Offer", "Accepted"];
  return all({
    byStatus: top(Application, {}, "status"),
    byAvailability: top(Application, {}, "availability", 10),
    byMedium: top(Application, {}, "mediumOfComm", 8),
    byStudents: top(Application, {}, "openForStudents", 5),
    byPosition: top(Application, {}, "position", 20),
    monthly: monthly(Application, {}),
    offersMonthly: monthly(Application, { status: "Offer" }),
    rejectionReasons: top(Application, { status: "Rejected" }, "reasonForRejection", 12),
    byJobState: appsByJobField("state"),
    byJobIndustry: appsByJobField("industry"),
    byJobWorkType: appsByJobField("workType", {}, 8),
    byJobPlan: appsByJobField("jobType", {}, 5),
    employedByState: appsByJobField("state", { status: "Offer" }),
    employedByIndustry: appsByJobField("industry", { status: "Offer" }),
    match: Application.aggregate([
      { $match: { matchScore: { $ne: null } } },
      { $group: { _id: null, avg: { $avg: "$matchScore" }, scored: { $sum: 1 } } }, { $project: { _id: 0 } },
    ]).then((r) => r[0] || { avg: 0, scored: 0 }),
    matchBuckets: Application.aggregate([
      { $match: { matchScore: { $ne: null } } },
      { $bucket: { groupBy: "$matchScore", boundaries: [0, 20, 40, 60, 80, 101], default: "other", output: { value: { $sum: 1 } } } },
    ]).then((rows) => rows.filter((r) => r._id !== "other")
      .map((r) => ({ name: ["0-19", "20-39", "40-59", "60-79", "80-100"][[0, 20, 40, 60, 80].indexOf(r._id)], value: r.value }))),
    avgDistance: Application.aggregate([
      { $match: { distance: { $ne: null } } }, { $group: { _id: null, avg: { $avg: "$distance" } } },
    ]).then((r) => r[0]?.avg || 0),
    topJobs: Application.aggregate([
      { $group: { _id: "$job", value: { $sum: 1 } } }, { $sort: { value: -1 } }, { $limit: 10 },
      { $lookup: { from: Job.collection.name, localField: "_id", foreignField: "_id", as: "j" } },
      { $unwind: { path: "$j", preserveNullAndEmptyArrays: true } },
      { $project: { _id: 0, name: { $ifNull: ["$j.jobTitle", "Removed job"] }, state: "$j.state", value: 1 } },
    ]),
    funnel: Application.aggregate([{ $group: { _id: "$status", value: { $sum: 1 } } }]).then((rows) => {
      const m = Object.fromEntries(rows.map((r) => [r._id, r.value]));
      const total = rows.reduce((s, r) => s + r.value, 0);
      // "reached" = this stage or any later stage
      const reached = ORDER.map((_, i) => ORDER.slice(i).reduce((s, k) => s + (m[k] || 0), 0));
      return ORDER.map((name, i) => ({ name, value: i === 0 ? total : reached[i] }));
    }),
    coverLetters: count(Application, { coverLetter: { $nin: BLANK } }),
    withDocuments: count(Application, { additionalDocument: { $nin: BLANK } }),
    interviewsBooked: sum(Application, {}, { $size: { $ifNull: ["$interviews", []] } }),
  });
};

// Public page: totals only. No rejection reasons, absence flags or per-state benefit breakdown.
const benefitsSection = () =>
  all({
    total: count(Benefit),
    byStatus: Benefit.aggregate([
      { $group: { _id: "$status", value: { $sum: 1 }, amount: { $sum: "$amount" }, approved: { $sum: { $ifNull: ["$approvedAmount", 0] } } } },
      { $project: { _id: 0, name: "$_id", value: 1, amount: 1, approved: 1 } },
    ]),
    byCategory: Benefit.aggregate([
      { $group: { _id: "$category", value: { $sum: 1 }, amount: { $sum: "$amount" }, avg: { $avg: "$amount" } } },
      { $sort: { value: -1 } }, { $project: { _id: 0, name: "$_id", value: 1, amount: 1, avg: { $round: ["$avg", 0] } } },
    ]),
    requestsMonthly: monthly(Benefit, {}),
    paidMonthly: monthly(Benefit, { status: "paid", paidAt: { $exists: true } }, "paidAt", { $ifNull: ["$approvedAmount", "$amount"] }),
    requestedAmount: sum(Benefit, {}, "$amount"),
    approvedAmount: sum(Benefit, { status: { $in: ["approved", "paid"] } }, { $ifNull: ["$approvedAmount", "$amount"] }),
    paidAmount: sum(Benefit, { status: "paid" }, { $ifNull: ["$approvedAmount", "$amount"] }),
    avgRequest: Benefit.aggregate([{ $group: { _id: null, v: { $avg: "$amount" } } }]).then((r) => r[0]?.v || 0),
    withDocuments: count(Benefit, { "supportingDocuments.0": { $exists: true } }),
    avgReviewHours: Benefit.aggregate([
      { $match: { reviewedAt: { $exists: true, $ne: null } } },
      { $group: { _id: null, v: { $avg: { $subtract: ["$reviewedAt", "$createdAt"] } } } },
    ]).then((r) => (r[0]?.v ? Math.round((r[0].v / 36e5) * 10) / 10 : 0)),
    distinctBeneficiaries: Benefit.distinct("user").then((u) => u.length),
  });

/* ---------------- privacy ---------------- */

// Hides tiny groups of people so nobody can be picked out of a small area
const bigEnough = (rows) => (rows || []).filter((r) => r.value >= MIN_GROUP);

const sanitize = (data) => {
  const { users, seekers: s, changers: c, employers: e } = data;
  users.byState = bigEnough(users.byState);
  users.byCountry = bigEnough(users.byCountry);
  for (const group of [s, c, e]) {
    group.byState = bigEnough(group.byState);
    group.byLocation = bigEnough(group.byLocation);
  }
  return data;
};

/* ---------------- handler (public) ---------------- */

export const fullAnalytics = async (req, res) => {
  try {
    if (cache && Date.now() - cache.at < TTL) {
      res.set("Cache-Control", "public, max-age=300");
      return res.json({ success: true, data: cache.data, cached: true });
    }
    const data = await all({
      kpis: kpis(), users: usersSection(), seekers: seekersSection(), changers: changersSection(),
      employers: employersSection(), jobs: jobsSection(), applications: applicationsSection(), benefits: benefitsSection(),
    });
    data.generatedAt = new Date().toISOString();
    sanitize(data);
    cache = { at: Date.now(), data };
    res.set("Cache-Control", "public, max-age=300");
    res.json({ success: true, data });
  } catch (err) {
    console.error("fullAnalytics:", err);
    res.status(500).json({ success: false, message: "Could not build the statistics" });
  }
};