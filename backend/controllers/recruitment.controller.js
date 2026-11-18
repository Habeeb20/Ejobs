// backend/controllers/recruitmentController.js  (employer side + public catalogue)
import {
  RecruitmentRequest, RecruitmentPayment, RecruitmentChange, RecruitmentReplacement,
} from "../models/Recruitment.js";
import {
  TERMS_VERSION, CURRENCY, CHECKS, POLICIES, CHANGE_TYPES, REPLACEMENT_REASONS,
  CHANGE_REQUEST_FEE_PCT, HIRING_ENGAGEMENT_FEE_PCT,
} from "../config/recruitmentPlans.js";
import {
  httpError, wrap, log, getPlans, getPlan, quote, changeFee, moveCandidate, replacementQuota,
  clientView, summarise, personName, settleGatewayPayment,
} from "../services/recruitmentService.js";
import { paystackEnabled, newReference, initializeTransaction, verifyTransaction, validSignature } from "../services/paystackService.js";

const str = (v, max) => String(v ?? "").trim().slice(0, max);
const list = (v, maxItems = 20, maxLen = 40) =>
  (Array.isArray(v) ? v : String(v || "").split(",")).map((s) => str(s, maxLen)).filter(Boolean).slice(0, maxItems);

const publicPlan = (p) => ({ ...p, id: undefined });
const bankDetails = () => ({
  bankName: process.env.RECRUITMENT_BANK_NAME || "",
  accountName: process.env.RECRUITMENT_ACCOUNT_NAME || "",
  accountNumber: process.env.RECRUITMENT_ACCOUNT_NUMBER || "",
});

async function findOwned(req) {
  const request = await RecruitmentRequest.findOne({ _id: req.params.id, employer: req.user._id });
  if (!request) throw httpError(404, "Recruitment request not found.");
  return request;
}

/* ---------- catalogue ---------- */
export const getCatalog = wrap(async (_req, res) => {
  const plans = (await getPlans({ onlyActive: true })).map(publicPlan);
  res.json({
    success: true,
    plans,
    policies: POLICIES,
    changeTypes: CHANGE_TYPES,
    replacementReasons: REPLACEMENT_REASONS.map(({ code, label, eligible, explain }) => ({ code, label, eligible, explain })),
    checks: CHECKS,
    termsVersion: TERMS_VERSION,
    currency: CURRENCY,
    changeFeePct: CHANGE_REQUEST_FEE_PCT,
    engagementFeePct: HIRING_ENGAGEMENT_FEE_PCT,
    bank: bankDetails(),
    paystack: { enabled: paystackEnabled() },
  });
});

export const quoteRequest = wrap(async (req, res) => {
  const plan = await getPlan(req.body?.plan, { onlyActive: true });
  if (!plan) throw httpError(404, "That package is not available.");
  const fees = quote(plan, {
    annualSalary: Math.max(0, Number(req.body?.annualSalary) || 0),
    hiringEngagement: req.body?.hiringEngagement === true,
  });
  res.json({ success: true, fees, paymentTerms: plan.paymentTerms });
});

/* ---------- requests ---------- */
export const createRequest = wrap(async (req, res) => {
  const b = req.body || {};
  const plan = await getPlan(b.plan, { onlyActive: true });
  if (!plan) throw httpError(404, "That package is not available.");
  if (b.termsAccepted !== true) throw httpError(422, "Please accept the recruitment terms to continue.");

  const jobTitle = str(b.jobTitle, 120);
  const description = str(b.description, 5000);
  if (jobTitle.length < 3) throw httpError(422, "Enter the job title.");
  if (description.length < 30) throw httpError(422, "Describe the role in a few sentences (at least 30 characters).");

  const annualSalary = Math.max(0, Number(b.annualSalary) || 0);
  const hiringEngagement = b.hiringEngagement === true;
  const fees = quote(plan, { annualSalary, hiringEngagement });

  const payload = {
    employer: req.user._id,
    plan: plan.key,
    planName: plan.name,
    planSnapshot: {
      durationDays: plan.durationDays, paymentTerms: plan.paymentTerms, limits: plan.limits,
      checks: plan.checks, replacement: plan.replacement,
    },
    jobTitle, description,
    qualifications: str(b.qualifications, 3000),
    skills: list(b.skills),
    experience: str(b.experience, 200),
    location: str(b.location, 160),
    employmentType: str(b.employmentType, 40) || "Full-time",
    annualSalary, hiringEngagement, fees,
    termsVersion: TERMS_VERSION, termsAcceptedAt: new Date(),
    timeline: [{ actor: "client", actorName: personName(req.user), text: `Ordered the ${plan.name} package for ${jobTitle}.` }],
  };

  let request;
  for (let i = 0; i < 5 && !request; i += 1) {
    try {
      request = await RecruitmentRequest.create(payload);
    } catch (e) {
      if (!(e.code === 11000 && e.keyPattern?.reference)) throw e;
    }
  }
  if (!request) throw httpError(500, "Could not create the request. Please try again.");

  await RecruitmentPayment.create({
    request: request._id, employer: req.user._id, kind: "upfront", amount: fees.upfront, currency: fees.currency,
  });
  res.status(201).json({ success: true, request: clientView(request) });
});

