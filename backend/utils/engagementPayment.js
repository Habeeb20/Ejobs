import Job from "../models/Job.js";
import Application from "../models/Application.js";
import ApplicationMessage from "../models/ApplicationMessage.js";
import AccountBoost from "../models/AccountBoost.js";
import EngagementPayment from "../models/EngagementPayment.js";
import User from "../models/User.js";
import { getBoostPlan, rankFields, ACCOUNT_BOOST, PHYSICAL_INTERVIEW_FEE } from "../config/boost.js";
import { emitToUser, emailUser, esc } from "./notify.js";
import { CLIENT, logEvent, fmtWhen, paragraphs } from "./engagement.js";

const httpError = (status, message) => Object.assign(new Error(message), { status });
const naira = (n) => `₦${Number(n).toLocaleString("en-NG")}`;

// Checks the payment with Paystack. Needs PAYSTACK_SECRET_KEY in .env
// (change the name here if your utils/paystack.js uses a different one).
const verifyTransaction = async (reference) => {
  const res = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
    headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || !body.status) throw httpError(400, "We couldn't confirm this payment yet. Try again in a moment.");
  return body.data;
};

/* ---------------- effects, one per purpose ---------------- */

const applyBoost = async (pay) => {
  const plan = getBoostPlan(pay.plan);
  const job = await Job.findById(pay.job);
  if (!plan || !job) throw httpError(404, "Job not found");

  const days = pay.meta?.extraDays ?? plan.extraDays; // the difference when upgrading
  const now = new Date();
  const set = {
    "boost.plan": plan.key,
    "boost.extraDays": plan.extraDays,
    "boost.boostedAt": now,
    "boost.paidAmount": (job.boost?.paidAmount || 0) + pay.amount,
    isBoosted: true,
    ...rankFields(job.jobType, plan.key),
  };

  if (job.status === "Online" && job.expiryDate) {
    // Already live: extend now
    set.expiryDate = new Date(Math.max(job.expiryDate.getTime(), now.getTime()) + days * 864e5);
    set["boost.extensionApplied"] = true;
  } else {
    // Still waiting for approval: approveJob adds the extra days when it goes live
    set["boost.extensionApplied"] = false;
  }
  await Job.updateOne({ _id: job._id }, { $set: set });

  const employer = await User.findById(job.employer).select("email");
  emitToUser(job.employer, "job:boosted", { jobId: job._id, jobTitle: job.jobTitle, plan: plan.key });
  emailUser(
    employer?.email, `${plan.name} boost active: ${job.jobTitle}`, "Your job is boosted",
    `<p><strong>${esc(job.jobTitle)}</strong> now has the <strong>${esc(plan.name)}</strong> boost (${naira(pay.amount)} paid).</p>
     <p>${days} extra day${days === 1 ? "" : "s"} ${set["boost.extensionApplied"] ? "were added to its time." : "will be added when it goes live."}</p>`,
    { url: `${CLIENT}/dashboard`, label: "Open dashboard" }
  );
};

