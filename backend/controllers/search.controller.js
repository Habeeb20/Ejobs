import Job from "../models/Job.js"; // change to your job model's file name
import User, { ROLES } from "../models/User.js";

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const clean = (v, max = 80) => String(v || "").trim().slice(0, max);
const LIMIT = 10;
const fail = (res, err, label) => {
  console.error(`${label}:`, err);
  res.status(500).json({ success: false, message: "Something went wrong. Please try again." });
};

const liveJobs = () => ({ status: "Online", expiryDate: { $gt: new Date() } });
const jobseekers = () => ({ role: ROLES.JOBSEEKER, isBlacklisted: false });

// Every typed word must appear in the first or last name
const nameFilter = (q) => ({
  $and: q.split(/\s+/).filter(Boolean).slice(0, 3).map((t) => {
    const rx = new RegExp(esc(t), "i");
    return { $or: [{ firstName: rx }, { lastName: rx }] };
  }),
});

// Distinct values of one field that match the typed text, most common first
const distinctValues = async (Model, base, field, rx) => {
  const rows = await Model.aggregate([
    { $match: { ...base, [field]: rx } },
    { $group: { _id: { $toLower: `$${field}` }, label: { $first: `$${field}` }, count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 8 },
  ]);
  return rows.map((r) => r.label);
};

/* GET /search/suggest?type=job|candidate&field=title|category|name|role&q=... */
export const suggest = async (req, res) => {
  try {
    const { type, field } = req.query;
    const q = clean(req.query.q);
    if (q.length < 2) return res.json({ success: true, suggestions: [] });
    const rx = new RegExp(esc(q), "i");
    let suggestions = [];

    if (type === "job") {
      if (field === "title") {
        suggestions = await distinctValues(Job, liveJobs(), "jobTitle", rx);
      } else if (field === "category") {
        const [a, b] = await Promise.all([
          distinctValues(Job, liveJobs(), "industry", rx),
          distinctValues(Job, liveJobs(), "jobFunction", rx),
        ]);
        const seen = new Set();
        suggestions = [...a, ...b].filter((s) => !seen.has(s.toLowerCase()) && seen.add(s.toLowerCase())).slice(0, 8);
      }
    } else if (type === "candidate") {
      if (field === "name") {
        const people = await User.find({ ...jobseekers(), ...nameFilter(q) }).select("firstName lastName").limit(30).lean();
        const seen = new Set();
        suggestions = people
          .map((p) => [p.firstName, p.lastName].filter((v) => v && v !== "none").join(" "))
          .filter((n) => n && !seen.has(n.toLowerCase()) && seen.add(n.toLowerCase()))
          .slice(0, 8);
      } else if (field === "role") {
        const rows = await User.aggregate([
          { $match: jobseekers() },
          { $unwind: "$jobChoice" },
          { $match: { jobChoice: rx } },
          { $group: { _id: { $toLower: "$jobChoice" }, label: { $first: "$jobChoice" }, count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $limit: 8 },
        ]);
        suggestions = rows.map((r) => r.label);
      }
    }
    res.set("Cache-Control", "no-store");
    res.json({ success: true, suggestions });
  } catch (err) { fail(res, err, "suggest"); }
};

/* GET /search/jobs?title&category&state&lga&page */
export const searchJobs = async (req, res) => {
  try {
    const title = clean(req.query.title), category = clean(req.query.category);
    const state = clean(req.query.state), lga = clean(req.query.lga);
    const page = Math.max(1, parseInt(req.query.page) || 1);

    const filter = liveJobs();
    if (title) filter.jobTitle = new RegExp(esc(title), "i");
    if (category) {
      const rx = new RegExp(esc(category), "i");
      filter.$or = [{ industry: rx }, { jobFunction: rx }];
    }
    if (state) filter.state = new RegExp(`^${esc(state)}$`, "i");
    if (lga) filter.localGovernment = new RegExp(`^${esc(lga)}$`, "i");

    const [jobs, total] = await Promise.all([
      Job.find(filter)
        .sort({ featuredJob: -1, createdAt: -1 })
        .skip((page - 1) * LIMIT).limit(LIMIT)
        .select("-applications -numberOfApplicants -reports -shares -paymentReference -paymentStatus -reviewedBy -rejectionReason")
        .populate("employer", "companyName avatar")
        .lean(),
      Job.countDocuments(filter),
    ]);
    res.json({ success: true, jobs, total, hasMore: page * LIMIT < total });
  } catch (err) { fail(res, err, "searchJobs"); }
};

/* GET /search/candidates?name&role&state&lga&page */
export const searchCandidates = async (req, res) => {
  try {
    const name = clean(req.query.name), role = clean(req.query.role);
    const state = clean(req.query.state), lga = clean(req.query.lga);
    const page = Math.max(1, parseInt(req.query.page) || 1);

    const filter = jobseekers();
    if (name) Object.assign(filter, nameFilter(name));
    if (role) filter.jobChoice = new RegExp(esc(role), "i");
    if (state) filter.state = new RegExp(`^${esc(state)}$`, "i");
    if (lga) filter.localGovernment = new RegExp(`^${esc(lga)}$`, "i");

    const [candidates, total] = await Promise.all([
      User.find(filter)
        .sort({ isCertified: -1, createdAt: -1 })
        .skip((page - 1) * LIMIT).limit(LIMIT)
        .select("firstName lastName avatar jobChoice state localGovernment isCertified") // no email or phone
        .lean(),
      User.countDocuments(filter),
    ]);
    res.json({ success: true, candidates, total, hasMore: page * LIMIT < total });
  } catch (err) { fail(res, err, "searchCandidates"); }
};