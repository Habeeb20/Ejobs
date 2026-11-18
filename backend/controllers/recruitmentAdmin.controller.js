// backend/controllers/recruitmentAdminController.js
import mongoose from "mongoose";
import {
  RecruitmentRequest, RecruitmentPayment, RecruitmentChange, RecruitmentReplacement,
} from "../models/Recruitment.js";
import { CHECKS, CHANGE_TYPES } from "../config/recruitmentPlans.js";
import {
  httpError, wrap, log, notify, escapeRx, getPlans, savePlanSettings, buildChecks, moveCandidate, nextStages,
  applyPayment, changeFee, replacementQuota, summarise, personName,
} from "../services/recruitmentService.js";

const User = () => mongoose.model("User");
const str = (v, max) => String(v ?? "").trim().slice(0, max);
const EMPLOYER_FIELDS = "firstName lastName email phone companyName";
const CHECK_STATUSES = ["Pending", "InProgress", "Passed", "Failed", "NotApplicable"];
const adminName = (req) => personName(req.user) || "Recruitment team";

async function findRequest(id) {
  const request = await RecruitmentRequest.findById(id);
  if (!request) throw httpError(404, "Request not found.");
  return request;
}

/* ---------- overview ---------- */
export const overview = wrap(async (_req, res) => {
  const [byStatus, pendingPayments, openChanges, openReplacements, revenue, onlineVerified] = await Promise.all([
    RecruitmentRequest.aggregate([{ $group: { _id: "$status", n: { $sum: 1 } } }]),
    RecruitmentPayment.countDocuments({ status: "Pending", submittedAt: { $ne: null } }),
    RecruitmentChange.countDocuments({ status: "AwaitingApproval" }),
    RecruitmentReplacement.countDocuments({ status: "Pending" }),
    RecruitmentPayment.aggregate([{ $match: { status: "Paid" } }, { $group: { _id: null, total: { $sum: "$amount" } } }]),
    RecruitmentPayment.countDocuments({ status: "Paid", method: "paystack" }),
  ]);
  res.json({
    success: true,
    byStatus: Object.fromEntries(byStatus.map((s) => [s._id, s.n])),
    pendingPayments, openChanges, openReplacements, onlineVerified,
    revenue: revenue[0]?.total || 0,
  });
});

/* ---------- requests ---------- */
export const listRequests = wrap(async (req, res) => {
  const { status, q } = req.query;
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20));
  const filter = {};
  if (status) filter.status = status;
  if (q) {
    const rx = new RegExp(escapeRx(q), "i");
    const ids = await User().find({ $or: [{ email: rx }, { firstName: rx }, { lastName: rx }, { companyName: rx }] }).distinct("_id");
    filter.$or = [{ reference: rx }, { jobTitle: rx }, { employer: { $in: ids } }];
  }
  const [rows, total] = await Promise.all([
    RecruitmentRequest.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).populate("employer", EMPLOYER_FIELDS).lean(),
    RecruitmentRequest.countDocuments(filter),
  ]);
  res.json({
    success: true, total, page, pages: Math.max(1, Math.ceil(total / limit)),
    requests: rows.map((r) => ({ ...summarise(r), employer: r.employer })),
  });
});

export const getRequest = wrap(async (req, res) => {
  const request = await RecruitmentRequest.findById(req.params.id).populate("employer", EMPLOYER_FIELDS);
  if (!request) throw httpError(404, "Request not found.");
  const [payments, changes, replacements, quota] = await Promise.all([
    RecruitmentPayment.find({ request: request._id }).sort({ createdAt: -1 }).lean(),
    RecruitmentChange.find({ request: request._id }).sort({ createdAt: -1 }).lean(),
    RecruitmentReplacement.find({ request: request._id }).sort({ createdAt: -1 }).lean(),
    replacementQuota(request),
  ]);
  const obj = request.toObject();
  obj.candidates.forEach((c) => { c.nextStages = nextStages(c); });
  obj.timeline = obj.timeline.sort((a, b) => new Date(b.at) - new Date(a.at));
  res.json({ success: true, request: obj, payments, changes, replacements, quota, checkLabels: CHECKS });
});

