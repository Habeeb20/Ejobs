// backend/controllers/careerProfile.controller.js
import User from "../models/User.js"; // adjust to your User model path
import {
  DISABILITY_OPTIONS, JOB_MODES, JOB_DECISIONS, ARTISAN_TRADES, PRIVATE_STAFF_TYPES, values,
} from "../config/careerOptions.js";

const DISABILITY = values(DISABILITY_OPTIONS);
const MODES = values(JOB_MODES);
const DECISIONS = values(JOB_DECISIONS);
const TRADES = values(ARTISAN_TRADES);
const STAFF = values(PRIVATE_STAFF_TYPES);

// "+TIN" because the schema hides it by default
const FIELDS = "dissability jobMode artisanTrades jobDecision jobChangeFrom jobChangeTo jobDecisionSalary privateStaff privateStaffType +TIN";

const clean = (v, max = 80) => String(v ?? "").replace(/\s+/g, " ").trim().slice(0, max);
const list = (v) => [...new Set((Array.isArray(v) ? v : v ? [v] : []).map((x) => String(x).trim()).filter(Boolean))];

// Turn a user document into the API shape (drops legacy values that are no longer valid options)
const shape = (u = {}) => ({
  dissability: list(u.dissability).filter((v) => DISABILITY.includes(v)),
  jobMode: list(u.jobMode).filter((v) => MODES.includes(v)),
  artisanTrades: list(u.artisanTrades).filter((v) => TRADES.includes(v)),
  jobDecision: DECISIONS.includes(u.jobDecision) ? u.jobDecision : "",
  jobChangeFrom: u.jobChangeFrom || "",
  jobChangeTo: u.jobChangeTo || "",
  jobDecisionSalary: u.jobDecisionSalary || "",
  privateStaff: !!u.privateStaff,
  privateStaffType: STAFF.includes(u.privateStaffType) ? u.privateStaffType : "",
  TIN: u.TIN || "",
});
const KEYS = Object.keys(shape());

function validate(next) {
  const errors = {};
  const out = {};

  out.dissability = list(next.dissability);
  if (out.dissability.some((v) => !DISABILITY.includes(v))) errors.dissability = "Choose from the listed options";

  out.jobMode = list(next.jobMode);
  if (out.jobMode.some((v) => !MODES.includes(v))) errors.jobMode = "Choose professional, artisan or both";

  const artisan = out.jobMode.includes("artisan");
  out.artisanTrades = artisan ? list(next.artisanTrades) : [];
  if (out.artisanTrades.some((v) => !TRADES.includes(v))) errors.artisanTrades = "Choose trades from the list";
  else if (artisan && !out.artisanTrades.length) errors.artisanTrades = "Pick at least one trade";

  out.jobDecision = clean(next.jobDecision);
  if (out.jobDecision && !DECISIONS.includes(out.jobDecision)) errors.jobDecision = "Choose jobseeker or job changer";

  const changer = out.jobDecision === "jobchanger";
  out.jobChangeFrom = changer ? clean(next.jobChangeFrom) : "";
  out.jobChangeTo = changer ? clean(next.jobChangeTo) : "";
  if (changer) {
    if (out.jobChangeFrom.length < 2) errors.jobChangeFrom = "Enter the job you are changing from";
    if (out.jobChangeTo.length < 2) errors.jobChangeTo = "Enter the job you want to move to";
    if (!errors.jobChangeFrom && !errors.jobChangeTo && out.jobChangeFrom.toLowerCase() === out.jobChangeTo.toLowerCase())
      errors.jobChangeTo = "This should be different from your current job";
  }

  out.jobDecisionSalary = String(next.jobDecisionSalary ?? "").replace(/[,\s₦]/g, "");
  if (out.jobDecisionSalary && !/^\d{1,12}$/.test(out.jobDecisionSalary)) errors.jobDecisionSalary = "Enter the amount in numbers only";

  out.privateStaff = next.privateStaff === true || next.privateStaff === "true";
  out.privateStaffType = out.privateStaff ? clean(next.privateStaffType) : "";
  out.TIN = clean(next.TIN, 15).toUpperCase();
  if (out.privateStaff) {
    if (!STAFF.includes(out.privateStaffType)) errors.privateStaffType = "Choose the kind of private staff you are";
    if (!out.TIN) errors.TIN = "TIN is required for private staff";
  }
  if (out.TIN && !/^[A-Z0-9-]{8,15}$/.test(out.TIN)) errors.TIN = "Enter a valid TIN (8 to 15 letters, numbers or dashes)";

  return { out, errors };
}

export const getCareerOptions = (req, res) => {
  res.json({
    success: true,
    options: {
      disability: DISABILITY_OPTIONS,
      jobModes: JOB_MODES,
      jobDecisions: JOB_DECISIONS,
      artisanTrades: ARTISAN_TRADES,
      privateStaffTypes: PRIVATE_STAFF_TYPES,
    },
  });
};

export const getCareerProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select(FIELDS).lean();
    if (!user) return res.status(404).json({ success: false, message: "User not found" });
    res.json({ success: true, profile: shape(user) });
  } catch (err) {
    console.error("getCareerProfile", err);
    res.status(500).json({ success: false, message: "Could not load your career profile" });
  }
};

export const updateCareerProfile = async (req, res) => {
  try {
    const current = await User.findById(req.user._id).select(FIELDS).lean();
    if (!current) return res.status(404).json({ success: false, message: "User not found" });

    // Only fields that were sent override what is saved, so partial updates are safe
    const sent = Object.fromEntries(KEYS.filter((k) => k in (req.body || {})).map((k) => [k, req.body[k]]));
    const { out, errors } = validate({ ...shape(current), ...sent });

    if (Object.keys(errors).length)
      return res.status(422).json({ success: false, message: Object.values(errors)[0], errors });

    const saved = await User.findByIdAndUpdate(req.user._id, { $set: out }, { new: true, runValidators: true }).select(FIELDS).lean();
    res.json({ success: true, message: "Career profile saved", profile: shape(saved) });
  } catch (err) {
    console.error("updateCareerProfile", err);
    res.status(500).json({ success: false, message: "Could not save your career profile" });
  }
};