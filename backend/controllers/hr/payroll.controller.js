import { HrPayslip, HrEmployee, HrLeave } from "../../models/Hr.js";
import { notifyEmployee, logActivity } from "../../utils/hrNotify.js";
import { monthKey, monthRange, workingDays, computePayslip, round2, dateStr } from "../../utils/hrCalc.js";
import { wrap, httpError, txt, num, validId, getSettings } from "./shared.js";

const MONTH = /^\d{4}-\d{2}$/;
const monthName = (m) => new Date(`${m}-15T12:00:00Z`).toLocaleDateString("en-NG", { month: "long", year: "numeric", timeZone: "UTC" });
const nextDay = (s) => new Date(+new Date(`${s}T00:00:00Z`) + 864e5).toISOString().slice(0, 10);
const prevDay = (s) => new Date(+new Date(`${s}T00:00:00Z`) - 864e5).toISOString().slice(0, 10);

// Working days in the month that are unpaid: approved unpaid leave, days before the hire date, days after the exit date
async function unpaidDaysFor(emp, month, settings) {
  const [from, to] = monthRange(month);
  const days = new Set();
  const leaves = await HrLeave.find({ employee: emp._id, status: "Approved", paid: false, startDate: { $lte: to }, endDate: { $gte: from } }).lean();
  leaves.forEach((l) => workingDays(l.startDate < from ? from : l.startDate, l.endDate > to ? to : l.endDate, settings).forEach((d) => days.add(d)));
  const hire = dateStr(emp.hireDate);
  if (hire > from) workingDays(from, hire > to ? to : prevDay(hire), settings).forEach((d) => days.add(d));
  if (emp.exitDate) { const exit = dateStr(emp.exitDate); if (exit < to) workingDays(nextDay(exit < from ? prevDay(from) : exit), to, settings).forEach((d) => days.add(d)); }
  return days.size;
}

const fromComputed = (c) => ({
  gross: c.gross, pension: c.pension, nhf: c.nhf, rentRelief: c.rentRelief, taxable: c.taxable, paye: c.paye, otherDeductions: c.otherDeductions,
  totalDeductions: c.totalDeductions, net: c.net, employerPension: c.employerPension, unpaidLeaveDays: c.unpaidLeaveDays, unpaidLeaveDeduction: c.unpaidLeaveDeduction,
});
const snapshotOf = (e) => ({ fullName: `${e.firstName} ${e.lastName}`, staffId: e.staffId, jobTitle: e.jobTitle, department: e.department, bank: e.compensation?.bank });

const cleanAdjustments = (list) => {
  if (!Array.isArray(list)) return [];
  return list.slice(0, 20).filter((a) => txt(a.name)).map((a) => {
    if (!["bonus", "overtime", "reimbursement", "deduction"].includes(a.kind)) throw httpError(400, "Choose a valid adjustment type");
    return { kind: a.kind, name: txt(a.name, 60), amount: num(a.amount, { label: "Adjustment amount" }) };
  });
};

export const listPayroll = wrap("listPayroll", async (req, res) => {
  const month = MONTH.test(req.query.month) ? req.query.month : monthKey();
  const payslips = await HrPayslip.find({ employer: req.user._id, month }).sort({ "snapshot.fullName": 1 }).lean();
  const t = { count: payslips.length, gross: 0, net: 0, paye: 0, pension: 0, nhf: 0, employerPension: 0, other: 0 };
  const by = { Draft: 0, Published: 0, Paid: 0 };
  payslips.forEach((p) => { t.gross += p.gross; t.net += p.net; t.paye += p.paye; t.pension += p.pension; t.nhf += p.nhf; t.employerPension += p.employerPension; t.other += p.otherDeductions; by[p.status]++; });
  Object.keys(t).forEach((k) => (t[k] = round2(t[k])));
  const covered = new Set(payslips.map((p) => String(p.employee)));
  const [from] = monthRange(month);
  const eligible = await HrEmployee.countDocuments({ employer: req.user._id, status: "Active", hireDate: { $lte: new Date(`${monthRange(month)[1]}T23:59:59Z`) }, "compensation.basic": { $gt: 0 }, _id: { $nin: [...covered] } });
  res.json({ success: true, month, payslips, totals: t, statusCounts: by, waitingForPayslip: eligible, from });
});

// Creates a Draft payslip for every eligible person who doesn't have one this month yet
export const generatePayroll = wrap("generatePayroll", async (req, res) => {
  const month = MONTH.test(req.body.month) ? req.body.month : null;
  if (!month) throw httpError(400, "Choose a month");
  if (month > monthKey()) throw httpError(400, "You can't run payroll for a future month");
  const settings = await getSettings(req.user._id);
  const [from, to] = monthRange(month);
  const emps = await HrEmployee.find({
    employer: req.user._id, hireDate: { $lte: new Date(`${to}T23:59:59Z`) }, "compensation.basic": { $gt: 0 },
    $or: [{ status: "Active" }, { status: { $in: ["Terminated", "Resigned"] }, exitDate: { $gte: new Date(`${from}T00:00:00Z`) } }],
  });
  const done = new Set((await HrPayslip.find({ employer: req.user._id, month }).select("employee").lean()).map((p) => String(p.employee)));
  let created = 0;
  for (const e of emps) {
    if (done.has(String(e._id))) continue;
    const comp = { basic: e.compensation.basic, allowances: e.compensation.allowances, annualRent: e.compensation.annualRent };
    const c = computePayslip({ comp, settings, month, unpaidDays: await unpaidDaysFor(e, month, settings) });
    await HrPayslip.create({ employer: req.user._id, employee: e._id, month, currency: e.compensation.currency, basic: c.basic, allowances: c.allowances,
      annualRent: comp.annualRent || 0, adjustments: [], ...fromComputed(c), snapshot: snapshotOf(e) });
    created++;
  }
  res.json({ success: true, created, skipped: emps.length - created });
});

