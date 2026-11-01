import User, { ROLES } from "../models/User.js";
import Job from "../models/Job.js";                    // change to your job model's file name
import Application from "../models/Application.js";    // change to your application model's file name

let cache = null; // small in-memory cache so a busy landing page doesn't hit the database every time
const TTL = 60 * 1000;

// export const overview = async (req, res) => {
//   try {
//     if (cache && Date.now() - cache.at < TTL) {
//       res.set("Cache-Control", "public, max-age=60");
//       return res.json({ success: true, stats: cache.stats });
//     }

//     const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
//    const [totalUsers, jobseekers, employers, applications, employed, jobsLast24h, totalJobs] = await Promise.all([
//   User.countDocuments({}),
//   User.countDocuments({ role: ROLES.JOBSEEKER }),
//   User.countDocuments({ role: ROLES.EMPLOYER }),
//   Application.countDocuments({}),
//   Application.countDocuments({ status: "Offer" }),
//   Job.countDocuments({ createdAt: { $gte: since }, status: { $ne: "Draft" } }),
//   Job.countDocuments({ status: { $ne: "Draft" } }),
// ]);

// const stats = { totalUsers, jobseekers, employers, applications, employed, jobsLast24h, totalJobs };
//     cache = { at: Date.now(), stats };
//     res.set("Cache-Control", "public, max-age=60");
//     res.json({ success: true, stats });
//   } catch (err) {
//     console.error("stats overview:", err);
//     res.status(500).json({ success: false, message: "Could not load statistics" });
//   }
// };


// Replace your existing `overview` controller with this one.
// It uses the `cache`, `TTL`, `User`, `Application`, `Job` and `ROLES` already defined in your file.
export const overview = async (req, res) => {
  try {
    if (cache && Date.now() - cache.at < TTL) {
      res.set("Cache-Control", "public, max-age=60");
      return res.json({ success: true, stats: cache.stats });
    }

    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const [totalUsers, jobseekers, jobChangers, employers, applications, employed, totalJobs, jobsLast24h] =
      await Promise.all([
        User.countDocuments({}),
        User.countDocuments({ role: ROLES.JOBSEEKER }),
        // jobDecision is an array of strings: this matches users whose list contains "jobchanger"
        // (any letter case). Job seekers who chose professional / atisan / unemployed are not counted.
        User.countDocuments({ role: ROLES.JOBSEEKER, jobDecision: { $regex: /^jobchanger$/i } }),
        User.countDocuments({ role: ROLES.EMPLOYER }),
        Application.countDocuments({}),
        Application.countDocuments({ status: "Offer" }),
        // keep this filter the same as the one your job search uses
        Job.countDocuments({ status: { $ne: "Draft" } }),
        Job.countDocuments({ createdAt: { $gte: since }, status: { $ne: "Draft" } }),
      ]);

    const stats = {
      totalUsers,
      jobseekers,
      jobChangers,
      employers,
      applications,
      employed,
      totalJobs,
      jobsLast24h,
    };

    cache = { at: Date.now(), stats };
    res.set("Cache-Control", "public, max-age=60");
    res.json({ success: true, stats });
  } catch (err) {
    console.error("stats overview:", err);
    res.status(500).json({ success: false, message: "Could not load statistics" });
  }
};


let industryCache = null;

export const industries = async (req, res) => {
  try {
    if (industryCache && Date.now() - industryCache.at < TTL) {
      res.set("Cache-Control", "public, max-age=60");
      return res.json({ success: true, industries: industryCache.rows });
    }

    const rows = await Job.aggregate([
      { $match: { status: "Online", expiryDate: { $gt: new Date() }, industry: { $type: "string", $ne: "" } } },
      { $group: { _id: { $toLower: { $trim: { input: "$industry" } } }, name: { $first: "$industry" }, count: { $sum: 1 } } },
      { $sort: { count: -1, name: 1 } },
      { $project: { _id: 0, name: 1, count: 1 } },
    ]);

    industryCache = { at: Date.now(), rows };
    res.set("Cache-Control", "public, max-age=60");
    res.json({ success: true, industries: rows });
  } catch (err) {
    console.error("stats industries:", err);
    res.status(500).json({ success: false, message: "Could not load industries" });
  }
};