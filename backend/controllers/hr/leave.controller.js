import { HrLeave, HrEmployee } from "../../models/Hr.js";
import { notifyEmployee, notifyEmployer, logActivity } from "../../utils/hrNotify.js";
import { dateStr, isDateStr, workingDays } from "../../utils/hrCalc.js";
import { wrap, httpError, txt, getSettings, ownEmployee, validId } from "./shared.js";

// Days already taken (approved) or waiting (pending) per employee and leave type, for one calendar year
export const usageFor = async (employeeIds, year) => {
  const rows = await HrLeave.aggregate([
    { $match: { employee: { $in: employeeIds }, status: { $in: ["Approved", "Pending"] }, startDate: { $gte: `${year}-01-01`, $lte: `${year}-12-31` } } },
    { $group: { _id: { e: "$employee", t: "$type", s: "$status" }, days: { $sum: "$days" } } },
  ]);
  const out = {};
  rows.forEach((r) => {
    const e = String(r._id.e);
    out[e] ??= {}; out[e][r._id.t] ??= { used: 0, pending: 0 };
    out[e][r._id.t][r._id.s === "Approved" ? "used" : "pending"] += r.days;
  });
  return out;
};

// One row per leave type this person is allowed to take
export const balanceSheet = (emp, settings, usage = {}) =>
  settings.leaveTypes
    .filter((t) => t.gender === "any" || t.gender === String(emp.gender || "").toLowerCase())
    .map((t) => {
      const u = usage[t.key] || { used: 0, pending: 0 };
      return { key: t.key, name: t.name, paid: t.paid, entitlement: t.days, used: u.used, pending: u.pending,
        remaining: t.days == null ? null : Math.max(0, t.days - u.used - u.pending) };
    });

// Shared by "employee requests leave" and "HR records leave". All the rules live here.
export async function createLeave({ emp, settings, body, by }) {
  const type = settings.leaveTypes.find((t) => t.key === body.type);
  if (!type) throw httpError(400, "Choose a leave type");
  if (type.gender !== "any" && type.gender !== String(emp.gender || "").toLowerCase())
    throw httpError(400, `${type.name} isn't available for this staff member`);
  const { startDate, endDate } = body;
  if (!isDateStr(startDate) || !isDateStr(endDate)) throw httpError(400, "Choose the start and end dates");
  if (endDate < startDate) throw httpError(400, "The end date can't be before the start date");
  if (by === "employee" && startDate < dateStr()) throw httpError(400, "Leave can't start in the past. Ask HR to record it for you.");

  const days = workingDays(startDate, endDate, settings).length;
  if (!days) throw httpError(400, "That range has no working days (weekends and holidays don't count)");

  const clash = await HrLeave.findOne({ employee: emp._id, status: { $in: ["Pending", "Approved"] }, startDate: { $lte: endDate }, endDate: { $gte: startDate } });
  if (clash) throw httpError(409, `There is already leave from ${clash.startDate} to ${clash.endDate} in that range`);

  if (type.days != null) {
    const year = startDate.slice(0, 4);
    const u = (await usageFor([emp._id], year))[String(emp._id)]?.[type.key] || { used: 0, pending: 0 };
    const left = type.days - u.used - u.pending;
    if (days > left) throw httpError(400, `Only ${Math.max(0, left)} day(s) of ${type.name.toLowerCase()} left for ${year}, and you asked for ${days}`);
  }
  return HrLeave.create({
    employer: emp.employer, employee: emp._id, type: type.key, typeName: type.name, paid: type.paid, startDate, endDate, days,
    reason: txt(body.reason, 1000), status: by === "employer" ? "Approved" : "Pending", requestedBy: by,
    decidedAt: by === "employer" ? new Date() : undefined,
  });
}

/* ---------------- employer ---------------- */
export const listLeave = wrap("listLeave", async (req, res) => {
  const { status, employee, from, to } = req.query;
  const filter = { employer: req.user._id };
  if (["Pending", "Approved", "Rejected", "Cancelled"].includes(status)) filter.status = status;
  if (validId(employee)) filter.employee = employee;
  if (isDateStr(from) && isDateStr(to)) { filter.startDate = { $lte: to }; filter.endDate = { $gte: from }; } // overlaps the window
  const leaves = await HrLeave.find(filter).sort(status === "Pending" ? { createdAt: 1 } : { startDate: -1 }).limit(500)
    .populate("employee", "firstName lastName staffId department jobTitle photo").lean();
  const counts = await HrLeave.aggregate([{ $match: { employer: req.user._id } }, { $group: { _id: "$status", count: { $sum: 1 } } }]);
  res.json({ success: true, leaves, counts: Object.fromEntries(counts.map((c) => [c._id, c.count])) });
});

export const hrCreateLeave = wrap("hrCreateLeave", async (req, res) => {
  const emp = await ownEmployee(req, req.body.employee);
  const settings = await getSettings(req.user._id);
  const leave = await createLeave({ emp, settings, body: req.body, by: "employer" });
  await logActivity(req.user._id, emp._id, "employer", "Leave recorded", `${leave.typeName}, ${leave.startDate} to ${leave.endDate}`);
  notifyEmployee(emp, { type: "leave", tab: "leave", title: "Leave was recorded for you",
    body: `${leave.typeName} from ${leave.startDate} to ${leave.endDate} (${leave.days} working day${leave.days === 1 ? "" : "s"}) was approved by HR.` });
  res.status(201).json({ success: true, leave });
});

export const decideLeave = wrap("decideLeave", async (req, res) => {
  if (!validId(req.params.id)) throw httpError(404, "Leave request not found");
  const action = req.body.action;
  if (!["approve", "reject"].includes(action)) throw httpError(400, "Action must be approve or reject");
  const note = txt(req.body.note, 500);
  if (action === "reject" && note.length < 3) throw httpError(400, "Give the employee a reason for rejecting");

  // Only a Pending request can be decided, and only once
  const leave = await HrLeave.findOneAndUpdate(
    { _id: req.params.id, employer: req.user._id, status: "Pending" },
    { $set: { status: action === "approve" ? "Approved" : "Rejected", decidedAt: new Date(), decisionNote: note } }, { new: true });
  if (!leave) throw httpError(409, "This request has already been decided or doesn't exist");

  const emp = await HrEmployee.findById(leave.employee);
  await logActivity(req.user._id, emp._id, "employer", `Leave ${leave.status.toLowerCase()}`, `${leave.typeName}, ${leave.startDate} to ${leave.endDate}`);
  notifyEmployee(emp, { type: "leave", tab: "leave", title: `Your leave was ${leave.status.toLowerCase()}`,
    body: `${leave.typeName} from ${leave.startDate} to ${leave.endDate}.${note ? " Note from HR: " + note : ""}` });
  res.json({ success: true, leave });
});

export const leaveBalances = wrap("leaveBalances", async (req, res) => {
  const year = /^\d{4}$/.test(req.query.year) ? req.query.year : String(new Date().getFullYear());
  const settings = await getSettings(req.user._id);
  const emps = await HrEmployee.find({ employer: req.user._id, status: { $in: ["Active", "OnLeave", "Suspended"] } })
    .select("firstName lastName staffId department gender").sort({ firstName: 1 });
  const usage = await usageFor(emps.map((e) => e._id), year);
  res.json({
    success: true, year, types: settings.leaveTypes,
    rows: emps.map((e) => ({ _id: e._id, name: `${e.firstName} ${e.lastName}`, staffId: e.staffId, department: e.department, balances: balanceSheet(e, settings, usage[String(e._id)]) })),
  });
});