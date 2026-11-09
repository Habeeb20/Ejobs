import User from "../models/User.js";
import jobModel from "../models/Job.js";
import applicationModel from "../models/Application.js";

/* ------------------------------------------------------------------ */
/* Shared helpers                                                      */
/* ------------------------------------------------------------------ */

const TZ = "Africa/Lagos";
const DAY = 864e5;
const FORMATS = { day: "%Y-%m-%d", week: "%G-W%V", month: "%Y-%m" };
const UNKNOWN_VALUES = [null, "", "none", "None", "N/A"];

// ?from=2026-01-01&to=2026-03-31 limits every figure to documents created in that window
const rangeMatch = ({ from, to } = {}) => {
  const range = {};
  const f = from ? new Date(from) : null;
  const t = to ? new Date(to) : null;
  if (f && !isNaN(f)) range.$gte = f;
  if (t && !isNaN(t)) {
    t.setUTCHours(23, 59, 59, 999);
    range.$lte = t;
  }
  return Object.keys(range).length ? { createdAt: range } : {};
};

const intervalOf = (q = {}) => (FORMATS[q.interval] ? q.interval : "month");

const period = (field, interval) => ({
  $dateToString: { format: FORMATS[interval], date: field, timezone: TZ },
});

// Missing, empty and "none" values are grouped as "Unknown"
const label = (field) => ({
  $cond: [{ $in: [{ $ifNull: [`$${field}`, null] }, UNKNOWN_VALUES] }, "Unknown", `$${field}`],
});

const countIf = (cond) => ({ $sum: { $cond: [cond, 1, 0] } });
const isTrue = (f) => ({ $eq: [`$${f}`, true] });
const isStatus = (s) => ({ $eq: ["$status", s] });
const hasItems = (f) => ({ $gt: [{ $size: { $ifNull: [`$${f}`, []] } }, 0] });
const hasText = (f) => ({ $gt: [{ $strLenCP: { $ifNull: [`$${f}`, ""] } }, 0] });
const isSet = (f) => ({ $ne: [{ $ifNull: [`$${f}`, null] }, null] });

const countBy = (expr, limit = 0) => [
  { $group: { _id: expr, count: { $sum: 1 } } },
  { $sort: { count: -1, _id: 1 } },
  ...(limit ? [{ $limit: limit }] : []),
];

const crossTab = (rowExpr, colExpr) => [
  { $group: { _id: { row: rowExpr, ...(colExpr ? { col: colExpr } : {}) }, count: { $sum: 1 } } },
];

const timeline = (field, interval, colExpr) => [
  { $match: { [field]: { $type: "date" } } },
  ...crossTab(period(`$${field}`, interval), colExpr),
  { $sort: { "_id.row": 1 } },
];

const named = (rows = []) => rows.map((r) => ({ name: String(r._id), value: r.count }));

const pivot = (rows = [], rowName = "name") => {
  const map = new Map();
  for (const r of rows) {
    const row = r._id.row ?? "Unknown";
    const col = r._id.col ?? "total";
    const entry = map.get(row) || { [rowName]: row };
    entry[col] = (entry[col] || 0) + r.count;
    map.set(row, entry);
  }
  return [...map.values()];
};

const one = (rows) => {
  const { _id, ...rest } = rows?.[0] || {};
  return rest;
};

const rate = (part, whole) => (whole ? Math.round((part / whole) * 1000) / 10 : 0);

const fullName = (p) => ({
  $trim: {
    input: {
      $concat: [{ $ifNull: [`${p}firstName`, ""] }, " ", { $ifNull: [`${p}lastName`, ""] }],
    },
  },
});
const whoName = { $ifNull: ["$u.companyName", fullName("$u.")] };

const lookupUser = (localField = "_id") => [
  { $lookup: { from: User.collection.name, localField, foreignField: "_id", as: "u" } },
  { $unwind: { path: "$u", preserveNullAndEmptyArrays: true } },
];

