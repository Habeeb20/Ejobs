import cron from "node-cron";
import Job from "../models/Job.js";

// Takes expired jobs offline every 5 minutes. Public queries also check expiryDate,
// so a job never shows after its time even if this runs a few minutes late.
export const startExpiryJob = () =>
  cron.schedule("*/5 * * * *", async () => {
    try {
      const r = await Job.updateMany(
        { status: "Online", expiryDate: { $lte: new Date() } },
        { $set: { status: "Offline" } }
      );
      if (r.modifiedCount) console.log(`expireJobs: ${r.modifiedCount} job(s) went offline`);
    } catch (err) {
      console.error("expireJobs:", err);
    }
  });