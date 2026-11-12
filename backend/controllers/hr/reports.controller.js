import { HrEmployee, HrLeave, HrAttendance, HrPayslip } from "../../models/Hr.js";
import { dateStr, monthKey, isWorkDay, monthRange, round2 } from "../../utils/hrCalc.js";
import { wrap, getSettings } from "./shared.js";

const DAY = 864e5;
const tally = (items, key) => {
  const m = {};
  items.forEach((i) => { const k = (typeof key === "function" ? key(i) : i[key]) || "Not set"; m[k] = (m[k] || 0) + 1; });
  return Object.entries(m).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
};
const years = (from, to = new Date()) => (to - new Date(from)) / (365.25 * DAY);
const band = (v, edges, labels) => { const i = edges.findIndex((e) => v < e); return labels[i === -1 ? labels.length - 1 : i]; };
// Days until the next birthday/anniversary of a date (0 = today)
const untilNext = (d, now) => {
  const x = new Date(d), n = new Date(now);
  let next = Date.UTC(n.getUTCFullYear(), x.getUTCMonth(), x.getUTCDate());
  if (next < Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate())) next = Date.UTC(n.getUTCFullYear() + 1, x.getUTCMonth(), x.getUTCDate());
  return Math.round((next - Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate())) / DAY);
};