const fail = (res, name, err) => {
  console.error(`${name}:`, err);
  res.status(500).json({ message: "Could not build these statistics." });
};

/* ------------------------------------------------------------------ */
/* USERS   GET /api/admin/stats/users                                  */
/* ------------------------------------------------------------------ */

export const getUserStats = async (req, res) => {
  try {
    const interval = intervalOf(req.query);
    const ago = (d) => new Date(Date.now() - d * DAY);
    const role = (r) => ({ $match: { role: r } });

    const creators = (field) => [
      { $match: { [field]: { $ne: null } } },
      { $group: { _id: `$${field}`, count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
      ...lookupUser(),
      { $project: { count: 1, role: "$u.role", email: "$u.email", name: whoName } },
    ];

    const [out] = await User.aggregate([
      { $match: rangeMatch(req.query) },
      {
        $facet: {
          overview: [
            {
              $group: {
                _id: null,
                total: { $sum: 1 },
                verified: countIf(isTrue("isVerified")),
                blocked: countIf(isTrue("isBlocked")),
                blacklisted: countIf(isTrue("isBlacklisted")),
                certified: countIf(isTrue("isCertified")),
                ninVerified: countIf(isTrue("isNINVerified")),
                identityApproved: countIf(isTrue("identityVerification.approved")),
                welcomeBonusGiven: countIf(isTrue("welcomeBonusGiven")),
                referredUsers: countIf(isSet("referredBy")),
                referralCount: { $sum: "$referralCount" },
                loyaltyPoints: { $sum: "$loyaltyPoints" },
                accountBalance: { $sum: "$accountBalance" },
                active24h: countIf({ $gte: ["$lastLogin", ago(1)] }),
                active7d: countIf({ $gte: ["$lastLogin", ago(7)] }),
                active30d: countIf({ $gte: ["$lastLogin", ago(30)] }),
                active90d: countIf({ $gte: ["$lastLogin", ago(90)] }),
              },
            },
          ],
          byRole: countBy("$role"),
          roleStatus: [
            {
              $group: {
                _id: "$role",
                total: { $sum: 1 },
                verified: countIf(isTrue("isVerified")),
                blocked: countIf(isTrue("isBlocked")),
                blacklisted: countIf(isTrue("isBlacklisted")),
              },
            },
            { $sort: { total: -1 } },
          ],
          byRegistration: countBy(label("registrationMethod")),
          byState: countBy(label("state"), 15),
          signups: timeline("createdAt", interval, "$role"),

          jobseekerOverview: [
            role("jobseeker"),
            {
              $group: {
                _id: null,
                total: { $sum: 1 },
                withCv: countIf(hasText("cv.pdfUrl")),
                withResume: countIf(hasItems("resume")),
                withGuarantor: countIf(hasItems("guarantors")),
                hasApplied: countIf(hasItems("appliedJobs")),
                hasBeenHired: countIf(hasItems("hiredHistory")),
                ninVerified: countIf(isTrue("isNINVerified")),
                certified: countIf(isTrue("isCertified")),
                guarantorVerified: countIf(isTrue("guarantorVerified")),
                urgentAvailable: countIf(isTrue("availabilityForUrgentWork")),
                avgApplications: { $avg: { $size: { $ifNull: ["$appliedJobs", []] } } },
              },
            },
          ],
          gender: [role("jobseeker"), ...countBy(label("gender"))],
          education: [role("jobseeker"), ...countBy(label("educationLevel"))],
          marital: [role("jobseeker"), ...countBy(label("maritalStatus"))],
          jobseekerState: [role("jobseeker"), ...countBy(label("state"), 15)],
          jobMode: [role("jobseeker"), ...countBy(label("jobMode"))],
          jobDecision: [role("jobseeker"), { $unwind: "$jobDecision" }, ...countBy("$jobDecision")],
          interestedJob: [role("jobseeker"), { $unwind: "$interestedJob" }, ...countBy("$interestedJob", 15)],

          employerOverview: [
            role("employer"),
            {
              $group: {
                _id: null,
                total: { $sum: 1 },
                businessVerified: countIf(isTrue("businessVerified")),
                addressVerified: countIf(isTrue("addressVerified")),
                identityApproved: countIf(isTrue("identityVerification.approved")),
                withListedJobs: countIf(hasItems("listedJobs")),
                totalFollowers: { $sum: "$followerCount" },
              },
            },
          ],
          employerSize: [role("employer"), ...countBy(label("size"))],
          employerType: [role("employer"), ...countBy(label("employerType"))],
          employerState: [role("employer"), ...countBy(label("state"), 15)],

          topCreators: creators("createdByAdmin"),
          topMarketers: creators("createdByMarketer"),
          topReferrers: [
            { $match: { referralCount: { $gt: 0 } } },
            { $sort: { referralCount: -1 } },
            { $limit: 10 },
            {
              $project: {
                role: 1,
                email: 1,
                count: "$referralCount",
                name: { $ifNull: ["$companyName", fullName("$")] },
              },
            },
          ],
          topFollowedEmployers: [
            role("employer"),
            { $match: { followerCount: { $gt: 0 } } },
            { $sort: { followerCount: -1 } },
            { $limit: 10 },
            { $project: { email: 1, name: "$companyName", count: "$followerCount" } },
          ],
        },
      },
    ]).allowDiskUse(true);

    res.json({
      generatedAt: new Date(),
      interval,
      overview: one(out.overview),
      byRole: named(out.byRole),
      roleStatus: out.roleStatus.map(({ _id, ...r }) => ({ role: _id, ...r })),
      byRegistration: named(out.byRegistration),
      byState: named(out.byState),
      signups: pivot(out.signups, "period"),
      jobseekers: {
        overview: one(out.jobseekerOverview),
        gender: named(out.gender),
        education: named(out.education),
        marital: named(out.marital),
        state: named(out.jobseekerState),
        jobMode: named(out.jobMode),
        jobDecision: named(out.jobDecision),
        interestedJob: named(out.interestedJob),
      },
      employers: {
        overview: one(out.employerOverview),
        size: named(out.employerSize),
        type: named(out.employerType),
        state: named(out.employerState),
      },
      topCreators: out.topCreators,
      topMarketers: out.topMarketers,
      topReferrers: out.topReferrers,
      topFollowedEmployers: out.topFollowedEmployers,
    });
  } catch (err) {
    fail(res, "getUserStats", err);
  }
};

/* ------------------------------------------------------------------ */
/* JOBS   GET /api/admin/stats/jobs                                    */
/* ------------------------------------------------------------------ */

export const getJobStats = async (req, res) => {
  try {
    const interval = intervalOf(req.query);
    const now = new Date();
    const in7Days = new Date(now.getTime() + 7 * DAY);
    const approvalHours = { $divide: [{ $subtract: ["$approvalDate", "$submittedAt"] }, 36e5] };
    const hasApprovalTimes = { $match: { approvalDate: { $type: "date" }, submittedAt: { $type: "date" } } };

    const topJobs = (sortField) => [
      { $match: { [sortField]: { $gt: 0 } } },
      { $sort: { [sortField]: -1 } },
      { $limit: 10 },
      ...lookupUser("employer"),
      {
        $project: {
          title: "$jobTitle",
          plan: "$jobType",
          status: 1,
          applicants: { $ifNull: ["$applicantCount", 0] },
          views: { $ifNull: ["$totalViews", 0] },
          shares: { $ifNull: ["$shareCount", 0] },
          employer: "$u.companyName",
        },
      },
    ];

    const [out] = await jobModel.aggregate([
      { $match: rangeMatch(req.query) },
      {
        $facet: {
          overview: [
            {
              $group: {
                _id: null,
                total: { $sum: 1 },
                online: countIf(isStatus("Online")),
                awaitingApproval: countIf(isStatus("Awaiting Approval")),
                draft: countIf(isStatus("Draft")),
                offline: countIf(isStatus("Offline")),
                rejected: countIf(isStatus("Rejected")),
                expiredStillOnline: countIf({
                  $and: [isStatus("Online"), { $lt: [{ $ifNull: ["$expiryDate", now] }, now] }],
                }),
                expiringIn7Days: countIf({
                  $and: [
                    isStatus("Online"),
                    { $gte: ["$expiryDate", now] },
                    { $lte: ["$expiryDate", in7Days] },
                  ],
                }),
                paid: countIf({ $eq: ["$paymentStatus", "Paid"] }),
                paymentPending: countIf({ $eq: ["$paymentStatus", "Pending"] }),
                free: countIf({ $eq: ["$paymentStatus", "Free"] }),
                featured: countIf(isTrue("featuredJob")),
                boosted: countIf(isTrue("isBoosted")),
                withTargeting: countIf(isSet("targeting")),
                virtualInterview: countIf(isTrue("virtualInterview")),
                requireCoverLetter: countIf(isTrue("requireCoverLetter")),
                requireDocuments: countIf(isTrue("requiredDocumentUpload")),
                starred: countIf(isTrue("isStarred")),
                renewedJobs: countIf({ $gt: [{ $ifNull: ["$renewCount", 0] }, 0] }),
                renewals: { $sum: "$renewCount" },
                zeroApplicants: countIf({ $eq: [{ $ifNull: ["$applicantCount", 0] }, 0] }),
                totalApplicants: { $sum: "$applicantCount" },
                avgApplicants: { $avg: { $ifNull: ["$applicantCount", 0] } },
                totalViews: { $sum: "$totalViews" },
                uniqueViews: { $sum: { $size: { $ifNull: ["$uniqueViewers", []] } } },
                likes: { $sum: "$likeCount" },
                follows: { $sum: "$followCount" },
                shares: { $sum: "$shareCount" },
                reports: { $sum: { $size: { $ifNull: ["$reports", []] } } },
                boostRevenue: { $sum: "$boost.paidAmount" },
              },
            },
          ],
          shareChannels: [
            {
              $group: {
                _id: null,
                WhatsApp: { $sum: "$shareStats.whatsapp" },
                Facebook: { $sum: "$shareStats.facebook" },
                Twitter: { $sum: "$shareStats.twitter" },
                LinkedIn: { $sum: "$shareStats.linkedin" },
                Telegram: { $sum: "$shareStats.telegram" },
                Email: { $sum: "$shareStats.email" },
                "Copied link": { $sum: "$shareStats.copy" },
                Other: { $sum: "$shareStats.other" },
              },
            },
          ],
          approval: [
            hasApprovalTimes,
            {
              $group: {
                _id: null,
                count: { $sum: 1 },
                avgHours: { $avg: approvalHours },
                minHours: { $min: approvalHours },
                maxHours: { $max: approvalHours },
              },
            },
          ],
          approvalByPlan: [
            hasApprovalTimes,
            { $group: { _id: "$jobType", avgHours: { $avg: approvalHours }, count: { $sum: 1 } } },
          ],

          byStatus: countBy("$status"),
          byPlan: countBy("$jobType"),
          byPayment: countBy("$paymentStatus"),
          planStatus: crossTab("$jobType", "$status"),
          byState: countBy(label("state"), 15),
          byCity: countBy(label("city"), 15),
          byIndustry: countBy(label("industry"), 15),
          byFunction: countBy(label("jobFunction"), 15),
          byWorkType: countBy(label("workType")),
          byQualification: countBy(label("minimumQualification")),
          byExperience: countBy(label("experienceLength")),
          byLevel: countBy(label("jobLevel")),
          byCurrency: countBy(label("currency")),
          byStudents: countBy(label("openForStudents")),
          bySource: countBy(label("jobFrom")),
          boostPlans: [
            { $match: { "boost.plan": { $exists: true, $ne: null } } },
            {
              $group: {
                _id: "$boost.plan",
                jobs: { $sum: 1 },
                revenue: { $sum: "$boost.paidAmount" },
                extraDays: { $sum: "$boost.extraDays" },
                applicants: { $sum: "$applicantCount" },
              },
            },
          ],

          created: timeline("createdAt", interval, "$jobType"),
          approved: timeline("approvalDate", interval),
          boostTimeline: [
            { $match: { "boost.boostedAt": { $type: "date" } } },
            {
              $group: {
                _id: period("$boost.boostedAt", interval),
                revenue: { $sum: "$boost.paidAmount" },
                boosts: { $sum: 1 },
              },
            },
            { $sort: { _id: 1 } },
          ],

          topEmployers: [
            {
              $group: {
                _id: "$employer",
                jobs: { $sum: 1 },
                online: countIf(isStatus("Online")),
                applicants: { $sum: "$applicantCount" },
                views: { $sum: "$totalViews" },
              },
            },
            { $sort: { jobs: -1 } },
            { $limit: 10 },
            ...lookupUser(),
            { $project: { jobs: 1, online: 1, applicants: 1, views: 1, email: "$u.email", name: "$u.companyName" } },
          ],
          topByApplicants: topJobs("applicantCount"),
          topByViews: topJobs("totalViews"),
          topByShares: topJobs("shareCount"),
        },
      },
    ]).allowDiskUse(true);

    const overview = one(out.overview);
    const approval = one(out.approval);

    res.json({
      generatedAt: now,
      interval,
      overview: {
        ...overview,
        viewsPerApplicant: overview.totalApplicants ? +(overview.totalViews / overview.totalApplicants).toFixed(1) : 0,
      },
      approval,
      approvalByPlan: out.approvalByPlan.map((r) => ({
        name: r._id,
        value: +(r.avgHours || 0).toFixed(1),
        count: r.count,
      })),
      shareChannels: Object.entries(one(out.shareChannels)).map(([name, value]) => ({ name, value })),
      byStatus: named(out.byStatus),
      byPlan: named(out.byPlan),
      byPayment: named(out.byPayment),
      planStatus: pivot(out.planStatus, "plan"),
      byState: named(out.byState),
      byCity: named(out.byCity),
      byIndustry: named(out.byIndustry),
      byFunction: named(out.byFunction),
      byWorkType: named(out.byWorkType),
      byQualification: named(out.byQualification),
      byExperience: named(out.byExperience),
      byLevel: named(out.byLevel),
      byCurrency: named(out.byCurrency),
      byStudents: named(out.byStudents),
      bySource: named(out.bySource),
      boostPlans: out.boostPlans.map(({ _id, ...r }) => ({ plan: _id, ...r })),
      created: pivot(out.created, "period"),
      approved: pivot(out.approved, "period"),
      boostTimeline: out.boostTimeline.map((r) => ({ period: r._id, revenue: r.revenue, boosts: r.boosts })),
      topEmployers: out.topEmployers,
      topByApplicants: out.topByApplicants,
      topByViews: out.topByViews,
      topByShares: out.topByShares,
    });
  } catch (err) {
    fail(res, "getJobStats", err);
  }
};

/* ------------------------------------------------------------------ */
/* APPLICATIONS   GET /api/admin/stats/applications                    */
/* ------------------------------------------------------------------ */

const MATCH_LABELS = { 0: "0–19", 20: "20–39", 40: "40–59", 60: "60–79", 80: "80–100", none: "Not scored" };
const DISTANCE_LABELS = { 0: "Under 5 km", 5: "5–9 km", 10: "10–24 km", 25: "25–49 km", 50: "50–99 km", 100: "100 km +", none: "Unknown" };

const bucketRows = (rows = [], labels) =>
  rows.map((r) => ({ name: labels[r._id] ?? String(r._id), value: r.count }));

export const getApplicationStats = async (req, res) => {
  try {
    const interval = intervalOf(req.query);
    const match = rangeMatch(req.query);

    const topBy = (groupField, extra = {}) => [
      {
        $group: {
          _id: `$${groupField}`,
          applications: { $sum: 1 },
          hired: countIf(isStatus("Hired")),
          shortlisted: countIf({ $in: ["$status", ["Shortlisted", "Interviewed", "Scheduled", "Offer", "Accepted", "Hired"]] }),
        },
      },
      { $sort: { applications: -1 } },
      { $limit: 10 },
      ...extra.lookup,
      { $project: { applications: 1, hired: 1, shortlisted: 1, ...extra.project } },
    ];

    const [[main], [byJob]] = await Promise.all([
      applicationModel
        .aggregate([
          { $match: match },
          {
            $facet: {
              overview: [
                {
                  $group: {
                    _id: null,
                    total: { $sum: 1 },
                    invited: countIf({ $eq: ["$source", "invited"] }),
                    priority: countIf(isTrue("priority")),
                    scored: countIf(isSet("matchScore")),
                    avgMatch: { $avg: "$matchScore" },
                    avgDistance: { $avg: "$distance" },
                    withCoverLetter: countIf(hasText("coverLetter")),
                    withDocument: countIf(hasText("additionalDocument")),
                    withInterviews: countIf(hasItems("interviews")),
                    withOffers: countIf(hasItems("jobOffers")),
                  },
                },
              ],
              distinctJobs: [{ $group: { _id: "$job" } }, { $count: "n" }],
              distinctApplicants: [{ $group: { _id: "$applicant" } }, { $count: "n" }],
              distinctCompanies: [{ $group: { _id: "$companyId" } }, { $count: "n" }],

              byStatus: countBy("$status"),
              bySource: countBy("$source"),
              byMedium: countBy(label("mediumOfComm")),
              byStudents: countBy(label("openForStudents")),
              byAvailability: countBy(label("availability"), 10),
              byPosition: countBy(label("position"), 15),
              declineReasons: [
                { $match: { status: "Declined" } },
                ...countBy(label("reasonForDecline"), 8),
              ],

              stageResponses: [
                { $match: { "stageResponse.stage": { $type: "string" } } },
                ...crossTab("$stageResponse.stage", "$stageResponse.response"),
              ],
              matchBuckets: [
                { $bucket: { groupBy: "$matchScore", boundaries: [0, 20, 40, 60, 80, 101], default: "none", output: { count: { $sum: 1 } } } },
              ],
              distanceBuckets: [
                { $bucket: { groupBy: "$distance", boundaries: [0, 5, 10, 25, 50, 100, 1e9], default: "none", output: { count: { $sum: 1 } } } },
              ],

              created: timeline("createdAt", interval, "$source"),
              outcomes: [
                { $match: { status: { $in: ["Hired", "Rejected", "Declined", "Sacked"] } } },
                ...timeline("updatedAt", interval, "$status"),
              ],

              physicalStatus: [
                { $match: { "physicalInterview.status": { $exists: true, $ne: null } } },
                ...countBy("$physicalInterview.status"),
              ],
              physicalFees: [
                { $match: { "physicalInterview.status": { $exists: true, $ne: null } } },
                {
                  $group: {
                    _id: null,
                    invites: { $sum: 1 },
                    paid: countIf(isTrue("physicalInterview.feePaid")),
                    revenue: {
                      $sum: {
                        $cond: [isTrue("physicalInterview.feePaid"), { $ifNull: ["$physicalInterview.fee", 0] }, 0],
                      },
                    },
                    avgFee: { $avg: "$physicalInterview.fee" },
                  },
                },
              ],

              topJobs: topBy("job", {
                lookup: [{ $lookup: { from: jobModel.collection.name, localField: "_id", foreignField: "_id", as: "j" } }, { $unwind: { path: "$j", preserveNullAndEmptyArrays: true } }],
                project: { title: "$j.jobTitle", plan: "$j.jobType", status: "$j.status" },
              }),
              topEmployers: topBy("companyId", {
                lookup: lookupUser(),
                project: { name: "$u.companyName", email: "$u.email" },
              }),
              topApplicants: topBy("applicant", {
                lookup: lookupUser(),
                project: { name: fullName("$u."), email: "$u.email" },
              }),
            },
          },
        ])
        .allowDiskUse(true),
      // Second pass: join each application to its job for plan / industry / state splits
      applicationModel
        .aggregate([
          { $match: match },
          { $lookup: { from: jobModel.collection.name, localField: "job", foreignField: "_id", as: "j" } },
          { $unwind: "$j" },
          { $project: { status: 1, matchScore: 1, plan: "$j.jobType", industry: "$j.industry", state: "$j.state" } },
          {
            $facet: {
              byIndustry: countBy(label("industry"), 15),
              byState: countBy(label("state"), 15),
              byPlan: [
                {
                  $group: {
                    _id: "$plan",
                    total: { $sum: 1 },
                    hired: countIf(isStatus("Hired")),
                    avgMatch: { $avg: "$matchScore" },
                  },
                },
                { $sort: { total: -1 } },
              ],
            },
          },
        ])
        .allowDiskUse(true),
    ]);

    const overview = one(main.overview);
    const statusMap = Object.fromEntries(main.byStatus.map((r) => [r._id, r.count]));
    const total = overview.total || 0;
    const jobsCount = main.distinctJobs[0]?.n || 0;
    const applicantsCount = main.distinctApplicants[0]?.n || 0;
    const progressed = total - (statusMap.Applied || 0) - (statusMap.Rejected || 0) - (statusMap.Declined || 0);

    const physical = one(main.physicalFees);

    res.json({
      generatedAt: new Date(),
      interval,
      overview: {
        ...overview,
        distinctJobs: jobsCount,
        distinctApplicants: applicantsCount,
        distinctCompanies: main.distinctCompanies[0]?.n || 0,
        avgPerJob: jobsCount ? +(total / jobsCount).toFixed(1) : 0,
        avgPerApplicant: applicantsCount ? +(total / applicantsCount).toFixed(1) : 0,
        avgMatch: overview.avgMatch != null ? +overview.avgMatch.toFixed(1) : null,
        avgDistance: overview.avgDistance != null ? +overview.avgDistance.toFixed(1) : null,
      },
      rates: {
        hire: rate(statusMap.Hired || 0, total),
        rejection: rate(statusMap.Rejected || 0, total),
        decline: rate(statusMap.Declined || 0, total),
        progressed: rate(progressed, total),
        coverLetter: rate(overview.withCoverLetter || 0, total),
        document: rate(overview.withDocument || 0, total),
        invited: rate(overview.invited || 0, total),
        priority: rate(overview.priority || 0, total),
      },
      byStatus: named(main.byStatus),
      bySource: named(main.bySource),
      byMedium: named(main.byMedium),
      byStudents: named(main.byStudents),
      byAvailability: named(main.byAvailability),
      byPosition: named(main.byPosition),
      declineReasons: named(main.declineReasons),
      stageResponses: pivot(main.stageResponses, "stage"),
      matchBuckets: bucketRows(main.matchBuckets, MATCH_LABELS),
      distanceBuckets: bucketRows(main.distanceBuckets, DISTANCE_LABELS),
      created: pivot(main.created, "period"),
      outcomes: pivot(main.outcomes, "period"),
      physical: {
        status: named(main.physicalStatus),
        ...physical,
        avgFee: physical.avgFee != null ? Math.round(physical.avgFee) : 0,
      },
      byPlan: (byJob?.byPlan || []).map((r) => ({
        plan: r._id,
        total: r.total,
        hired: r.hired,
        hireRate: rate(r.hired, r.total),
        avgMatch: r.avgMatch != null ? +r.avgMatch.toFixed(1) : null,
      })),
      byIndustry: named(byJob?.byIndustry),
      byJobState: named(byJob?.byState),
      topJobs: main.topJobs,
      topEmployers: main.topEmployers,
      topApplicants: main.topApplicants,
    });
  } catch (err) {
    fail(res, "getApplicationStats", err);
  }
};