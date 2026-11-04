// Run once after deploying: node scripts/backfillJobRanks.js
// Old jobs have no listingRank/approvalRank and old applications have no priority/source.
// Without this they would sort ahead of everything else.
import "dotenv/config";
import mongoose from "mongoose";
import Job from "../models/Job.js";
import Application from "../models/Application.js";
import { rankFields } from "./boost.js";

await mongoose.connect(process.env.MONGO_URI); // use the variable name your server uses

let jobs = 0;
for (const job of await Job.find({ listingRank: { $exists: false } }).select("jobType boost").lean()) {
  await Job.updateOne({ _id: job._id }, { $set: { ...rankFields(job.jobType, job.boost?.plan), isBoosted: Boolean(job.boost?.plan) } });
  jobs++;
}

const apps = await Application.updateMany(
  { priority: { $exists: false } },
  { $set: { priority: false, source: "applied" } }
);

console.log(`Jobs ranked: ${jobs}, applications updated: ${apps.modifiedCount}`);
await mongoose.disconnect();