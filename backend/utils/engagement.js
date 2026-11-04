import User from "../models/User.js";
import ApplicationEvent from "../models/ApplicationEvent.js";
import ApplicationMessage from "../models/ApplicationMessage.js";
import AccountBoost from "../models/AccountBoost.js";
import { emitToUser, emailUser, esc } from "./notify.js";

export const CLIENT = process.env.CLIENT_URL || "http://localhost:5173";

// Stages the candidate can accept or reject
export const RESPONDABLE = ["Shortlisted", "Interviewed", "Scheduled", "Offer"];
// Stages that need a reason from the employer
export const NEEDS_REASON = ["Rejected", "Sacked"];

export const escapeRe = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
export const paragraphs = (text) => esc(text).replace(/\r?\n/g, "<br>");
export const cleanLine = (s, max = 150) => String(s || "").replace(/[\r\n]+/g, " ").trim().slice(0, max);
export const fmtWhen = (d) =>
  new Date(d).toLocaleString("en-NG", { timeZone: "Africa/Lagos", dateStyle: "full", timeStyle: "short" });

export const logEvent = ({ app, type, status = "", title, note = "", actor, actorUser = null }) =>
  ApplicationEvent.create({
    application: app._id, job: app.job, seeker: app.applicant, employer: app.companyId,
    type, status, title, note, actor, actorUser,
  });

export const hasActiveAccountBoost = async (userId) =>
  Boolean(await AccountBoost.exists({ user: userId, expiresAt: { $gt: new Date() } }));

/**
 * Moves an application to a new status on the employer's side.
 * Optionally sends a message: saved to the mail history, emailed, and pushed to the
 * jobseeker's dashboard in real time. The status email is always sent.
 * `employer` needs _id and companyName.
 */
export const applyStatusChange = async ({ app, job, employer, status, reason = "", message = "", subject = "" }) => {
  app.status = status;
  app.reasonForRejection = NEEDS_REASON.includes(status) ? reason : "";
  app.stageResponse = { stage: status, response: RESPONDABLE.includes(status) ? "Pending" : "None", reason: "" };
  if (status === "Hired") app.dateHired = new Date().toISOString();
  await app.save();

  await logEvent({
    app, type: "status", status, title: `Marked as ${status}`, note: reason,
    actor: "employer", actorUser: employer._id,
  });

  const seeker = await User.findById(app.applicant).select("email");
  const company = employer.companyName || "The employer";

  let msg = null;
  if (message) {
    msg = await ApplicationMessage.create({
      application: app._id, job: job._id, employer: employer._id, seeker: app.applicant,
      kind: "status", stage: status,
      subject: cleanLine(subject) || `${status}: ${job.jobTitle}`,
      body: String(message).slice(0, 3000),
    });
    await logEvent({
      app, type: "message", status, title: "Message sent to candidate", note: msg.subject,
      actor: "employer", actorUser: employer._id,
    });
  }

  emitToUser(app.applicant, "application:status", {
    applicationId: app._id, jobTitle: job.jobTitle, status, hasMessage: Boolean(msg),
  });
  if (msg) emitToUser(app.applicant, "application:message", { applicationId: app._id, messageId: msg._id, subject: msg.subject });

  const html =
    `<p>Your application for <strong>${esc(job.jobTitle)}</strong> at <strong>${esc(company)}</strong> is now <strong>${esc(status)}</strong>.</p>` +
    (reason ? `<p><em>${esc(reason)}</em></p>` : "") +
    (msg ? `<hr><p><strong>${esc(msg.subject)}</strong></p><p>${paragraphs(msg.body)}</p>` : "");
  const sent = emailUser(
    seeker?.email,
    msg ? msg.subject : `Update on your application: ${job.jobTitle}`,
    "Application update", html,
    { url: `${CLIENT}/dashboard`, label: "View my applications" }
  );
  if (msg) Promise.resolve(sent).then(() => ApplicationMessage.updateOne({ _id: msg._id }, { emailed: true })).catch(() => {});

  return msg;
};

/**
 * Premium-style alert for jobseekers with an active account boost: when a job goes live,
 * email everyone whose job choices match its job function or industry.
 */
export const notifyBoostedSeekers = async (job) => {
  const terms = [job.jobFunction, job.industry].filter(Boolean);
  if (!terms.length) return;
  const matchers = terms.map((t) => new RegExp(`^\\s*${escapeRe(t)}\\s*$`, "i"));

  const userIds = await AccountBoost.find({ expiresAt: { $gt: new Date() } }).distinct("user");
  if (!userIds.length) return;

  const seekers = await User.find({
    _id: { $in: userIds }, role: "jobseeker", isBlacklisted: false, jobChoice: { $in: matchers },
  }).select("_id email").limit(1000).lean();

  for (const s of seekers) emitToUser(s._id, "job:matched", { jobId: job._id, jobTitle: job.jobTitle });
  for (let i = 0; i < seekers.length; i += 20) {
    await Promise.allSettled(
      seekers.slice(i, i + 20).map((s) =>
        emailUser(
          s.email, `New job matching your choices: ${job.jobTitle}`, "A new job for you",
          `<p><strong>${esc(job.jobTitle)}</strong> in ${esc(job.city)}, ${esc(job.state)} matches your job choices.</p>`,
          { url: `${CLIENT}/jobs/${job._id}`, label: "View job" }
        )
      )
    );
  }
};