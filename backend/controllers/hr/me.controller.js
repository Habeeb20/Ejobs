// Everything the employee sees and does. req.emp is the staff record, set by the myEmployment middleware.
import { HrEmployee, HrLeave, HrAttendance, HrPayslip, HrReview, HrGoal, HrCase, HrAnnouncement, HrMessage, DOC_TYPES } from "../../models/Hr.js";
import User from "../../models/User.js";
import { isCloudinaryUrl } from "../../utils/cloudinary.js";
import { notifyEmployer, logActivity } from "../../utils/hrNotify.js";
import { dateStr, monthKey, monthRange, eachDay, isWorkDay } from "../../utils/hrCalc.js";
import { wrap, httpError, txt, date, validId, getSettings } from "./shared.js";
import { cleanEmployee } from "./employees.controller.js";
import { createLeave, usageFor, balanceSheet } from "./leave.controller.js";
import { clockIn, clockOut } from "./attendance.controller.js";
import { sendMessage } from "./comms.controller.js";
import { statusFromProgress } from "./performance.controller.js";

// The employee never sees HR's private notes or documents marked "HR only"
const publicEmployee = (emp) => {
  const e = emp.toObject({ virtuals: true });
  delete e.notes; delete e.lastEmail;
  e.documents = (e.documents || []).filter((d) => d.visibleToEmployee || d.uploadedBy === "employee");
  return e;
};

export const employments = wrap("employments", async (req, res) => {
  const email = String(req.user.email || "").toLowerCase();
  await HrEmployee.updateMany({ email, user: null }, { $set: { user: req.user._id } }); // link accounts that signed up after being added
  const list = await HrEmployee.find({ $or: [{ user: req.user._id }, { email }] }).sort({ createdAt: -1 })
    .populate("employer", "companyName avatar").select("staffId jobTitle department status hireDate employmentType photo firstName lastName employer").lean();
  res.json({ success: true, employments: list.map((e) => ({ ...e, company: e.employer?.companyName || "Your employer", companyLogo: e.employer?.avatar, employer: undefined })) });
});

export const overview = wrap("overview", async (req, res) => {
  const emp = req.emp;
  const settings = await getSettings(emp.employer);
  const today = dateStr(), year = today.slice(0, 4);
  const [employer, manager, usage, todayRec, slip, goals, anns, unread, openCases, pendingLeaves, nextLeave] = await Promise.all([
    User.findById(emp.employer).select("companyName avatar address state"),
    emp.reportsTo ? HrEmployee.findById(emp.reportsTo).select("firstName lastName jobTitle photo") : null,
    usageFor([emp._id], year),
    HrAttendance.findOne({ employee: emp._id, date: today }).lean(),
    HrPayslip.findOne({ employee: emp._id, status: { $in: ["Published", "Paid"] } }).sort({ month: -1 }).lean(),
    HrGoal.find({ employee: emp._id, status: { $ne: "Completed" } }).sort({ dueDate: 1 }).limit(5).lean(),
    HrAnnouncement.find({ employer: emp.employer, $or: [{ audience: "all" }, { audience: "department", department: emp.department }] }).sort({ pinned: -1, createdAt: -1 }).limit(5).lean(),
    HrMessage.countDocuments({ employee: emp._id, from: "employer", readAt: { $exists: false } }),
    HrCase.countDocuments({ employee: emp._id, status: "Open", requiresResponse: true }),
    HrLeave.countDocuments({ employee: emp._id, status: "Pending" }),
    HrLeave.findOne({ employee: emp._id, status: "Approved", endDate: { $gte: today } }).sort({ startDate: 1 }).lean(),
  ]);
  res.json({
    success: true, employee: publicEmployee(emp), company: employer, manager, schedule: settings.workSchedule, today: todayRec,
    balances: balanceSheet(emp, settings, usage[String(emp._id)]), pendingLeaves, nextLeave,
    latestPayslip: slip ? { _id: slip._id, month: slip.month, net: slip.net, currency: slip.currency, status: slip.status } : null,
    openTasks: emp.tasks.filter((t) => !t.done && t.assignedTo === "employee").length, goals,
    announcements: anns.map((a) => ({ _id: a._id, title: a.title, body: a.body, pinned: a.pinned, createdAt: a.createdAt, read: (a.readBy || []).some((r) => String(r) === String(emp._id)) })),
    unreadMessages: unread, casesAwaitingResponse: openCases,
  });
});