const STATUS_FLOW = {
  AwaitingPayment: ["Cancelled"],
  Active: ["Suspended", "Completed", "Cancelled"],
  Suspended: ["Active", "Cancelled"],
  Completed: ["Active"],
  Cancelled: [],
};

export const updateRequest = wrap(async (req, res) => {
  const request = await findRequest(req.params.id);
  const b = req.body || {};
  const who = adminName(req);

  if (b.status && b.status !== request.status) {
    if (!(STATUS_FLOW[request.status] || []).includes(b.status)) {
      throw httpError(409, `A request that is "${request.status}" cannot be set to "${b.status}".`);
    }
    request.status = b.status;
    request.statusReason = str(b.statusReason, 300);
    if (b.status === "Cancelled") {
      request.cancelledAt = new Date();
      await RecruitmentPayment.updateMany({ request: request._id, status: "Pending" }, { status: "Failed", adminNote: "Request cancelled." });
    }
    if (b.status === "Completed") request.completedAt = new Date();
    log(request, "admin", who, `Request status changed to ${b.status}.${request.statusReason ? ` ${request.statusReason}` : ""}`);
    notify(request.employer, `${request.reference} is now ${b.status.toLowerCase()}`,
      `Your recruitment request for ${request.jobTitle} is now ${b.status.toLowerCase()}.${request.statusReason ? ` ${request.statusReason}` : ""}`);
  }
  if (b.dueDate) {
    const d = new Date(b.dueDate);
    if (Number.isNaN(d.getTime())) throw httpError(422, "Enter a valid due date.");
    request.dueDate = d;
  }
  if (b.limits && typeof b.limits === "object") {
    ["shortlistMax", "screenMax", "hireTarget"].forEach((k) => {
      if (b.limits[k] === undefined) return;
      const n = Number(b.limits[k]);
      if (!Number.isInteger(n) || n < 1) throw httpError(422, "Limits must be whole numbers of at least 1.");
      request.planSnapshot.limits[k] = n;
    });
    log(request, "admin", who, "Package limits were adjusted.", true);
  }
  await request.save();
  res.json({ success: true });
});

/* ---------- sourcing ---------- */
export const searchJobseekers = wrap(async (req, res) => {
  const q = str(req.query.q, 80);
  if (q.length < 2) return res.json({ success: true, users: [] });
  const rx = new RegExp(escapeRx(q), "i");
  const users = await User().find({ role: "jobseeker", $or: [{ firstName: rx }, { lastName: rx }, { email: rx }, { phone: rx }] })
    .select("firstName lastName email phone state profilePicture avatar photo").limit(15).lean();
  res.json({ success: true, users });
});

export const addCandidate = wrap(async (req, res) => {
  const request = await findRequest(req.params.id);
  if (!["Active", "Completed"].includes(request.status)) throw httpError(409, "Candidates can only be added once the request has been paid for and is active.");
  const user = await User().findById(req.body?.userId).lean();
  if (!user || user.role !== "jobseeker") throw httpError(404, "Jobseeker not found.");
  if (request.candidates.some((c) => String(c.user) === String(user._id))) throw httpError(409, "This jobseeker is already on the request.");

  let replacementFor = null;
  if (req.body?.replacementId) {
    const rep = await RecruitmentReplacement.findOne({ _id: req.body.replacementId, request: request._id, status: "Approved" });
    if (!rep) throw httpError(404, "Approved replacement not found.");
    replacementFor = rep._id;
  }
  if (request.status === "Completed" && !replacementFor) throw httpError(409, "This request is complete. Only replacement candidates can be added.");

  request.candidates.push({
    user: user._id,
    name: personName(user), email: user.email, phone: user.phone || "", state: user.state || "",
    photo: user.profilePicture || user.avatar || user.photo || "",
    headline: str(req.body?.headline, 160),
    summary: str(req.body?.summary, 4000),
    yearsExperience: req.body?.yearsExperience === "" || req.body?.yearsExperience == null ? undefined : Math.max(0, Number(req.body.yearsExperience) || 0),
    checks: buildChecks(request.planSnapshot.checks),
    replacementFor,
  });
  log(request, "admin", adminName(req), `${personName(user)} was added to the pipeline.`, true);
  await request.save();
  res.status(201).json({ success: true });
});

