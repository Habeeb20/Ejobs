import { HrAttendance, HrEmployee, HrLeave } from "../../models/Hr.js";
import { notifyEmployee, notifyEmployer } from "../../utils/hrNotify.js";
import { dateStr, monthKey, clockNow, minutes, atLagos, isDateStr, isWorkDay, eachDay, monthRange, round2 } from "../../utils/hrCalc.js";
import { wrap, httpError, txt, getSettings, ownEmployee } from "./shared.js";

const STATUSES = ["Present", "Late", "Absent", "HalfDay", "Leave", "Holiday"];
const hoursBetween = (a, b) => round2((b - a) / 36e5);

export const leaveOn = (employeeId, date) =>
  HrLeave.findOne({ employee: employeeId, status: "Approved", startDate: { $lte: date }, endDate: { $gte: date } });

// Used by the employee dashboard
export async function clockIn(emp) {
  if (emp.status !== "Active") throw httpError(400, "Only active staff can clock in");
  const settings = await getSettings(emp.employer);
  const date = dateStr();
  if (await leaveOn(emp._id, date)) throw httpError(400, "You're on approved leave today");
  if (await HrAttendance.exists({ employee: emp._id, date, clockIn: { $ne: null } })) throw httpError(409, "You've already clocked in today");

  const { start, graceMinutes } = settings.workSchedule;
  const late = isWorkDay(date, settings) && minutes(clockNow()) > minutes(start) + graceMinutes;
  const rec = await HrAttendance.findOneAndUpdate(
    { employee: emp._id, date },
    { $set: { employer: emp.employer, clockIn: new Date(), status: late ? "Late" : "Present", method: "self" } },
    { upsert: true, new: true, setDefaultsOnInsert: true });
  notifyEmployer(emp, { type: "attendance", tab: "hrAttendance", email: false, title: `${emp.firstName} clocked in`, body: `${late ? "Late: " : ""}${clockNow()}` });
  return rec;
}

export async function clockOut(emp) {
  const date = dateStr();
  const rec = await HrAttendance.findOne({ employee: emp._id, date });
  if (!rec?.clockIn) throw httpError(400, "You haven't clocked in today");
  if (rec.clockOut) throw httpError(409, "You've already clocked out today");
  rec.clockOut = new Date();
  rec.hours = hoursBetween(rec.clockIn, rec.clockOut);
  if (rec.hours < 4 && rec.status !== "Absent") rec.status = "HalfDay";
  await rec.save();
  notifyEmployer(emp, { type: "attendance", tab: "hrAttendance", email: false, title: `${emp.firstName} clocked out`, body: `${rec.hours} hours worked` });
  return rec;
}

/* ---------------- employer ---------------- */
// Everyone's status for one day
export const dayBoard = wrap("dayBoard", async (req, res) => {
  const settings = await getSettings(req.user._id);
  const date = isDateStr(req.query.date) ? req.query.date : dateStr();
  const [emps, recs, leaves] = await Promise.all([
    HrEmployee.find({ employer: req.user._id, status: { $in: ["Active", "OnLeave"] }, hireDate: { $lte: new Date(`${date}T23:59:59Z`) } })
      .select("firstName lastName staffId department jobTitle photo").sort({ firstName: 1 }).lean(),
    HrAttendance.find({ employer: req.user._id, date }).lean(),
    HrLeave.find({ employer: req.user._id, status: "Approved", startDate: { $lte: date }, endDate: { $gte: date } }).select("employee typeName").lean(),
  ]);
  const recBy = Object.fromEntries(recs.map((r) => [String(r.employee), r]));
  const leaveBy = Object.fromEntries(leaves.map((l) => [String(l.employee), l]));
  const holiday = settings.holidays.find((h) => h.date === date);
  const working = isWorkDay(date, settings);
  const today = dateStr();
  const over = date < today || (date === today && clockNow() > settings.workSchedule.end);

  const rows = emps.map((e) => {
    const r = recBy[String(e._id)], l = leaveBy[String(e._id)];
    const status = r ? r.status : l ? "Leave" : !working ? (holiday ? "Holiday" : "Weekend") : over ? "Absent" : "NotIn";
    return { ...e, status, clockIn: r?.clockIn, clockOut: r?.clockOut, hours: r?.hours || 0, note: r?.note || "", leaveType: l?.typeName, method: r?.method };
  });
  const summary = {};
  rows.forEach((r) => { summary[r.status] = (summary[r.status] || 0) + 1; });
  res.json({ success: true, date, working, holiday: holiday?.name || null, schedule: settings.workSchedule, rows, summary, total: rows.length });
});

