// backend/services/recruitmentService.js
// Business rules for the recruitment packages: pricing, the candidate pipeline, payments and replacement quotas.
import mongoose from "mongoose";
import {
  RecruitmentPlan, RecruitmentRequest, RecruitmentPayment, RecruitmentChange, RecruitmentReplacement,
} from "../models/Recruitment.js";
import {
  PLAN_DEFAULTS, CHECKS, CURRENCY, CHANGE_REQUEST_FEE_PCT, HIRING_ENGAGEMENT_FEE_PCT,
} from "../config/recruitmentPlans.js";

/* ---------- helpers ---------- */
export const httpError = (status, message, extra) => Object.assign(new Error(message), { status, extra });

/** Wraps an async Express handler so thrown httpErrors become clean JSON responses. */
export const wrap = (fn) => (req, res) =>
  Promise.resolve(fn(req, res)).catch((err) => {
    if (err.status) return res.status(err.status).json({ success: false, message: err.message, ...(err.extra || {}) });
    if (err.name === "CastError") return res.status(404).json({ success: false, message: "Not found." });
    if (err.name === "ValidationError") {
      return res.status(400).json({ success: false, message: Object.values(err.errors).map((e) => e.message).join(" ") });
    }
    console.error("[recruitment]", err);
    return res.status(500).json({ success: false, message: "Something went wrong. Please try again." });
  });

export const addDays = (date, n) => new Date(new Date(date).getTime() + n * 86400000);
export const escapeRx = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
export const log = (request, actor, actorName, text, internal = false) =>
  request.timeline.push({ at: new Date(), actor, actorName: actorName || "", text, internal });

const User = () => mongoose.model("User");
export const personName = (u) => [u?.firstName, u?.lastName].filter(Boolean).join(" ") || u?.name || u?.companyName || "";

/** Best-effort email. Uses ../utils/sendEmail.js when it exists; never throws. */
export async function notify(userId, subject, body) {
  try {
    const user = await User().findById(userId).select("email firstName lastName name companyName").lean();
    if (!user?.email) return;
    const html = `<p>Hello ${personName(user) || "there"},</p><p>${body}</p><p>The ejob recruitment team</p>`;
    const mod = await import("../utils/sendEmail.js").catch(() => null);
    const send = mod?.default || mod?.sendEmail;
    if (send) await send({ to: user.email, email: user.email, subject, html, message: html });
  } catch (e) {
    console.warn("[recruitment] email not sent:", e.message);
  }
}

/* ---------- packages & pricing ---------- */
export const isPriced = (plan) => {
  const p = plan.pricing || {};
  return p.model === "percent" ? Number(p.percent) > 0 : Number(p.amount) > 0;
};

/** Config is the source of truth for package content; the database only adds price + on/off. */
export async function getPlans({ onlyActive = false } = {}) {
  const rows = await RecruitmentPlan.find().lean();
  const byKey = Object.fromEntries(rows.map((r) => [r.key, r]));
  const plans = PLAN_DEFAULTS.map((def) => {
    const row = byKey[def.key];
    const plan = { ...def, active: row ? row.active !== false : true, pricing: { model: "fixed", ...(row?.pricing || {}) } };
    plan.priced = isPriced(plan);
    return plan;
  });
  return onlyActive ? plans.filter((p) => p.active) : plans;
}
export const getPlan = async (key, opts) => (await getPlans(opts)).find((p) => p.key === key);

export async function savePlanSettings(key, { pricing, active } = {}) {
  const def = PLAN_DEFAULTS.find((p) => p.key === key);
  if (!def) throw httpError(404, "Package not found.");
  const set = {};
  if (pricing) {
    if (pricing.model === "percent") {
      const percent = Number(pricing.percent);
      if (!(percent > 0 && percent <= 100)) throw httpError(422, "Enter a percentage between 0 and 100.");
      set.pricing = { model: "percent", percent };
    } else {
      const amount = Number(pricing.amount);
      if (!Number.isFinite(amount) || amount < 0) throw httpError(422, "Enter a valid amount.");
      set.pricing = { model: "fixed", amount: Math.round(amount) };
    }
  }
  if (typeof active === "boolean") set.active = active;
  if (!Object.keys(set).length) throw httpError(400, "Nothing to update.");
  await RecruitmentPlan.findOneAndUpdate(
    { key },
    { $set: set, $setOnInsert: { order: def.order, name: def.name } },
    { upsert: true, new: true, runValidators: true },
  );
  return getPlan(key);
}

export function quote(plan, { annualSalary = 0, hiringEngagement = false } = {}) {
  if (!isPriced(plan)) throw httpError(409, "Pricing for this package has not been set yet. Please check back soon or contact us.");
  const p = plan.pricing;
  let base;
  if (p.model === "percent") {
    if (!(annualSalary > 0)) throw httpError(422, "Enter the annual salary for this role so we can calculate the fee.");
    base = Math.round((annualSalary * p.percent) / 100);
  } else {
    base = Math.round(p.amount);
  }
  const engagement = hiringEngagement ? Math.round((base * HIRING_ENGAGEMENT_FEE_PCT) / 100) : 0;
  const total = base + engagement;
  const upfront = Math.round((total * (plan.paymentTerms?.upfrontPct ?? 100)) / 100);
  return { base, engagement, total, upfront, balance: total - upfront, paid: 0, currency: CURRENCY };
}

