import Job from "../models/Job.js";
import Application from "../models/Application.js";
import JobPayment from "../models/JobPayment.js";
import User, { ROLES } from "../models/User.js";

const live = () => ({ status: "Online", expiryDate: { $gt: new Date() } });
const money = (n) => `₦${Number(n || 0).toLocaleString("en-NG")}`;

// Returns role-specific tiles and lists. `go` is the dashboard page id a tile opens.
export const getOverview = async (req, res) => {
  try {
    const uid = req.user._id;
    const role = req.user.role;
    const me = await User.findById(uid).select("loyaltyPoints referralCount");
    const points = { label: "Loyalty points", value: me?.loyaltyPoints ?? 0 };
    let tiles = [];
    let lists = [];

    if (role === ROLES.EMPLOYER) {
      const [liveCount, pending, needsAction, applicantAgg, top] = await Promise.all([
        Job.countDocuments({ employer: uid, ...live() }),
        Job.countDocuments({ employer: uid, status: "Awaiting Approval" }),
        Job.countDocuments({ employer: uid, status: { $in: ["Draft", "Rejected"] } }),
        Job.aggregate([{ $match: { employer: uid } }, { $group: { _id: null, total: { $sum: "$applicantCount" } } }]),
        Job.find({ employer: uid, status: { $in: ["Online", "Offline"] } })
          .sort({ applicantCount: -1 }).limit(5).select("jobTitle applicantCount jobType").lean(),
      ]);
      tiles = [
        { label: "Live jobs", value: liveCount, go: "myListings" },
        { label: "Awaiting approval", value: pending, go: "myListings" },
        { label: "Drafts and rejected", value: needsAction, go: "myListings" },
        { label: "Total applicants", value: applicantAgg[0]?.total || 0, go: "myListings" },
        points,
      ];
      lists = [{
        title: "Top jobs by applicants", go: "myListings", empty: "No jobs have gone live yet.",
        items: top.map((j) => ({ title: j.jobTitle, subtitle: `${j.applicantCount} applicant${j.applicantCount === 1 ? "" : "s"}`, tag: j.jobType })),
      }];
    } else if (role === ROLES.JOBSEEKER) {
      const [byStatus, saved, recent] = await Promise.all([
        Application.aggregate([{ $match: { applicant: uid } }, { $group: { _id: "$status", count: { $sum: 1 } } }]),
        Job.countDocuments({ likes: uid, ...live() }),
        Application.find({ applicant: uid }).sort({ createdAt: -1 }).limit(5)
          .select("position status companyId").populate("companyId", "companyName").lean(),
      ]);
      const c = Object.fromEntries(byStatus.map((s) => [s._id, s.count]));
      tiles = [
        { label: "Applications", value: byStatus.reduce((n, s) => n + s.count, 0), go: "applications" },
        { label: "Shortlisted", value: c.Shortlisted || 0, go: "applications" },
        { label: "Offers", value: c.Offer || 0, go: "applications" },
        { label: "Saved jobs", value: saved, go: "saved" },
        points,
      ];
      lists = [{
        title: "Recent applications", go: "applications", empty: "You haven't applied to any jobs yet.",
        items: recent.map((a) => ({ title: a.position, subtitle: a.companyId?.companyName || "", tag: a.status })),
      }];
    } else if (role === ROLES.ADMIN || role === ROLES.SUPERADMIN) {
      const isSuper = role === ROLES.SUPERADMIN;
      const [pending, liveJobs, users, byPlan] = await Promise.all([
        Job.countDocuments({ status: "Awaiting Approval" }),
        Job.countDocuments(live()),
        User.aggregate([{ $group: { _id: "$role", count: { $sum: 1 } } }]),
        Job.aggregate([{ $match: live() }, { $group: { _id: "$jobType", count: { $sum: 1 } } }]),
      ]);
      tiles = [
        { label: "Awaiting approval", value: pending, go: isSuper ? "approvals" : "allJobs" },
        { label: "Live jobs", value: liveJobs },
        { label: "Total users", value: users.reduce((n, u) => n + u.count, 0), go: "users" },
      ];
      if (isSuper) {
        const since = new Date(Date.now() - 30 * 864e5);
        const [all, month] = await Promise.all([
          JobPayment.aggregate([{ $match: { status: "Success" } }, { $group: { _id: null, total: { $sum: "$amount" } } }]),
          JobPayment.aggregate([{ $match: { status: "Success", paidAt: { $gte: since } } }, { $group: { _id: null, total: { $sum: "$amount" } } }]),
        ]);
        tiles.push({ label: "Revenue (30 days)", value: money(month[0]?.total), hint: `${money(all[0]?.total)} all time` });
      }
      lists = [
        { title: "Users by role", empty: "No users yet.", items: users.map((u) => ({ title: u._id, tag: String(u.count) })) },
        { title: "Live jobs by plan", empty: "No live jobs.", items: byPlan.map((p) => ({ title: p._id, tag: String(p.count) })) },
      ];
    } else {
      tiles = [points, { label: "People you referred", value: me?.referralCount ?? 0 }];
    }

    res.json({ success: true, role, tiles, lists });
  } catch (err) {
    console.error("getOverview:", err);
    res.status(500).json({ success: false, message: "Could not load your overview" });
  }
};