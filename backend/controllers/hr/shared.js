import mongoose from "mongoose";
import { HrSettings, HrEmployee } from "../../models/Hr.js";

export const validId = (id) => mongoose.isValidObjectId(id);
export const httpError = (status, message) => Object.assign(new Error(message), { status });
export const fail = (res, status, message, extra = {}) => res.status(status).json({ success: false, message, ...extra });
export const txt = (v, max = 200) => String(v ?? "").trim().slice(0, max);
export const isEmail = (s) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(s));
export const num = (v, { min = 0, max = 1e12, label = "Amount" } = {}) => {
  const n = Number(v);
  if (!Number.isFinite(n) || n < min || n > max) throw httpError(400, `${label} must be between ${min} and ${max}`);
  return n;
};
export const date = (v, label = "Date") => {
  const d = new Date(v);
  if (isNaN(d)) throw httpError(400, `Enter a valid ${label.toLowerCase()}`);
  return d;
};

// try/catch for every handler, with friendly errors
export const wrap = (label, fn) => async (req, res) => {
  try { await fn(req, res); }
  catch (err) {
    if (err.status) return fail(res, err.status, err.message);
    if (err.name === "ValidationError") return fail(res, 400, Object.values(err.errors)[0].message);
    if (err.code === 11000) return fail(res, 409, "That already exists");
    console.error(`hr ${label}:`, err);
    fail(res, 500, "Something went wrong. Please try again.");
  }
};

// One settings document per employer, created with defaults the first time it is needed
export const getSettings = async (employerId) => {
  try {
    return await HrSettings.findOneAndUpdate({ employer: employerId }, { $setOnInsert: { employer: employerId } },
      { upsert: true, new: true, setDefaultsOnInsert: true });
  } catch (e) {
    if (e.code === 11000) return HrSettings.findOne({ employer: employerId });
    throw e;
  }
};

// EMP-0001, EMP-0002 ... the counter moves atomically so two hires can never share a number
export const nextStaffId = async (employerId) => {
  await getSettings(employerId);
  const before = await HrSettings.findOneAndUpdate({ employer: employerId }, { $inc: { nextStaffNumber: 1 } }, { new: false });
  return `${before.staffIdPrefix}-${String(before.nextStaffNumber).padStart(4, "0")}`;
};

export const employerOnly = (req, res, next) =>
  req.user?.role === "employer" ? next() : fail(res, 403, "Only employers can manage staff");

// Employer side: the employee must belong to this employer
export const ownEmployee = async (req, id = req.params.id) => {
  if (!validId(id)) throw httpError(404, "Employee not found");
  const e = await HrEmployee.findOne({ _id: id, employer: req.user._id });
  if (!e) throw httpError(404, "Employee not found");
  return e;
};

// Employee side: the staff record must belong to the logged-in user (linked by account or by verified email)
export const myEmployment = async (req, res, next) => {
  try {
    if (!validId(req.params.eid)) return fail(res, 404, "Employment record not found");
    const emp = await HrEmployee.findOne({
      _id: req.params.eid, $or: [{ user: req.user._id }, { email: String(req.user.email || "").toLowerCase() }],
    });
    if (!emp) return fail(res, 404, "Employment record not found");
    if (!emp.user) { emp.user = req.user._id; await emp.save(); } // link the account the first time they open it
    req.emp = emp;
    next();
  } catch (err) { console.error("myEmployment:", err); fail(res, 500, "Something went wrong. Please try again."); }
};