export const updateCandidate = wrap(async (req, res) => {
  const request = await findRequest(req.params.id);
  const cand = request.candidates.id(req.params.cid);
  if (!cand) throw httpError(404, "Candidate not found.");
  const b = req.body || {};
  const who = adminName(req);

  ["headline", "summary", "adminNotes"].forEach((k) => {
    if (typeof b[k] === "string") cand[k] = str(b[k], k === "headline" ? 160 : 4000);
  });
  if (b.yearsExperience !== undefined && b.yearsExperience !== "") cand.yearsExperience = Math.max(0, Number(b.yearsExperience) || 0);

  if (Array.isArray(b.checks)) {
    b.checks.forEach((patch) => {
      const check = cand.checks.find((c) => c.key === patch.key);
      if (!check) return;
      if (patch.status !== undefined) {
        if (!CHECK_STATUSES.includes(patch.status)) throw httpError(422, "Invalid check status.");
        check.status = patch.status;
      }
      if (typeof patch.note === "string") check.note = str(patch.note, 1000);
      if (typeof patch.reportUrl === "string") check.reportUrl = str(patch.reportUrl, 500);
      check.updatedAt = new Date();
    });
  }

  let interviewScheduled = false;
  if (b.interview && typeof b.interview === "object") {
    const i = b.interview;
    const when = i.scheduledAt ? new Date(i.scheduledAt) : null;
    if (when && Number.isNaN(when.getTime())) throw httpError(422, "Enter a valid interview date and time.");
    if (when || i.status) {
      cand.interview = {
        scheduledAt: when || cand.interview?.scheduledAt,
        mode: ["Onsite", "Video", "Phone"].includes(i.mode) ? i.mode : cand.interview?.mode,
        location: str(i.location, 300),
        status: ["Scheduled", "Completed", "Cancelled"].includes(i.status) ? i.status : "Scheduled",
      };
      interviewScheduled = !!when && cand.interview.status === "Scheduled";
    }
  }

  const wasSubmitted = !!cand.submittedAt;
  if (b.stage && b.stage !== cand.stage) {
    await moveCandidate(request, cand, b.stage, { startDate: b.startDate, reason: str(b.reason, 1000), by: "admin", actorName: who });
  } else if (interviewScheduled && cand.stage === "Submitted") {
    await moveCandidate(request, cand, "Interviewing", { by: "admin", actorName: who });
  }

  if (cand.stage === "Submitted" && !wasSubmitted && cand.replacementFor) {
    await RecruitmentReplacement.findByIdAndUpdate(cand.replacementFor, { status: "Fulfilled" });
  }
  await request.save();

  if (!wasSubmitted && cand.submittedAt) {
    notify(request.employer, `A candidate is ready for review on ${request.reference}`,
      `${cand.name} has been screened, verified and submitted for your ${request.jobTitle} role. Open the request to review the profile and verification results.`);
  }
  if (interviewScheduled) {
    notify(request.employer, `Interview scheduled for ${cand.name}`,
      `An interview with ${cand.name} for ${request.jobTitle} has been scheduled for ${new Date(cand.interview.scheduledAt).toLocaleString("en-NG")}.`);
  }
  res.json({ success: true });
});

export const removeCandidate = wrap(async (req, res) => {
  const request = await findRequest(req.params.id);
  const cand = request.candidates.id(req.params.cid);
  if (!cand) throw httpError(404, "Candidate not found.");
  if (cand.submittedAt) throw httpError(409, "A candidate who has been shown to the client cannot be removed. Move them to Withdrawn instead.");
  cand.deleteOne();
  await request.save();
  res.json({ success: true });
});