// Employees can update their own contact, emergency, bank and ID-number details. Nothing about job, pay or status.
export const updateProfile = wrap("updateProfile", async (req, res) => {
  const emp = req.emp, b = req.body;
  const allowed = {};
  for (const k of ["phone", "address", "state", "localGovernment", "maritalStatus", "emergencyContact", "photo", "middleName", "stateOfOrigin", "nationality"]) if (b[k] !== undefined) allowed[k] = b[k];
  if (b.compensation) allowed.compensation = { bank: b.compensation.bank, taxId: b.compensation.taxId, pensionNumber: b.compensation.pensionNumber, nhfNumber: b.compensation.nhfNumber };
  const d = cleanEmployee(allowed);
  const bankChanged = !!d.compensation?.bank && JSON.stringify(d.compensation.bank) !== JSON.stringify(emp.compensation?.bank?.toObject?.() || {});
  if (d.compensation) {
    const old = emp.compensation.toObject();
    const next = { ...old };
    for (const k of ["taxId", "pensionNumber", "nhfNumber"]) if (d.compensation[k] !== undefined) next[k] = d.compensation[k];
    if (d.compensation.bank) next.bank = { ...(old.bank || {}), ...d.compensation.bank };
    emp.compensation = next;
    delete d.compensation;
  }
  Object.assign(emp, d);
  await emp.save();
  await logActivity(emp.employer, emp._id, "employee", "Updated own profile", bankChanged ? "Bank details changed" : "");
  notifyEmployer(emp, { type: "profile", tab: "hrEmployees", email: bankChanged, title: `${emp.firstName} updated their ${bankChanged ? "bank details" : "profile"}`,
    body: bankChanged ? "Bank details were changed. Please confirm they are correct before the next payroll." : "Contact or emergency details were updated." });
  res.json({ success: true, employee: publicEmployee(emp) });
});

/* ---------------- attendance ---------------- */
export const attendance = wrap("attendance", async (req, res) => {
  const emp = req.emp;
  const settings = await getSettings(emp.employer);
  const month = /^\d{4}-\d{2}$/.test(req.query.month) ? req.query.month : monthKey();
  const [from, to] = monthRange(month);
  const [records, leaves] = await Promise.all([
    HrAttendance.find({ employee: emp._id, date: { $gte: from, $lte: to } }).sort({ date: 1 }).lean(),
    HrLeave.find({ employee: emp._id, status: "Approved", startDate: { $lte: to }, endDate: { $gte: from } }).lean(),
  ]);
  const today = dateStr(), recBy = Object.fromEntries(records.map((r) => [r.date, r]));
  const days = eachDay(from, to).map((d) => {
    const r = recBy[d];
    const leave = leaves.find((l) => l.startDate <= d && l.endDate >= d);
    const holiday = settings.holidays.find((h) => h.date === d);
    const work = isWorkDay(d, settings);
    let status = r ? r.status : leave ? "Leave" : !work ? (holiday ? "Holiday" : "Weekend") : d > today ? "Upcoming" : d === today ? "NotIn" : "Absent";
    if (new Date(`${d}T00:00:00Z`) < new Date(new Date(emp.hireDate).toISOString().slice(0, 10) + "T00:00:00Z")) status = "BeforeHire";
    return { date: d, status, clockIn: r?.clockIn, clockOut: r?.clockOut, hours: r?.hours || 0, holiday: holiday?.name };
  });
  const c = (s) => days.filter((d) => d.status === s).length;
  res.json({ success: true, month, days, schedule: settings.workSchedule, today: recBy[today] || null,
    summary: { present: c("Present"), late: c("Late"), halfDay: c("HalfDay"), absent: c("Absent"), leave: c("Leave"), hours: Math.round(days.reduce((s, d) => s + d.hours, 0) * 10) / 10 } });
});
export const doClockIn = wrap("clockIn", async (req, res) => res.json({ success: true, record: await clockIn(req.emp) }));
export const doClockOut = wrap("clockOut", async (req, res) => res.json({ success: true, record: await clockOut(req.emp) }));

/* ---------------- leave ---------------- */
export const leave = wrap("myLeave", async (req, res) => {
  const emp = req.emp, settings = await getSettings(emp.employer);
  const year = /^\d{4}$/.test(req.query.year) ? req.query.year : dateStr().slice(0, 4);
  const [leaves, usage] = await Promise.all([HrLeave.find({ employee: emp._id }).sort({ startDate: -1 }).limit(60).lean(), usageFor([emp._id], year)]);
  res.json({ success: true, year, leaves, balances: balanceSheet(emp, settings, usage[String(emp._id)]) });
});