export const changeFee = (request) => Math.round(((request.fees?.base || 0) * CHANGE_REQUEST_FEE_PCT) / 100);

/* ---------- candidate checks ---------- */
export const buildChecks = (keys = []) =>
  keys.map((key) => ({ key, label: CHECKS[key] || key, status: "Pending", note: "", reportUrl: "" }));

/* ---------- pipeline ---------- */
const FLOW = {
  Sourced: ["Screened", "Shortlisted", "Rejected", "Withdrawn"],
  Screened: ["Sourced", "Shortlisted", "Rejected", "Withdrawn"],
  Shortlisted: ["Screened", "Submitted", "Rejected", "Withdrawn"],
  Submitted: ["Interviewing", "Offered", "Hired", "Rejected", "Withdrawn"],
  Interviewing: ["Offered", "Hired", "Rejected", "Withdrawn"],
  Offered: ["Interviewing", "Hired", "Rejected", "Withdrawn"],
  Hired: ["Replaced"],
  Rejected: [],
  Withdrawn: [],
  Replaced: [],
};
const AFTER_SCREEN = ["Screened", "Shortlisted", "Submitted", "Interviewing", "Offered", "Hired"];

export const nextStages = (cand) => {
  const out = [...(FLOW[cand.stage] || [])];
  if (cand.stage === "Rejected" && !cand.submittedAt) out.push("Screened");
  return out;
};

/**
 * Moves a candidate to a new stage, enforcing package limits and side effects.
 * Mutates (but does not save) the request; callers save.
 */
export async function moveCandidate(request, cand, to, { startDate, reason = "", by = "admin", actorName = "" } = {}) {
  const from = cand.stage;
  if (from === to) return false;
  if (!nextStages(cand).includes(to)) throw httpError(409, `A candidate who is "${from}" cannot be moved to "${to}".`);

  const snap = request.planSnapshot || {};
  const mine = (c) => String(c._id) === String(cand._id);
  const now = new Date();

  if (AFTER_SCREEN.includes(to) && !cand.screenedAt) {
    const limit = snap.limits?.screenMax;
    const screened = request.candidates.filter((c) => c.screenedAt && !c.replacementFor && !mine(c)).length;
    if (limit && !cand.replacementFor && screened >= limit) {
      throw httpError(409, `This package covers screening up to ${limit} candidates. Raise the limit or add a change request for additional sourcing.`);
    }
    cand.screenedAt = now;
  }

  if (to === "Submitted") {
    if (!["Active", "Completed"].includes(request.status)) throw httpError(409, "The request must be active before candidates are submitted.");
    if (request.status === "Completed" && !cand.replacementFor) throw httpError(409, "This request is complete. Only replacement candidates can be submitted.");
    const open = cand.checks.filter((c) => !["Passed", "NotApplicable"].includes(c.status));
    if (open.length) throw httpError(422, `Complete the verification checks first: ${open.map((c) => c.label).join(", ")}.`);
    const limit = snap.limits?.shortlistMax;
    const submitted = request.candidates.filter((c) => c.submittedAt && !c.replacementFor && !mine(c)).length;
    if (limit && !cand.replacementFor && submitted >= limit) {
      throw httpError(409, `This package allows up to ${limit} submitted candidates.`);
    }
    cand.submittedAt = now;
  }

  if (to === "Offered") cand.offeredAt = now;

  if (to === "Hired") {
    const when = new Date(startDate);
    if (!startDate || Number.isNaN(when.getTime())) throw httpError(422, "Enter the date the candidate starts work.");
    const target = snap.limits?.hireTarget || 1;
    const hired = request.candidates.filter((c) => c.stage === "Hired" && !mine(c)).length;
    if (hired >= target) throw httpError(409, `All ${target} position${target > 1 ? "s are" : " is"} already filled.`);
    cand.hiredAt = now;
    cand.startDate = when;
    cand.replacementUntil = addDays(when, snap.replacement?.windowDays || 0);
    if (hired + 1 >= target && request.status === "Active") {
      request.status = "Completed";
      request.completedAt = now;
    }
    if ((request.fees?.balance || 0) > 0) {
      const exists = await RecruitmentPayment.exists({ request: request._id, kind: "balance" });
      if (!exists) {
        await RecruitmentPayment.create({
          request: request._id, employer: request.employer, kind: "balance", amount: request.fees.balance, currency: request.fees.currency,
        });
        notify(request.employer, `Balance due for ${request.reference}`,
          `${cand.name} has been marked as hired for ${request.jobTitle}. The balance of the recruitment fee is now due. You can pay it from the Payments tab of the request.`);
      }
    }
  }

  if (to === "Rejected") { cand.rejectedBy = by; cand.rejectReason = reason; }
  if (to === "Withdrawn") cand.rejectReason = reason;
  if (to === "Replaced") cand.endedAt = now;

  cand.stage = to;
  log(request, by, actorName, `${cand.name} moved to ${to}.${reason ? ` Reason: ${reason}` : ""}`, !cand.submittedAt);
  return true;
}