export const overview = wrap("overview", async (req, res) => {
  const uid = req.user._id;
  const now = new Date(), today = dateStr(), month = monthKey();
  const settings = await getSettings(uid);
  const emps = await HrEmployee.find({ employer: uid })
    .select("firstName lastName staffId photo jobTitle department employmentType gender dateOfBirth hireDate exitDate status probationEndDate contractEndDate documents compensation.basic compensation.allowances tasks").lean();
  const current = emps.filter((e) => ["Active", "OnLeave", "Suspended"].includes(e.status));
  const name = (e) => `${e.firstName} ${e.lastName}`;
  const ymNow = new Date(now.getFullYear(), now.getMonth(), 1);
  const months = Array.from({ length: 12 }, (_, i) => { const d = new Date(ymNow.getFullYear(), ymNow.getMonth() - (11 - i), 1); return { key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`, label: d.toLocaleDateString("en-NG", { month: "short", year: "2-digit" }) }; });
  const k = (d) => dateStr(d).slice(0, 7);

  const exits12 = emps.filter((e) => e.exitDate && now - new Date(e.exitDate) < 365 * DAY).length;
  const avgHead = Math.max(1, (current.length + exits12 + current.length) / 2);
  const payroll = current.filter((e) => e.status === "Active").reduce((s, e) => s + (e.compensation?.basic || 0) + (e.compensation?.allowances || []).reduce((a, x) => a + (x.amount || 0), 0), 0);

  const [pendingLeaves, pendingList, todayRecs, todayLeaves, leaveByType, slipTrend, slipMonth] = await Promise.all([
    HrLeave.countDocuments({ employer: uid, status: "Pending" }),
    HrLeave.find({ employer: uid, status: "Pending" }).sort({ createdAt: 1 }).limit(5).populate("employee", "firstName lastName photo").lean(),
    HrAttendance.find({ employer: uid, date: today }).select("status").lean(),
    HrLeave.countDocuments({ employer: uid, status: "Approved", startDate: { $lte: today }, endDate: { $gte: today } }),
    HrLeave.aggregate([{ $match: { employer: uid, status: "Approved", startDate: { $gte: `${now.getFullYear()}-01-01` } } }, { $group: { _id: "$typeName", days: { $sum: "$days" } } }, { $sort: { days: -1 } }]),
    HrPayslip.aggregate([{ $match: { employer: uid, month: { $gte: months[6].key } } }, { $group: { _id: "$month", gross: { $sum: "$gross" }, net: { $sum: "$net" }, paye: { $sum: "$paye" } } }]),
    HrPayslip.aggregate([{ $match: { employer: uid, month } }, { $group: { _id: "$status", count: { $sum: 1 }, net: { $sum: "$net" } } }]),
  ]);

  const attendance = { present: 0, late: 0, absent: 0, halfDay: 0, onLeave: todayLeaves };
  todayRecs.forEach((r) => { if (r.status === "Present") attendance.present++; else if (r.status === "Late") attendance.late++; else if (r.status === "HalfDay") attendance.halfDay++; else if (r.status === "Absent") attendance.absent++; });
  attendance.expected = isWorkDay(today, settings) ? current.filter((e) => e.status === "Active").length : 0;

  const upcoming = (list, days) => list.filter((x) => x.in <= days).sort((a, b) => a.in - b.in);
  const documents = current.flatMap((e) => (e.documents || []).filter((d) => d.expiresAt).map((d) => ({ name: name(e), item: d.name, date: d.expiresAt, in: Math.ceil((new Date(d.expiresAt) - now) / DAY) })));

  res.json({
    success: true, month,
    kpis: {
      headcount: current.length, active: current.filter((e) => e.status === "Active").length, onLeaveStatus: current.filter((e) => e.status === "OnLeave").length,
      suspended: current.filter((e) => e.status === "Suspended").length, former: emps.length - current.length,
      newHires30: emps.filter((e) => now - new Date(e.hireDate) < 30 * DAY).length, exits12, turnover: Math.round((exits12 / avgHead) * 100),
      avgTenure: current.length ? round2(current.reduce((s, e) => s + years(e.hireDate), 0) / current.length) : 0,
      monthlyPayrollEstimate: round2(payroll), pendingLeaves, openTasks: current.reduce((s, e) => s + (e.tasks || []).filter((t) => !t.done && t.assignedTo === "employer").length, 0),
    },
    byDepartment: tally(current, "department"), byType: tally(current, "employmentType"), byGender: tally(current, (e) => (e.gender ? String(e.gender)[0].toUpperCase() + String(e.gender).slice(1).toLowerCase() : "")),
    tenure: tally(current, (e) => band(years(e.hireDate), [1, 2, 5, 10], ["Under 1 year", "1-2 years", "2-5 years", "5-10 years", "10+ years"])),
    ageGroups: tally(current.filter((e) => e.dateOfBirth), (e) => band(years(e.dateOfBirth), [25, 35, 45, 55], ["Under 25", "25-34", "35-44", "45-54", "55+"])),
    hiresVsExits: months.map((m) => ({ label: m.label, hires: emps.filter((e) => k(e.hireDate) === m.key).length, exits: emps.filter((e) => e.exitDate && k(e.exitDate) === m.key).length })),
    birthdays: upcoming(current.filter((e) => e.dateOfBirth).map((e) => ({ name: name(e), photo: e.photo, date: e.dateOfBirth, in: untilNext(e.dateOfBirth, now) })), 30).slice(0, 8),
    anniversaries: upcoming(current.filter((e) => years(e.hireDate) >= 0.9).map((e) => ({ name: name(e), photo: e.photo, date: e.hireDate, years: Math.round(years(e.hireDate, new Date(+now + untilNext(e.hireDate, now) * DAY))), in: untilNext(e.hireDate, now) })), 30).slice(0, 8),
    probationEnding: upcoming(current.filter((e) => e.probationEndDate && new Date(e.probationEndDate) >= now).map((e) => ({ name: name(e), date: e.probationEndDate, id: e._id, in: Math.ceil((new Date(e.probationEndDate) - now) / DAY) })), 30),
    contractsEnding: upcoming(current.filter((e) => e.contractEndDate && new Date(e.contractEndDate) >= now).map((e) => ({ name: name(e), date: e.contractEndDate, id: e._id, in: Math.ceil((new Date(e.contractEndDate) - now) / DAY) })), 60),
    documentsExpiring: upcoming(documents.filter((d) => d.in >= 0), 30), documentsExpired: documents.filter((d) => d.in < 0).length,
    pendingLeaveList: pendingList.map((l) => ({ _id: l._id, name: l.employee ? `${l.employee.firstName} ${l.employee.lastName}` : "", photo: l.employee?.photo, typeName: l.typeName, startDate: l.startDate, endDate: l.endDate, days: l.days })),
    attendanceToday: attendance, leaveByType: leaveByType.map((l) => ({ name: l._id, days: l.days })),
    payrollTrend: months.slice(6).map((m) => { const r = slipTrend.find((x) => x._id === m.key); return { label: m.label, gross: round2(r?.gross), net: round2(r?.net), paye: round2(r?.paye) }; }),
    payrollThisMonth: Object.fromEntries(slipMonth.map((s) => [s._id, { count: s.count, net: round2(s.net) }])),
  });
});