export const requestLeave = wrap("requestLeave", async (req, res) => {
  const emp = req.emp;
  if (emp.status !== "Active") throw httpError(400, "Only active staff can request leave");
  const l = await createLeave({ emp, settings: await getSettings(emp.employer), body: req.body, by: "employee" });
  await logActivity(emp.employer, emp._id, "employee", "Requested leave", `${l.typeName}, ${l.startDate} to ${l.endDate}`);
  notifyEmployer(emp, { type: "leave", tab: "hrLeave", title: `${emp.firstName} ${emp.lastName} requested leave`,
    body: `${l.typeName} from ${l.startDate} to ${l.endDate} (${l.days} working day${l.days === 1 ? "" : "s"}).${l.reason ? " Reason: " + l.reason : ""}` });
  res.status(201).json({ success: true, leave: l });
});

export const cancelLeave = wrap("cancelLeave", async (req, res) => {
  if (!validId(req.params.id)) throw httpError(404, "Leave request not found");
  const l = await HrLeave.findOne({ _id: req.params.id, employee: req.emp._id });
  if (!l) throw httpError(404, "Leave request not found");
  const cancellable = l.status === "Pending" || (l.status === "Approved" && l.startDate > dateStr());
  if (!cancellable) throw httpError(400, "This leave can't be cancelled any more. Speak to HR.");
  l.status = "Cancelled";
  await l.save();
  notifyEmployer(req.emp, { type: "leave", tab: "hrLeave", title: `${req.emp.firstName} cancelled a leave request`, body: `${l.typeName}, ${l.startDate} to ${l.endDate}.` });
  res.json({ success: true, leave: l });
});

/* ---------------- payslips ---------------- */
export const payslips = wrap("payslips", async (req, res) => {
  const list = await HrPayslip.find({ employee: req.emp._id, status: { $in: ["Published", "Paid"] } }).sort({ month: -1 }).lean();
  res.json({ success: true, payslips: list });
});
export const payslip = wrap("payslip", async (req, res) => {
  if (!validId(req.params.id)) throw httpError(404, "Payslip not found");
  const p = await HrPayslip.findOne({ _id: req.params.id, employee: req.emp._id, status: { $in: ["Published", "Paid"] } }).lean();
  if (!p) throw httpError(404, "Payslip not found");
  const company = await User.findById(req.emp.employer).select("companyName avatar address state");
  res.json({ success: true, payslip: p, company });
});

/* ---------------- performance ---------------- */
export const reviews = wrap("myReviews", async (req, res) => {
  res.json({ success: true, reviews: await HrReview.find({ employee: req.emp._id, status: { $in: ["Published", "Acknowledged"] } }).sort({ publishedAt: -1 }).lean() });
});
export const acknowledgeReview = wrap("acknowledgeReview", async (req, res) => {
  if (!validId(req.params.id)) throw httpError(404, "Review not found");
  const r = await HrReview.findOneAndUpdate({ _id: req.params.id, employee: req.emp._id, status: "Published" },
    { $set: { status: "Acknowledged", employeeComment: txt(req.body.comment, 2000), acknowledgedAt: new Date() } }, { new: true });
  if (!r) throw httpError(409, "This review was already acknowledged or doesn't exist");
  notifyEmployer(req.emp, { type: "review", tab: "hrPerformance", title: `${req.emp.firstName} acknowledged their review`, body: `${r.period}.${r.employeeComment ? " Comment: " + r.employeeComment : ""}` });
  res.json({ success: true, review: r });
});

export const goals = wrap("myGoals", async (req, res) => {
  res.json({ success: true, goals: await HrGoal.find({ employee: req.emp._id }).sort({ dueDate: 1, createdAt: -1 }).lean() });
});
export const createMyGoal = wrap("createMyGoal", async (req, res) => {
  const title = txt(req.body.title, 160);
  if (!title) throw httpError(400, "Give the goal a title");
  const g = await HrGoal.create({ employer: req.emp.employer, employee: req.emp._id, title, description: txt(req.body.description, 1000),
    dueDate: req.body.dueDate ? date(req.body.dueDate, "Due date") : undefined, createdBy: "employee" });
  res.status(201).json({ success: true, goal: g });
});
export const updateMyGoal = wrap("updateMyGoal", async (req, res) => {
  if (!validId(req.params.id)) throw httpError(404, "Goal not found");
  const g = await HrGoal.findOne({ _id: req.params.id, employee: req.emp._id });
  if (!g) throw httpError(404, "Goal not found");
  const was = g.status;
  if (g.createdBy === "employee") {
    if (req.body.title !== undefined) g.title = txt(req.body.title, 160) || g.title;
    if (req.body.description !== undefined) g.description = txt(req.body.description, 1000);
  }
  if (req.body.progress !== undefined) { g.progress = Math.min(100, Math.max(0, Number(req.body.progress) || 0)); g.status = statusFromProgress(g.progress, g.status); }
  await g.save();
  if (g.status === "Completed" && was !== "Completed") notifyEmployer(req.emp, { type: "goal", tab: "hrPerformance", email: false, title: `${req.emp.firstName} completed a goal`, body: g.title });
  res.json({ success: true, goal: g });
});