export const listMyRequests = wrap(async (req, res) => {
  const rows = await RecruitmentRequest.find({ employer: req.user._id }).sort({ createdAt: -1 }).lean();
  res.json({ success: true, requests: rows.map(summarise) });
});

export const getMyRequest = wrap(async (req, res) => {
  const request = await findOwned(req);
  const [payments, changes, replacements, quota] = await Promise.all([
    RecruitmentPayment.find({ request: request._id }).sort({ createdAt: -1 }).lean(),
    RecruitmentChange.find({ request: request._id }).sort({ createdAt: -1 }).lean(),
    RecruitmentReplacement.find({ request: request._id }).sort({ createdAt: -1 }).lean(),
    replacementQuota(request),
  ]);

  const view = clientView(request);
  const openFor = new Set(replacements.filter((r) => ["Pending", "Approved"].includes(r.status)).map((r) => String(r.candidateId)));
  const now = new Date();
  view.candidates.forEach((c) => {
    c.canReplace = c.stage === "Hired" && !!c.replacementUntil && new Date(c.replacementUntil) >= now
      && quota.remaining > 0 && !openFor.has(String(c._id));
  });
  res.json({ success: true, request: view, payments, changes, replacements, quota, bank: bankDetails() });
});

export const cancelRequest = wrap(async (req, res) => {
  const request = await findOwned(req);
  if (request.status !== "AwaitingPayment") {
    throw httpError(409, "Only requests that have not been paid for can be cancelled. Contact us if you need help with an active request.");
  }
  request.status = "Cancelled";
  request.cancelledAt = new Date();
  request.statusReason = str(req.body?.reason, 300) || "Cancelled by the client before payment.";
  log(request, "client", personName(req.user), "Cancelled the request before payment.");
  await request.save();
  await RecruitmentPayment.updateMany({ request: request._id, status: "Pending" }, { status: "Failed", adminNote: "Request cancelled." });
  res.json({ success: true, request: clientView(request) });
});

/* ---------- payments ---------- */
export const submitPaymentProof = wrap(async (req, res) => {
  const request = await findOwned(req);
  const payment = await RecruitmentPayment.findOne({ _id: req.params.paymentId, request: request._id, employer: req.user._id });
  if (!payment) throw httpError(404, "Payment not found.");
  if (payment.status !== "Pending") throw httpError(409, "This payment has already been processed.");

  const reference = str(req.body?.reference, 120);
  if (reference.length < 3) throw httpError(422, "Enter the transfer reference or the name on the sending account.");
  payment.reference = reference;
  payment.proofUrl = str(req.body?.proofUrl, 500);
  payment.note = str(req.body?.note, 500);
  payment.adminNote = "";
  payment.submittedAt = new Date();
  await payment.save();

  log(request, "client", personName(req.user), "Submitted transfer details for payment confirmation.", true);
  await request.save();
  res.json({ success: true, payment });
});

/* ---------- online payment (Paystack) ---------- */
async function findOwnPayment(req, request) {
  const payment = await RecruitmentPayment.findOne({ _id: req.params.paymentId, request: request._id, employer: req.user._id });
  if (!payment) throw httpError(404, "Payment not found.");
  return payment;
}