/* ---------- documents & notes ---------- */
export const addDocument = wrap(async (req, res) => {
  const request = await findRequest(req.params.id);
  const name = str(req.body?.name, 120);
  const url = str(req.body?.url, 500);
  if (!name) throw httpError(422, "Give the document a name.");
  if (!/^https?:\/\//i.test(url)) throw httpError(422, "Enter a valid link starting with http:// or https://.");
  request.documents.push({ name, url, type: str(req.body?.type, 40) || "Report" });
  log(request, "admin", adminName(req), `Shared a document: ${name}.`);
  await request.save();
  res.status(201).json({ success: true });
});

export const removeDocument = wrap(async (req, res) => {
  const request = await findRequest(req.params.id);
  const doc = request.documents.id(req.params.docId);
  if (!doc) throw httpError(404, "Document not found.");
  doc.deleteOne();
  await request.save();
  res.json({ success: true });
});

export const addNote = wrap(async (req, res) => {
  const request = await findRequest(req.params.id);
  const text = str(req.body?.text, 1000);
  if (!text) throw httpError(422, "Write a note first.");
  log(request, "admin", adminName(req), text, req.body?.internal !== false);
  await request.save();
  res.status(201).json({ success: true });
});

/* ---------- payments ---------- */
export const listPayments = wrap(async (req, res) => {
  const filter = {};
  if (req.query.status) filter.status = req.query.status;
  if (req.query.kind) filter.kind = req.query.kind;
  const rows = await RecruitmentPayment.find(filter).sort({ submittedAt: -1, createdAt: -1 }).limit(200)
    .populate("request", "reference jobTitle planName").populate("employer", EMPLOYER_FIELDS).lean();
  res.json({ success: true, payments: rows });
});

export const decidePayment = wrap(async (req, res) => {
  const payment = await RecruitmentPayment.findById(req.params.paymentId);
  if (!payment) throw httpError(404, "Payment not found.");
  const approve = req.body?.approve === true;
  const note = str(req.body?.note, 300);
  if (approve && !payment.submittedAt && req.body?.force !== true) {
    throw httpError(409, "The client has not submitted transfer details yet. Confirm anyway only if you have seen the money arrive.");
  }
  if (!approve && note.length < 3) throw httpError(422, "Tell the client why the payment was not confirmed.");
  await applyPayment(payment, req.user._id, { approve, note });
  res.json({ success: true });
});

/* ---------- changes ---------- */
export const listChanges = wrap(async (req, res) => {
  const filter = req.query.status ? { status: req.query.status } : {};
  const rows = await RecruitmentChange.find(filter).sort({ createdAt: -1 }).limit(200)
    .populate("request", "reference jobTitle planName fees").populate("employer", EMPLOYER_FIELDS).lean();
  res.json({ success: true, changes: rows, changeTypes: CHANGE_TYPES });
});

export const decideChange = wrap(async (req, res) => {
  const change = await RecruitmentChange.findById(req.params.changeId);
  if (!change) throw httpError(404, "Change request not found.");
  const request = await findRequest(change.request);
  const { action } = req.body || {};
  const note = str(req.body?.adminNote, 500);
  const who = adminName(req);

  if (action === "approve") {
    if (change.status !== "AwaitingApproval") throw httpError(409, "This change has already been reviewed.");
    if (req.body?.fee !== undefined) {
      const fee = Number(req.body.fee);
      if (!Number.isFinite(fee) || fee < 0) throw httpError(422, "Enter a valid fee.");
      change.fee = Math.round(fee);
    } else if (!change.fee) {
      change.fee = changeFee(request);
    }
    change.status = "AwaitingPayment";
    change.adminNote = note;
    change.decidedAt = new Date();
    await RecruitmentPayment.create({
      request: request._id, employer: change.employer, kind: "change_request", change: change._id,
      amount: change.fee, currency: request.fees.currency,
    });
    log(request, "admin", who, "Approved a change request. The change fee is now due.");
    notify(change.employer, `Change request approved for ${request.reference}`,
      `Your change request has been approved. Please pay the change fee from the Payments tab so we can continue.`);
  } else if (action === "decline") {
    if (!["AwaitingApproval", "AwaitingPayment"].includes(change.status)) throw httpError(409, "This change can no longer be declined.");
    if (note.length < 3) throw httpError(422, "Tell the client why the change was declined.");
    change.status = "Declined";
    change.adminNote = note;
    change.decidedAt = new Date();
    await RecruitmentPayment.updateMany({ change: change._id, status: "Pending" }, { status: "Failed", adminNote: "Change request declined." });
    log(request, "admin", who, `Declined a change request. ${note}`);
    notify(change.employer, `Change request declined for ${request.reference}`, `We could not take on your change request. ${note}`);
  } else if (action === "complete") {
    if (change.status !== "Paid") throw httpError(409, "Only a paid change can be marked as complete.");
    change.status = "Completed";
    change.adminNote = note || change.adminNote;
    log(request, "admin", who, "A change request was completed.");
  } else {
    throw httpError(400, "Unknown action.");
  }
  await Promise.all([change.save(), request.save()]);
  res.json({ success: true });
});

/* ---------- replacements ---------- */
export const listReplacements = wrap(async (req, res) => {
  const filter = req.query.status ? { status: req.query.status } : {};
  const rows = await RecruitmentReplacement.find(filter).sort({ createdAt: -1 }).limit(200)
    .populate("request", "reference jobTitle planName").populate("employer", EMPLOYER_FIELDS)
    .populate("change", "status fee").lean();
  res.json({ success: true, replacements: rows });
});

export const decideReplacement = wrap(async (req, res) => {
  const rep = await RecruitmentReplacement.findById(req.params.replId);
  if (!rep) throw httpError(404, "Replacement request not found.");
  const request = await findRequest(rep.request);
  const { action } = req.body || {};
  const note = str(req.body?.adminNote, 500);
  const who = adminName(req);

  if (action === "approve") {
    if (rep.status !== "Pending") throw httpError(409, "This request has already been decided.");
    if (rep.change) {
      const change = await RecruitmentChange.findById(rep.change);
      if (change && !["Paid", "Completed"].includes(change.status)) {
        throw httpError(409, "The client has not yet paid the fee for revised requirements. Approve the change and wait for payment first.");
      }
    }
    const cand = request.candidates.id(rep.candidateId);
    if (cand && cand.stage === "Hired") await moveCandidate(request, cand, "Replaced", { by: "admin", actorName: who });
    rep.status = "Approved";
    log(request, "admin", who, `Approved the replacement for ${rep.candidateName}. We will source a new candidate.`);
    notify(rep.employer, `Replacement approved for ${request.reference}`,
      `We have approved your replacement request for ${rep.candidateName}. Our team will now source a replacement candidate.`);
  } else if (action === "reject") {
    if (rep.status !== "Pending") throw httpError(409, "This request has already been decided.");
    if (note.length < 3) throw httpError(422, "Tell the client why the replacement was not approved.");
    rep.status = "Rejected";
    log(request, "admin", who, `Replacement for ${rep.candidateName} was not approved. ${note}`);
    notify(rep.employer, `Replacement request update for ${request.reference}`, `We could not approve your replacement request for ${rep.candidateName}. ${note}`);
  } else if (action === "fulfil") {
    if (rep.status !== "Approved") throw httpError(409, "Only an approved replacement can be marked as fulfilled.");
    rep.status = "Fulfilled";
  } else {
    throw httpError(400, "Unknown action.");
  }
  rep.adminNote = note || rep.adminNote;
  rep.decidedAt = new Date();
  await Promise.all([rep.save(), request.save()]);
  res.json({ success: true });
});

/* ---------- package pricing ---------- */
export const listPlans = wrap(async (_req, res) => {
  res.json({ success: true, plans: await getPlans() });
});

export const updatePlan = wrap(async (req, res) => {
  const plan = await savePlanSettings(req.params.key, { pricing: req.body?.pricing, active: req.body?.active });
  res.json({ success: true, plan });
});