export const updatePayslip = wrap("updatePayslip", async (req, res) => {
  if (!validId(req.params.id)) throw httpError(404, "Payslip not found");
  const p = await HrPayslip.findOne({ _id: req.params.id, employer: req.user._id });
  if (!p) throw httpError(404, "Payslip not found");
  if (p.status !== "Draft") throw httpError(400, "Only a draft payslip can be edited");
  const settings = await getSettings(req.user._id);
  const adjustments = req.body.adjustments !== undefined ? cleanAdjustments(req.body.adjustments) : p.adjustments;
  const unpaid = req.body.unpaidLeaveDays !== undefined ? num(req.body.unpaidLeaveDays, { max: 31, label: "Unpaid days" }) : p.unpaidLeaveDays;
  const c = computePayslip({ comp: { basic: p.basic, allowances: p.allowances, annualRent: p.annualRent }, settings, month: p.month, adjustments, unpaidDays: unpaid });
  Object.assign(p, { adjustments }, fromComputed(c));
  await p.save();
  res.json({ success: true, payslip: p });
});

// Pull the latest salary details and unpaid days into a draft
export const recalculatePayslip = wrap("recalculatePayslip", async (req, res) => {
  if (!validId(req.params.id)) throw httpError(404, "Payslip not found");
  const p = await HrPayslip.findOne({ _id: req.params.id, employer: req.user._id });
  if (!p) throw httpError(404, "Payslip not found");
  if (p.status !== "Draft") throw httpError(400, "Only a draft payslip can be recalculated");
  const [e, settings] = await Promise.all([HrEmployee.findById(p.employee), getSettings(req.user._id)]);
  const comp = { basic: e.compensation.basic, allowances: e.compensation.allowances, annualRent: e.compensation.annualRent };
  const c = computePayslip({ comp, settings, month: p.month, adjustments: p.adjustments, unpaidDays: await unpaidDaysFor(e, p.month, settings) });
  Object.assign(p, { basic: c.basic, allowances: c.allowances, annualRent: comp.annualRent || 0, snapshot: snapshotOf(e) }, fromComputed(c));
  await p.save();
  res.json({ success: true, payslip: p });
});

export const deletePayslip = wrap("deletePayslip", async (req, res) => {
  if (!validId(req.params.id)) throw httpError(404, "Payslip not found");
  const r = await HrPayslip.deleteOne({ _id: req.params.id, employer: req.user._id, status: "Draft" });
  if (!r.deletedCount) throw httpError(400, "Only a draft payslip can be deleted");
  res.json({ success: true });
});

// Draft -> Published: the employee sees it instantly and gets an email
export const publishPayroll = wrap("publishPayroll", async (req, res) => {
  const month = MONTH.test(req.body.month) ? req.body.month : null;
  if (!month) throw httpError(400, "Choose a month");
  const filter = { employer: req.user._id, month, status: "Draft" };
  if (Array.isArray(req.body.ids) && req.body.ids.length) filter._id = { $in: req.body.ids.filter(validId) };
  const drafts = await HrPayslip.find(filter);
  if (!drafts.length) throw httpError(400, "There are no draft payslips to publish");
  await HrPayslip.updateMany({ _id: { $in: drafts.map((d) => d._id) } }, { $set: { status: "Published", publishedAt: new Date() } });
  const emps = await HrEmployee.find({ _id: { $in: drafts.map((d) => d.employee) } });
  const byId = Object.fromEntries(emps.map((e) => [String(e._id), e]));
  for (const d of drafts) {
    const e = byId[String(d.employee)];
    if (!e) continue;
    logActivity(req.user._id, e._id, "employer", "Payslip published", monthName(month));
    notifyEmployee(e, { type: "payroll", tab: "payslips", title: `Your ${monthName(month)} payslip is ready`,
      body: `Net pay: ${d.currency} ${d.net.toLocaleString("en-NG")}. Open your staff dashboard to view and print it.` });
  }
  res.json({ success: true, published: drafts.length });
});

// Published -> Paid
export const markPaid = wrap("markPaid", async (req, res) => {
  const month = MONTH.test(req.body.month) ? req.body.month : null;
  if (!month) throw httpError(400, "Choose a month");
  const filter = { employer: req.user._id, month, status: "Published" };
  if (Array.isArray(req.body.ids) && req.body.ids.length) filter._id = { $in: req.body.ids.filter(validId) };
  const rows = await HrPayslip.find(filter);
  if (!rows.length) throw httpError(400, "There are no published payslips to mark as paid");
  const reference = txt(req.body.reference, 80);
  await HrPayslip.updateMany({ _id: { $in: rows.map((r) => r._id) } }, { $set: { status: "Paid", paidAt: new Date(), paymentReference: reference } });
  const emps = await HrEmployee.find({ _id: { $in: rows.map((r) => r.employee) } });
  const byId = Object.fromEntries(emps.map((e) => [String(e._id), e]));
  for (const r of rows) {
    const e = byId[String(r.employee)];
    if (e) notifyEmployee(e, { type: "payroll", tab: "payslips", title: `Your ${monthName(month)} salary has been paid`, body: `${r.currency} ${r.net.toLocaleString("en-NG")} was paid to your account.${reference ? " Reference: " + reference : ""}` });
  }
  res.json({ success: true, paid: rows.length });
});