/** Step 1: create the Paystack transaction. The amount comes from our database, never from the browser. */
export const paystackInitialize = wrap(async (req, res) => {
  if (!paystackEnabled()) throw httpError(503, "Online payment is not available right now. Please pay by bank transfer.");
  const request = await findOwned(req);
  if (request.status === "Cancelled") throw httpError(409, "This request was cancelled.");
  const payment = await findOwnPayment(req, request);
  if (payment.status !== "Pending") throw httpError(409, "This payment has already been processed.");
  if (!req.user.email) throw httpError(422, "Add an email address to your account before paying online.");

  const reference = newReference();
  const data = await initializeTransaction({
    email: req.user.email,
    amountNaira: payment.amount,
    currency: payment.currency || CURRENCY,
    reference,
    metadata: {
      source: "recruitment", paymentId: String(payment._id), requestId: String(request._id), requestReference: request.reference, kind: payment.kind,
      custom_fields: [{ display_name: "Recruitment request", variable_name: "request_reference", value: request.reference }],
    },
  });
  payment.gateway.provider = "paystack";
  payment.gateway.reference = data.reference || reference;
  payment.gateway.accessCode = data.access_code;
  payment.gateway.verified = false;
  payment.gateway.initializedAt = new Date();
  await payment.save();
  res.json({ success: true, accessCode: data.access_code, reference: payment.gateway.reference });
});

/** Step 2: after the popup reports success (or when the client taps "Check payment status"), confirm with Paystack. */
export const paystackVerify = wrap(async (req, res) => {
  const request = await findOwned(req);
  const payment = await findOwnPayment(req, request);
  if (payment.status === "Paid") return res.json({ success: true, status: "paid" });
  if (!payment.gateway?.reference) throw httpError(409, "No online payment has been started for this invoice.");

  const tx = await verifyTransaction(payment.gateway.reference);
  if (tx.status === "success") {
    await settleGatewayPayment(payment, tx);
    return res.json({ success: true, status: "paid" });
  }
  if (["failed", "abandoned", "reversed"].includes(tx.status)) {
    return res.json({ success: true, status: tx.status, message: tx.gateway_response || "The payment was not completed." });
  }
  return res.json({ success: true, status: "pending", message: "We have not received the payment yet. If you have been debited, it will reflect shortly." });
});

/** Settles a payment from a Paystack `charge.success` event. Call this from your existing webhook if you already have one. */
export async function settleFromWebhookEvent(evt) {
  if (evt?.event !== "charge.success") return false;
  const reference = evt.data?.reference;
  if (!reference) return false;
  const payment = await RecruitmentPayment.findOne({ "gateway.reference": reference });
  if (!payment) return false; // not a recruitment payment
  try {
    await settleGatewayPayment(payment, await verifyTransaction(reference));
  } catch (e) {
    if (e.status !== 409) console.error("[recruitment] webhook settle failed:", e.message);
  }
  return true;
}

/** Paystack webhook: POST /api/recruitment/paystack/webhook. Set this URL in your Paystack dashboard. */
export const paystackWebhook = async (req, res) => {
  const isRaw = Buffer.isBuffer(req.body);
  const raw = isRaw ? req.body : req.rawBody || Buffer.from(JSON.stringify(req.body || {}));
  if (!validSignature(raw, req.headers["x-paystack-signature"])) return res.sendStatus(401);
  res.sendStatus(200); // acknowledge first; Paystack retries if we are slow
  try {
    await settleFromWebhookEvent(isRaw ? JSON.parse(raw.toString("utf8")) : req.body);
  } catch (e) {
    console.error("[recruitment] webhook error:", e.message);
  }
};

/* ---------- candidate decisions ---------- */
const DECISIONS = {
  interview: { from: ["Submitted"], to: "Interviewing" },
  offer: { from: ["Submitted", "Interviewing"], to: "Offered" },
  hire: { from: ["Submitted", "Interviewing", "Offered"], to: "Hired" },
  reject: { from: ["Submitted", "Interviewing", "Offered"], to: "Rejected" },
};

