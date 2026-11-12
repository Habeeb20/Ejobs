import { HrEmployee, HrActivity, EMPLOYMENT_TYPES, EMPLOYEE_STATUS, DOC_TYPES } from "../../models/Hr.js";
import User from "../../models/User.js";
import Application from "../../models/Application.js";
import Job from "../../models/Job.js"; // registers the job model for populate
import { isCloudinaryUrl } from "../../utils/cloudinary.js";
import { emitToUser } from "../../utils/notify.js";
import { notifyEmployee, logActivity } from "../../utils/hrNotify.js";
import { dateStr } from "../../utils/hrCalc.js";
import { wrap, httpError, txt, isEmail, num, date, validId, getSettings, nextStaffId, ownEmployee } from "./shared.js";

const PERSONAL = ["firstName", "middleName", "lastName", "phone", "gender", "maritalStatus", "nationality", "stateOfOrigin", "address", "state", "localGovernment"];
const LABEL = { firstName: "First name", lastName: "Last name", email: "Email", jobTitle: "Job title", hireDate: "Hire date" };

// Cleans and validates everything an employer (or the employee) can send
export const cleanEmployee = (b, { requireAll = false } = {}) => {
  const d = {};
  for (const k of PERSONAL) if (b[k] !== undefined) d[k] = txt(b[k], 120);
  if (b.email !== undefined) {
    const e = txt(b.email, 160).toLowerCase();
    if (!isEmail(e)) throw httpError(400, "Enter a valid email address");
    d.email = e;
  }
  if (b.dateOfBirth) { d.dateOfBirth = date(b.dateOfBirth, "Date of birth"); if (d.dateOfBirth > new Date()) throw httpError(400, "Date of birth can't be in the future"); }
  if (b.photo !== undefined) {
    if (b.photo && !isCloudinaryUrl(b.photo, "image")) throw httpError(400, "Upload the photo with the uploader so it is stored on Cloudinary");
    d.photo = b.photo || "";
  }
  if (b.emergencyContact) {
    const e = b.emergencyContact;
    d.emergencyContact = { name: txt(e.name, 120), relationship: txt(e.relationship, 60), phone: txt(e.phone, 30), address: txt(e.address, 240) };
  }
  for (const k of ["jobTitle", "department", "workLocation"]) if (b[k] !== undefined) d[k] = txt(b[k], 120);
  if (b.employmentType !== undefined) {
    if (!EMPLOYMENT_TYPES.includes(b.employmentType)) throw httpError(400, "Choose a valid employment type");
    d.employmentType = b.employmentType;
  }
  for (const k of ["hireDate", "probationEndDate", "contractEndDate"]) {
    if (b[k] === undefined) continue;
    d[k] = b[k] === "" || b[k] === null ? undefined : date(b[k], k.replace(/([A-Z])/g, " $1"));
  }
  if (b.reportsTo !== undefined) d.reportsTo = validId(b.reportsTo) ? b.reportsTo : null;
  if (b.notes !== undefined) d.notes = txt(b.notes, 4000);

  if (b.compensation) {
    const c = b.compensation, out = {};
    if (c.currency !== undefined) out.currency = txt(c.currency, 4).toUpperCase() || "NGN";
    if (c.basic !== undefined) out.basic = num(c.basic, { label: "Basic salary" });
    if (c.annualRent !== undefined) out.annualRent = num(c.annualRent, { label: "Annual rent" });
    if (c.payFrequency !== undefined) out.payFrequency = txt(c.payFrequency, 20);
    if (Array.isArray(c.allowances)) {
      out.allowances = c.allowances.slice(0, 15).filter((a) => txt(a.name)).map((a) => ({ name: txt(a.name, 60), amount: num(a.amount, { label: "Allowance" }), pensionable: !!a.pensionable }));
    }
    for (const k of ["taxId", "pensionNumber", "nhfNumber"]) if (c[k] !== undefined) out[k] = txt(c[k], 40);
    if (c.bank) out.bank = { name: txt(c.bank.name, 80), accountName: txt(c.bank.accountName, 120), accountNumber: txt(c.bank.accountNumber, 20) };
    d.compensation = out;
  }
  if (requireAll) for (const k of Object.keys(LABEL)) if (!d[k]) throw httpError(400, `${LABEL[k]} is required`);
  return d;
};
const mergeComp = (emp, comp) => (comp ? { ...(emp.compensation?.toObject?.() || {}), ...comp, bank: { ...(emp.compensation?.bank?.toObject?.() || {}), ...(comp.bank || {}) } } : undefined);