const applyPhysical = async (pay) => {
  const app = await Application.findById(pay.application);
  if (!app || app.physicalInterview?.status !== "AwaitingPayment")
    throw httpError(409, "This interview invite is no longer waiting for payment");

  const [job, employer, seeker] = await Promise.all([
    Job.findById(app.job).select("jobTitle"),
    User.findById(app.companyId).select("companyName"),
    User.findById(app.applicant).select("email"),
  ]);

  app.physicalInterview.status = "Sent";
  app.physicalInterview.feePaid = true;
  app.physicalInterview.paidAt = new Date();
  app.physicalInterview.paymentReference = pay.reference;
  await app.save();

  const pi = app.physicalInterview;
  const company = employer?.companyName || "The employer";
  const lines = [
    `${company} has invited you to a physical interview for ${job?.jobTitle || app.position}.`,
    `When: ${fmtWhen(pi.scheduledFor)}`,
    `Where: ${pi.venue}`,
    pi.note ? `Note: ${pi.note}` : null,
    `${naira(PHYSICAL_INTERVIEW_FEE)} has been paid for you through Paystack.`,
    "Open your applications to accept or decline.",
  ].filter(Boolean);

  const msg = await ApplicationMessage.create({
    application: app._id, job: app.job, employer: app.companyId, seeker: app.applicant,
    kind: "interview", stage: "Physical interview",
    subject: `Physical interview invite: ${job?.jobTitle || app.position}`, body: lines.join("\n"),
  });
  await logEvent({
    app, type: "interview", status: "Sent", title: "Physical interview invite sent", note: `${pi.venue}, ${fmtWhen(pi.scheduledFor)}`,
    actor: "employer", actorUser: app.companyId,
  });
  await logEvent({
    app, type: "payment", status: "Paid", title: `${naira(PHYSICAL_INTERVIEW_FEE)} interview fee paid for the candidate`,
    actor: "employer", actorUser: app.companyId,
  });

  emitToUser(app.applicant, "interview:invite", { applicationId: app._id, jobTitle: job?.jobTitle, feePaid: true });
  const sent = emailUser(
    seeker?.email, msg.subject, "You're invited to an interview",
    `<p>${paragraphs(msg.body)}</p>`,
    { url: `${CLIENT}/dashboard`, label: "View invite" }
  );
  Promise.resolve(sent).then(() => ApplicationMessage.updateOne({ _id: msg._id }, { emailed: true })).catch(() => {});
};

const applyAccountBoost = async (pay) => {
  const now = new Date();
  const existing = await AccountBoost.findOne({ user: pay.payer });
  const from = existing && existing.expiresAt > now ? existing.expiresAt : now; // renewals stack
  const expiresAt = new Date(from.getTime() + ACCOUNT_BOOST.durationDays * 864e5);
  await AccountBoost.findOneAndUpdate(
    { user: pay.payer },
    { $set: { expiresAt }, $setOnInsert: { startedAt: now }, $inc: { totalPaid: pay.amount } },
    { upsert: true }
  );
  const user = await User.findById(pay.payer).select("email");
  emitToUser(pay.payer, "account-boost:active", { expiresAt });
  emailUser(
    user?.email, "Your account boost is active", "Account boost active",
    `<p>You'll get an email for every new job that matches your job choices, and employers see your applications first.</p>
     <p>Active until <strong>${esc(expiresAt.toDateString())}</strong>.</p>`,
    { url: `${CLIENT}/dashboard`, label: "Open dashboard" }
  );
};

const APPLY = { boost: applyBoost, physical: applyPhysical, account_boost: applyAccountBoost };

/**
 * Confirms a payment with Paystack and applies it once. Safe to call repeatedly
 * (button confirm + webhook): the second call finds it already paid and returns.
 * `payerId` is passed from user-facing routes; the webhook omits it.
 */
export const settleExtraPayment = async (reference, payerId = null) => {
  const pay = await EngagementPayment.findOne({ reference });
  if (!pay) throw httpError(404, "Payment not found");
  if (payerId && String(pay.payer) !== String(payerId)) throw httpError(404, "Payment not found");
  if (pay.status === "paid") return pay;

  const tx = await verifyTransaction(reference);
  if (tx.status !== "success") throw httpError(400, "This payment hasn't been completed yet");
  if (Number(tx.amount) !== pay.amount * 100) throw httpError(400, "The amount paid doesn't match");

  const claimed = await EngagementPayment.findOneAndUpdate(
    { _id: pay._id, status: "pending" },
    { $set: { status: "paid", paidAt: new Date() } },
    { new: true }
  );
  if (!claimed) return pay; // another request applied it first

  try {
    await APPLY[claimed.purpose](claimed);
  } catch (err) {
    // Effect failed: reopen the payment so a retry can apply it
    await EngagementPayment.updateOne({ _id: claimed._id }, { $set: { status: "pending" }, $unset: { paidAt: 1 } });
    throw err;
  }
  return claimed;
};