// Month report: days present, late, absent and so on per person
export const monthReport = wrap("monthReport", async (req, res) => {
  const settings = await getSettings(req.user._id);
  const month = /^\d{4}-\d{2}$/.test(req.query.month) ? req.query.month : monthKey();
  const [from, to] = monthRange(month);
  const today = dateStr();
  const last = to < today ? to : today;
  const [emps, recs, leaves] = await Promise.all([
    HrEmployee.find({ employer: req.user._id, hireDate: { $lte: new Date(`${to}T23:59:59Z`) }, $or: [{ status: { $in: ["Active", "OnLeave", "Suspended"] } }, { exitDate: { $gte: new Date(`${from}T00:00:00Z`) } }] })
      .select("firstName lastName staffId department hireDate exitDate").sort({ firstName: 1 }).lean(),
    HrAttendance.find({ employer: req.user._id, date: { $gte: from, $lte: to } }).lean(),
    HrLeave.find({ employer: req.user._id, status: "Approved", startDate: { $lte: to }, endDate: { $gte: from } }).select("employee startDate endDate").lean(),
  ]);
  const days = from <= last ? eachDay(from, last) : [];
  const recKey = {}; recs.forEach((r) => { recKey[`${r.employee}:${r.date}`] = r; });
  const leaveBy = {}; leaves.forEach((l) => { (leaveBy[l.employee] ??= []).push(l); });

  const rows = emps.map((e) => {
    const c = { present: 0, late: 0, halfDay: 0, absent: 0, leave: 0, hours: 0, expected: 0 };
    const hire = dateStr(e.hireDate), exit = e.exitDate ? dateStr(e.exitDate) : null;
    for (const d of days) {
      if (d < hire || (exit && d > exit) || !isWorkDay(d, settings)) continue;
      const r = recKey[`${e._id}:${d}`];
      const onLeave = (leaveBy[e._id] || []).some((l) => l.startDate <= d && l.endDate >= d);
      if (r) { c.hours += r.hours || 0; if (r.status === "Late") c.late++; else if (r.status === "HalfDay") c.halfDay++; else if (r.status === "Absent") c.absent++; else c.present++; }
      else if (onLeave) c.leave++;
      else c.absent++;
      if (!onLeave) c.expected++;
    }
    const attended = c.present + c.late + c.halfDay;
    return { _id: e._id, name: `${e.firstName} ${e.lastName}`, staffId: e.staffId, department: e.department, ...c, hours: round2(c.hours),
      rate: c.expected ? Math.round((attended / c.expected) * 100) : null };
  });
  res.json({ success: true, month, rows, workingDays: days.filter((d) => isWorkDay(d, settings)).length });
});

// HR records or corrects attendance for any day up to today
export const markAttendance = wrap("markAttendance", async (req, res) => {
  const emp = await ownEmployee(req, req.body.employee);
  const { date, status } = req.body;
  if (!isDateStr(date) || date > dateStr()) throw httpError(400, "Choose a date that is not in the future");
  if (!STATUSES.includes(status)) throw httpError(400, "Choose a valid status");
  const set = { employer: req.user._id, status, method: "hr", note: txt(req.body.note, 300) };
  const tIn = /^\d{2}:\d{2}$/.test(req.body.clockIn || "") ? atLagos(date, req.body.clockIn) : null;
  const tOut = /^\d{2}:\d{2}$/.test(req.body.clockOut || "") ? atLagos(date, req.body.clockOut) : null;
  if (tIn) set.clockIn = tIn;
  if (tOut) set.clockOut = tOut;
  if (tIn && tOut) { if (tOut <= tIn) throw httpError(400, "Clock-out must be after clock-in"); set.hours = hoursBetween(tIn, tOut); }
  const rec = await HrAttendance.findOneAndUpdate({ employee: emp._id, date }, { $set: set }, { upsert: true, new: true, setDefaultsOnInsert: true });
  notifyEmployee(emp, { type: "attendance", tab: "attendance", email: false, title: "Your attendance was updated", body: `${date}: marked ${status} by HR.${set.note ? " " + set.note : ""}` });
  res.json({ success: true, record: rec });
});