const inDays = (n, from = new Date()) => new Date(+from + n * 864e5);
const ONBOARDING = (hire) => [
  { title: "Sign your employment contract", assignedTo: "employee", due: 3 },
  { title: "Upload a valid means of identification", assignedTo: "employee", due: 5 },
  { title: "Add your bank account details", assignedTo: "employee", due: 5 },
  { title: "Confirm your emergency contact", assignedTo: "employee", due: 5 },
  { title: "Read the staff handbook and company policies", assignedTo: "employee", due: 7 },
  { title: "Meet your manager and team", assignedTo: "employee", due: 7 },
  { title: "Prepare workstation and equipment", assignedTo: "employer", due: 2 },
  { title: "Set up company email and system access", assignedTo: "employer", due: 2 },
  { title: "Add the employee to payroll", assignedTo: "employer", due: 7 },
].map((t) => ({ title: t.title, assignedTo: t.assignedTo, kind: "onboarding", dueDate: inDays(t.due, hire) }));
const OFFBOARDING = () => [
  { title: "Return company equipment and ID card", assignedTo: "employee", due: 3 },
  { title: "Complete the exit interview", assignedTo: "employee", due: 5 },
  { title: "Process final pay and outstanding leave", assignedTo: "employer", due: 7 },
  { title: "Revoke system and building access", assignedTo: "employer", due: 1 },
  { title: "Issue reference or experience letter", assignedTo: "employer", due: 10 },
].map((t) => ({ title: t.title, assignedTo: t.assignedTo, kind: "offboarding", dueDate: inDays(t.due) }));

const welcome = (emp, employer) =>
  notifyEmployee(emp, {
    type: "employment", tab: "overview", title: "Welcome to the team",
    subject: `You've been added as staff at ${employer.companyName || "your employer"}`,
    body: `${employer.companyName || "Your employer"} added you as ${emp.jobTitle} (staff ID ${emp.staffId}). Your onboarding checklist is waiting in your staff dashboard.`,
  });

async function createEmployee(req, data, extra = {}) {
  const employer = await User.findById(req.user._id).select("email companyName");
  if (data.email === String(employer.email).toLowerCase()) throw httpError(400, "You can't add your own account as staff");
  const dup = await HrEmployee.findOne({ employer: req.user._id, email: data.email, status: { $in: ["Active", "OnLeave", "Suspended"] } });
  if (dup) throw httpError(409, `${dup.firstName} ${dup.lastName} (${dup.staffId}) is already on your staff list with this email`);

  const account = await User.findOne({ email: data.email }).select("_id");
  const emp = await HrEmployee.create({
    ...data, ...extra, employer: req.user._id, user: account?._id || null,
    staffId: await nextStaffId(req.user._id), tasks: ONBOARDING(data.hireDate),
  });
  await logActivity(req.user._id, emp._id, "employer", "Added to staff", `${emp.jobTitle}, ${emp.staffId} (${emp.source === "application" ? "hired from an application" : "added manually"})`);
  welcome(emp, employer);
  return emp;
}