/* ---------- payments ---------- */
/** Confirms or declines a payment. A gateway webhook can call this with approve = true. */
export async function applyPayment(payment, adminId, { approve = true, note = "" } = {}) {
  if (payment.status !== "Pending") throw httpError(409, "This payment has already been processed.");
  const request = await RecruitmentRequest.findById(payment.request);
  if (!request) throw httpError(404, "Request not found.");
  const now = new Date();
  const label = payment.kind === "change_request" ? "change request fee" : payment.kind === "balance" ? "balance" : "upfront fee";

  if (!approve) {
    payment.status = "Failed";
    payment.adminNote = note;
    payment.confirmedBy = adminId || null;
    log(request, "admin", "", `Payment of ${payment.amount} (${label}) was declined.${note ? ` ${note}` : ""}`);
    await Promise.all([payment.save(), request.save()]);
    notify(request.employer, `Payment not confirmed for ${request.reference}`,
      `We could not confirm your ${label} payment.${note ? ` ${note}` : ""} Please check the transfer details and submit them again from the Payments tab.`);
    return payment;
  }

  payment.status = "Paid";
  payment.paidAt = now;
  payment.confirmedBy = adminId || null;
  if (note) payment.adminNote = note;
  request.fees.paid = (request.fees.paid || 0) + payment.amount;

  if (payment.kind === "upfront" && request.status === "AwaitingPayment") {
    request.status = "Active";
    request.commencedAt = now;
    request.dueDate = addDays(now, request.planSnapshot?.durationDays || 30);
    log(request, "system", "", "Payment confirmed. Recruitment has started.");
  } else {
    log(request, "system", "", `Payment confirmed (${label}).`);
  }
  if (payment.kind === "change_request" && payment.change) {
    await RecruitmentChange.findByIdAndUpdate(payment.change, { status: "Paid" });
  }
  await Promise.all([payment.save(), request.save()]);
  notify(request.employer, `Payment confirmed for ${request.reference}`,
    payment.kind === "upfront"
      ? `We have confirmed your payment and started recruiting for ${request.jobTitle}. You will be notified as soon as candidates are ready for your review.`
      : `We have confirmed your ${label} payment for ${request.jobTitle}.`);
  return payment;
}

/* ---------- replacements ---------- */
const OPEN_REPLACEMENT = ["Pending", "Approved", "Fulfilled"];

export async function replacementQuota(request) {
  const snap = request.planSnapshot?.replacement || {};
  const allowed = snap.count || 0;
  const used = await RecruitmentReplacement.countDocuments({ request: request._id, status: { $in: OPEN_REPLACEMENT } });
  let yearUsed = 0;
  if (snap.maxPerYear) {
    const ids = await RecruitmentRequest.find({ employer: request.employer, plan: request.plan }).distinct("_id");
    yearUsed = await RecruitmentReplacement.countDocuments({
      request: { $in: ids }, status: { $in: OPEN_REPLACEMENT }, createdAt: { $gte: addDays(new Date(), -365) },
    });
  }
  const yearLeft = snap.maxPerYear ? Math.max(0, snap.maxPerYear - yearUsed) : Infinity;
  const remaining = Math.max(0, Math.min(allowed - used, yearLeft));
  return { allowed, used, remaining, maxPerYear: snap.maxPerYear || null, yearUsed };
}

/* ---------- views ---------- */
const CLIENT_STAGES_WITH_CONTACT = ["Interviewing", "Offered", "Hired", "Replaced"];

export function clientCandidate(c) {
  const o = { ...c };
  delete o.adminNotes;
  if (!CLIENT_STAGES_WITH_CONTACT.includes(o.stage)) { delete o.email; delete o.phone; }
  return o;
}

/** What the employer is allowed to see: only submitted candidates, no private notes, no internal activity. */
export function clientView(doc) {
  const o = doc.toObject ? doc.toObject() : { ...doc };
  o.candidates = (o.candidates || []).filter((c) => c.submittedAt).map(clientCandidate);
  o.timeline = (o.timeline || []).filter((t) => !t.internal).sort((a, b) => new Date(b.at) - new Date(a.at));
  return o;
}

export function summarise(doc) {
  const o = doc.toObject ? doc.toObject() : doc;
  const cands = o.candidates || [];
  return {
    _id: o._id, reference: o.reference, jobTitle: o.jobTitle, plan: o.plan, planName: o.planName, status: o.status,
    fees: o.fees, location: o.location, createdAt: o.createdAt, commencedAt: o.commencedAt, dueDate: o.dueDate,
    counts: {
      submitted: cands.filter((c) => c.submittedAt).length,
      interviewing: cands.filter((c) => c.stage === "Interviewing").length,
      hired: cands.filter((c) => c.stage === "Hired").length,
      target: o.planSnapshot?.limits?.hireTarget || 1,
      sourced: cands.length,
    },
  };
}