/* ---------------- documents and tasks ---------------- */
export const uploadDocument = wrap("uploadDocument", async (req, res) => {
  const emp = req.emp, name = txt(req.body.name, 120);
  if (!name) throw httpError(400, "Give the document a name");
  if (!isCloudinaryUrl(req.body.url)) throw httpError(400, "Upload the file with the uploader so it is stored on Cloudinary");
  emp.documents.push({ name, type: DOC_TYPES.includes(req.body.type) ? req.body.type : "Other", url: req.body.url, visibleToEmployee: true, uploadedBy: "employee",
    expiresAt: req.body.expiresAt ? date(req.body.expiresAt, "Expiry date") : undefined });
  await emp.save();
  await logActivity(emp.employer, emp._id, "employee", "Uploaded a document", name);
  notifyEmployer(emp, { type: "document", tab: "hrEmployees", email: false, title: `${emp.firstName} uploaded a document`, body: name });
  res.status(201).json({ success: true, document: emp.documents[emp.documents.length - 1] });
});
export const removeMyDocument = wrap("removeMyDocument", async (req, res) => {
  const doc = req.emp.documents.id(req.params.docId);
  if (!doc || doc.uploadedBy !== "employee") throw httpError(404, "You can only remove documents you uploaded");
  doc.deleteOne();
  await req.emp.save();
  res.json({ success: true });
});
export const toggleMyTask = wrap("toggleMyTask", async (req, res) => {
  const t = req.emp.tasks.id(req.params.taskId);
  if (!t || t.assignedTo !== "employee") throw httpError(404, "Task not found");
  t.done = !!req.body.done; t.doneAt = t.done ? new Date() : undefined; t.doneBy = t.done ? "employee" : undefined;
  await req.emp.save();
  if (t.done) notifyEmployer(req.emp, { type: "task", tab: "hrEmployees", email: false, title: `${req.emp.firstName} completed a task`, body: t.title });
  res.json({ success: true, task: t });
});

/* ---------------- messages, announcements, notices ---------------- */
export const messages = wrap("myMessages", async (req, res) => {
  const [list] = await Promise.all([
    HrMessage.find({ employee: req.emp._id }).sort({ createdAt: 1 }).limit(300).lean(),
    HrMessage.updateMany({ employee: req.emp._id, from: "employer", readAt: { $exists: false } }, { $set: { readAt: new Date() } }),
  ]);
  res.json({ success: true, messages: list });
});
export const sendMyMessage = wrap("sendMyMessage", async (req, res) =>
  res.status(201).json({ success: true, message: await sendMessage({ emp: req.emp, from: "employee", body: req.body.body }) }));

export const announcements = wrap("myAnnouncements", async (req, res) => {
  const emp = req.emp;
  const list = await HrAnnouncement.find({ employer: emp.employer, $or: [{ audience: "all" }, { audience: "department", department: emp.department }] }).sort({ pinned: -1, createdAt: -1 }).limit(50).lean();
  res.json({ success: true, announcements: list.map((a) => ({ _id: a._id, title: a.title, body: a.body, pinned: a.pinned, createdAt: a.createdAt, read: (a.readBy || []).some((r) => String(r) === String(emp._id)) })) });
});
export const readAnnouncement = wrap("readAnnouncement", async (req, res) => {
  if (!validId(req.params.id)) throw httpError(404, "Announcement not found");
  await HrAnnouncement.updateOne({ _id: req.params.id, employer: req.emp.employer }, { $addToSet: { readBy: req.emp._id } });
  res.json({ success: true });
});

export const cases = wrap("myCases", async (req, res) => {
  res.json({ success: true, cases: await HrCase.find({ employee: req.emp._id }).sort({ createdAt: -1 }).lean() });
});
export const respondCase = wrap("respondCase", async (req, res) => {
  if (!validId(req.params.id)) throw httpError(404, "Notice not found");
  const c = await HrCase.findOne({ _id: req.params.id, employee: req.emp._id });
  if (!c) throw httpError(404, "Notice not found");
  if (c.status === "Closed") throw httpError(400, "This notice is already closed");
  const response = txt(req.body.response, 4000);
  if (c.requiresResponse && response.length < 3) throw httpError(400, "HR asked for your response. Please write it.");
  c.response = response;
  c.respondedAt = new Date();
  c.status = response ? "Responded" : "Acknowledged";
  await c.save();
  notifyEmployer(req.emp, { type: "case", tab: "hrPerformance", title: `${req.emp.firstName} ${response ? "responded to" : "acknowledged"} a notice`, body: `${c.subject}${response ? ": " + response.slice(0, 200) : ""}` });
  res.json({ success: true, case: c });
});