/* ---------------- list, create, read, update ---------------- */
export const listEmployees = wrap("listEmployees", async (req, res) => {
  const { q = "", department, type } = req.query;
  const status = String(req.query.status || "current");
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(100, parseInt(req.query.limit) || 24);
  const filter = { employer: req.user._id };
  if (status === "current") filter.status = { $in: ["Active", "OnLeave", "Suspended"] };
  else if (status === "former") filter.status = { $in: ["Terminated", "Resigned"] };
  else if (EMPLOYEE_STATUS.includes(status)) filter.status = status;
  if (department) filter.department = String(department);
  if (EMPLOYMENT_TYPES.includes(type)) filter.employmentType = type;
  const s = txt(q, 60);
  if (s) {
    const re = new RegExp(s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    filter.$or = [{ firstName: re }, { lastName: re }, { email: re }, { staffId: re }, { jobTitle: re }];
  }
  const [employees, total, counts] = await Promise.all([
    HrEmployee.find(filter).sort({ firstName: 1, lastName: 1 }).skip((page - 1) * limit).limit(limit)
      .select("staffId firstName middleName lastName email phone photo jobTitle department employmentType status hireDate user source").lean({ virtuals: true }),
    HrEmployee.countDocuments(filter),
    HrEmployee.aggregate([{ $match: { employer: req.user._id } }, { $group: { _id: "$status", count: { $sum: 1 } } }]),
  ]);
  res.json({ success: true, employees: employees.map((e) => ({ ...e, hasAccount: !!e.user, user: undefined })), total, hasMore: page * limit < total,
    counts: Object.fromEntries(counts.map((c) => [c._id, c.count])) });
});

export const addEmployee = wrap("addEmployee", async (req, res) => {
  const data = cleanEmployee(req.body, { requireAll: true });
  const emp = await createEmployee(req, data, { source: "manual" });
  res.status(201).json({ success: true, employee: emp });
});

export const getEmployee = wrap("getEmployee", async (req, res) => {
  const emp = await ownEmployee(req);
  const [manager, reports] = await Promise.all([
    emp.reportsTo ? HrEmployee.findById(emp.reportsTo).select("firstName lastName staffId jobTitle photo") : null,
    HrEmployee.find({ employer: req.user._id, reportsTo: emp._id, status: { $in: ["Active", "OnLeave"] } }).select("firstName lastName staffId jobTitle photo"),
  ]);
  res.json({ success: true, employee: emp, manager, directReports: reports, hasAccount: !!emp.user });
});

export const updateEmployee = wrap("updateEmployee", async (req, res) => {
  const emp = await ownEmployee(req);
  const d = cleanEmployee(req.body);
  if (d.email && d.email !== emp.email) {
    const dup = await HrEmployee.findOne({ employer: req.user._id, email: d.email, _id: { $ne: emp._id }, status: { $in: ["Active", "OnLeave", "Suspended"] } });
    if (dup) throw httpError(409, "Another staff member already uses that email");
    emp.user = (await User.findOne({ email: d.email }).select("_id"))?._id || null; // re-link to the right account
  }
  if (d.reportsTo && String(d.reportsTo) === String(emp._id)) throw httpError(400, "A person can't report to themselves");

  const jobChanged = ["jobTitle", "department", "employmentType", "workLocation", "reportsTo"].some((k) => d[k] !== undefined && String(d[k] ?? "") !== String(emp[k] ?? ""));
  const payChanged = !!d.compensation && (d.compensation.basic !== undefined && d.compensation.basic !== emp.compensation?.basic || d.compensation.allowances);
  const comp = mergeComp(emp, d.compensation);
  delete d.compensation;
  Object.assign(emp, d);
  if (comp) emp.compensation = comp;
  await emp.save();

  if (jobChanged) {
    await logActivity(req.user._id, emp._id, "employer", "Job details updated", `${emp.jobTitle}${emp.department ? ", " + emp.department : ""}`);
    notifyEmployee(emp, { type: "employment", title: "Your job details were updated", body: `Your role is now ${emp.jobTitle}${emp.department ? " in " + emp.department : ""}.` });
  }
  if (payChanged) {
    await logActivity(req.user._id, emp._id, "employer", "Compensation updated");
    notifyEmployee(emp, { type: "employment", title: "Your compensation was updated", body: "Your salary details were updated. See your staff dashboard for the details.", tab: "profile" });
  }
  res.json({ success: true, employee: emp });
});

/* ---------------- hiring from applications ---------------- */
export const hireCandidates = wrap("hireCandidates", async (req, res) => {
  const apps = await Application.find({ companyId: req.user._id, status: { $in: ["Offer", "Accepted", "Hired"] } })
    .sort({ updatedAt: -1 }).limit(100)
    .populate("applicant", "firstName lastName email phoneNumber avatar").populate("job", "jobTitle").lean();
  const taken = new Set((await HrEmployee.find({ employer: req.user._id, application: { $in: apps.map((a) => a._id) } }).select("application").lean()).map((e) => String(e.application)));
  res.json({
    success: true,
    candidates: apps.filter((a) => !taken.has(String(a._id)) && a.applicant).map((a) => ({
      applicationId: a._id, status: a.status, position: a.position || a.job?.jobTitle,
      name: [a.applicant.firstName, a.applicant.lastName].filter(Boolean).join(" "), email: a.applicant.email, avatar: a.applicant.avatar,
    })),
  });
});

export const hireFromApplication = wrap("hireFromApplication", async (req, res) => {
  if (!validId(req.params.applicationId)) throw httpError(404, "Application not found");
  const app = await Application.findOne({ _id: req.params.applicationId, companyId: req.user._id });
  if (!app) throw httpError(404, "Application not found");
  if (!["Offer", "Accepted", "Hired"].includes(app.status)) throw httpError(400, "Only candidates with an offer can be added to staff");
  if (await HrEmployee.exists({ employer: req.user._id, application: app._id })) throw httpError(409, "This candidate is already on your staff list");

  const u = await User.findById(app.applicant);
  if (!u) throw httpError(404, "The candidate's account no longer exists");
  const known = (v) => (v && String(v).toLowerCase() !== "none" ? v : undefined);
  const dob = u.dateOfBirth && !isNaN(new Date(u.dateOfBirth)) ? new Date(u.dateOfBirth) : undefined;

  // Start from the candidate's profile, then let the employer's form override it
  const fromProfile = {
    firstName: u.firstName, middleName: u.middleName, lastName: u.lastName, email: u.email, phone: known(u.phoneNumber), gender: u.gender,
    dateOfBirth: dob, maritalStatus: u.maritalStatus, state: known(u.state), localGovernment: known(u.localGovernment), address: known(u.address),
    emergencyContact: { name: u.nextOfKin, relationship: u.nextOfKinRelationship, phone: u.nextOfKinNumber ? String(u.nextOfKinNumber) : "", address: u.nextOfKinAddress },
    compensation: { bank: { name: u.bankName, accountName: u.bankAcctName, accountNumber: u.bankAcctNum } },
  };
  const typed = cleanEmployee({ ...req.body, email: u.email });
  const merged = { ...JSON.parse(JSON.stringify(fromProfile)), ...typed, compensation: { ...(fromProfile.compensation), ...(typed.compensation || {}),
    bank: { ...fromProfile.compensation.bank, ...(typed.compensation?.bank || {}) } } };
  if (dob && !typed.dateOfBirth) merged.dateOfBirth = dob;
  merged.jobTitle = typed.jobTitle || app.position;
  merged.hireDate = typed.hireDate || new Date();
  const data = cleanEmployee({ ...merged, hireDate: merged.hireDate }, { requireAll: true });

  const emp = await createEmployee(req, data, { source: "application", application: app._id, user: u._id });
  if (app.status !== "Hired") { app.status = "Hired"; await app.save(); }
  emitToUser(u._id, "application:status", { applicationId: app._id, jobTitle: app.position, status: "Hired" });
  res.status(201).json({ success: true, employee: emp });
});

/* ---------------- status: terminate, resign, suspend, reinstate ---------------- */
export const changeStatus = wrap("changeStatus", async (req, res) => {
  const emp = await ownEmployee(req);
  const { status } = req.body;
  if (!EMPLOYEE_STATUS.includes(status)) throw httpError(400, "Choose a valid status");
  const reason = txt(req.body.reason, 1000);
  if (["Terminated", "Resigned", "Suspended"].includes(status) && reason.length < 3) throw httpError(400, "Give a reason for this change");
  if (status === emp.status) throw httpError(400, `This person is already ${status}`);

  const effective = req.body.effectiveDate ? date(req.body.effectiveDate, "Effective date") : new Date();
  emp.status = status;
  emp.statusReason = reason;
  const ending = ["Terminated", "Resigned"].includes(status);
  emp.exitDate = ending ? effective : undefined;
  if (ending && !emp.tasks.some((t) => t.kind === "offboarding")) emp.tasks.push(...OFFBOARDING());
  await emp.save();

  const words = { Active: "reinstated", OnLeave: "marked as on leave", Suspended: "suspended", Terminated: "terminated", Resigned: "recorded as resigned" };
  await logActivity(req.user._id, emp._id, "employer", `Status: ${status}`, reason);
  notifyEmployee(emp, {
    type: "employment", title: ending ? "Your employment has ended" : `Your employment status changed to ${status}`,
    body: `You were ${words[status]}${ending ? " effective " + dateStr(effective) : ""}.${reason ? " Reason: " + reason : ""}`,
  });
  res.json({ success: true, employee: emp });
});

/* ---------------- documents ---------------- */
export const addDocument = wrap("addDocument", async (req, res) => {
  const emp = await ownEmployee(req);
  const name = txt(req.body.name, 120);
  if (!name) throw httpError(400, "Give the document a name");
  if (!isCloudinaryUrl(req.body.url)) throw httpError(400, "Upload the file with the uploader so it is stored on Cloudinary");
  const type = DOC_TYPES.includes(req.body.type) ? req.body.type : "Other";
  emp.documents.push({ name, type, url: req.body.url, visibleToEmployee: req.body.visibleToEmployee !== false, uploadedBy: "employer",
    expiresAt: req.body.expiresAt ? date(req.body.expiresAt, "Expiry date") : undefined });
  await emp.save();
  const doc = emp.documents[emp.documents.length - 1];
  await logActivity(req.user._id, emp._id, "employer", "Document added", `${name} (${type})`);
  if (doc.visibleToEmployee) notifyEmployee(emp, { type: "document", tab: "documents", title: "A document was shared with you", body: `${name} (${type}) is now in your documents.` });
  res.status(201).json({ success: true, document: doc });
});

export const removeDocument = wrap("removeDocument", async (req, res) => {
  const emp = await ownEmployee(req);
  const doc = emp.documents.id(req.params.docId);
  if (!doc) throw httpError(404, "Document not found");
  const name = doc.name;
  doc.deleteOne();
  await emp.save();
  await logActivity(req.user._id, emp._id, "employer", "Document removed", name);
  res.json({ success: true });
});

/* ---------------- tasks (onboarding, offboarding, general) ---------------- */
export const addTask = wrap("addTask", async (req, res) => {
  const emp = await ownEmployee(req);
  const title = txt(req.body.title, 160);
  if (!title) throw httpError(400, "Give the task a title");
  emp.tasks.push({ title, description: txt(req.body.description, 500), kind: ["onboarding", "offboarding"].includes(req.body.kind) ? req.body.kind : "general",
    assignedTo: req.body.assignedTo === "employer" ? "employer" : "employee", dueDate: req.body.dueDate ? date(req.body.dueDate, "Due date") : undefined });
  await emp.save();
  const task = emp.tasks[emp.tasks.length - 1];
  if (task.assignedTo === "employee") notifyEmployee(emp, { type: "task", tab: "tasks", title: "You have a new task", body: `${title}${task.dueDate ? " (due " + dateStr(task.dueDate) + ")" : ""}` });
  res.status(201).json({ success: true, task });
});

export const updateTask = wrap("updateTask", async (req, res) => {
  const emp = await ownEmployee(req);
  const task = emp.tasks.id(req.params.taskId);
  if (!task) throw httpError(404, "Task not found");
  task.done = !!req.body.done;
  task.doneAt = task.done ? new Date() : undefined;
  task.doneBy = task.done ? "employer" : undefined;
  await emp.save();
  res.json({ success: true, task });
});

export const removeTask = wrap("removeTask", async (req, res) => {
  const emp = await ownEmployee(req);
  const task = emp.tasks.id(req.params.taskId);
  if (!task) throw httpError(404, "Task not found");
  task.deleteOne();
  await emp.save();
  res.json({ success: true });
});

export const activity = wrap("activity", async (req, res) => {
  const emp = await ownEmployee(req);
  const items = await HrActivity.find({ employer: req.user._id, employee: emp._id }).sort({ createdAt: -1 }).limit(100).lean();
  res.json({ success: true, items });
});