export const decideCandidate = wrap(async (req, res) => {
  const request = await findOwned(req);
  if (!["Active", "Completed"].includes(request.status)) throw httpError(409, "This request is not active.");
  const cand = request.candidates.id(req.params.cid);
  if (!cand || !cand.submittedAt) throw httpError(404, "Candidate not found.");

  const { decision } = req.body || {};
  const note = str(req.body?.note, 1000);
  const actorName = personName(req.user);

  if (decision === "feedback") {
    if (note.length < 2) throw httpError(422, "Write your feedback first.");
    cand.clientFeedback = note;
    log(request, "client", actorName, `Left feedback on ${cand.name}.`);
  } else {
    const rule = DECISIONS[decision];
    if (!rule) throw httpError(400, "Unknown action.");
    if (!rule.from.includes(cand.stage)) throw httpError(409, `You cannot do this while the candidate is "${cand.stage}".`);
    if (decision === "reject" && note.length < 3) throw httpError(422, "Tell us briefly why you are not taking this candidate forward.");
    if (decision === "interview") cand.interviewRequestedAt = new Date();
    if (note && decision !== "reject") cand.clientFeedback = note;
    await moveCandidate(request, cand, rule.to, { startDate: req.body?.startDate, reason: note, by: "client", actorName });
  }
  await request.save();
  res.json({ success: true, request: clientView(request) });
});

/* ---------- change requests ---------- */
export const createChange = wrap(async (req, res) => {
  const request = await findOwned(req);
  if (!["Active", "Completed"].includes(request.status)) throw httpError(409, "Changes can only be requested once recruitment has started.");
  const type = req.body?.type;
  if (!CHANGE_TYPES.some((t) => t.value === type)) throw httpError(422, "Choose what you would like to change.");
  const description = str(req.body?.description, 2000);
  if (description.length < 10) throw httpError(422, "Describe the change in a few words.");
  if (req.body?.acceptFee !== true) throw httpError(422, "Please confirm that you accept the change request fee.");

  const change = await RecruitmentChange.create({
    request: request._id, employer: req.user._id, type, description, fee: changeFee(request),
  });
  log(request, "client", personName(req.user), `Requested a change: ${CHANGE_TYPES.find((t) => t.value === type).label}.`);
  await request.save();
  res.status(201).json({ success: true, change });
});

/* ---------- replacements ---------- */
export const createReplacement = wrap(async (req, res) => {
  const request = await findOwned(req);
  if (!["Active", "Completed"].includes(request.status)) throw httpError(409, "This request is not active.");

  const cand = request.candidates.id(req.body?.candidateId);
  if (!cand || cand.stage !== "Hired") throw httpError(404, "Choose a candidate who has been hired.");
  if (!cand.replacementUntil || new Date(cand.replacementUntil) < new Date()) {
    throw httpError(422, `The replacement period for ${cand.name} has ended.`);
  }
  const reason = REPLACEMENT_REASONS.find((r) => r.code === req.body?.reasonCode);
  if (!reason) throw httpError(422, "Choose the reason for the replacement.");
  if (reason.eligible === false) throw httpError(422, reason.explain, { ineligible: true });

  const open = await RecruitmentReplacement.exists({ request: request._id, candidateId: cand._id, status: { $in: ["Pending", "Approved"] } });
  if (open) throw httpError(409, "A replacement request for this candidate is already open.");
  const quota = await replacementQuota(request);
  if (quota.remaining < 1) throw httpError(409, "No replacements are left on this package.");

  const details = str(req.body?.details, 2000);
  if (reason.eligible === "review" && details.length < 10) throw httpError(422, "Tell us what happened so our team can review it.");
  const revised = req.body?.revisedRequirements === true;
  if (revised && req.body?.acceptFee !== true) throw httpError(422, "Please confirm that you accept the fee for revised requirements.");

  const replacement = await RecruitmentReplacement.create({
    request: request._id, employer: req.user._id, candidateId: cand._id, candidateName: cand.name,
    reasonCode: reason.code, reasonLabel: reason.label, details,
    needsReview: reason.eligible === "review", revisedRequirements: revised,
  });
  if (revised) {
    const change = await RecruitmentChange.create({
      request: request._id, employer: req.user._id, type: "revised_requirements",
      description: `Revised requirements for the replacement of ${cand.name}. ${details}`.trim().slice(0, 2000), fee: changeFee(request),
    });
    replacement.change = change._id;
    await replacement.save();
  }
  log(request, "client", personName(req.user), `Asked for a replacement for ${cand.name}.`);
  await request.save();
  res.status(201).json({ success: true, replacement });
});