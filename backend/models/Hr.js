import mongoose, { Schema } from "mongoose";

const oid = (ref, extra = {}) => ({ type: Schema.Types.ObjectId, ref, ...extra });
const make = (name, schema) => mongoose.models[name] || mongoose.model(name, schema);

export const EMPLOYMENT_TYPES = ["Full-time", "Part-time", "Contract", "Intern", "Casual"];
export const EMPLOYEE_STATUS = ["Active", "OnLeave", "Suspended", "Terminated", "Resigned"];
export const DOC_TYPES = ["Contract", "Offer letter", "ID", "Certificate", "Policy", "Payslip", "Other"];
export const CASE_TYPES = ["Verbal warning", "Written warning", "Final warning", "Query", "Suspension notice", "Commendation"];

/* ---------------- Settings (one per employer) ---------------- */
const DEFAULT_LEAVE = [
  { key: "annual", name: "Annual leave", days: 15, paid: true, gender: "any" },
  { key: "sick", name: "Sick leave", days: 10, paid: true, gender: "any" },
  { key: "maternity", name: "Maternity leave", days: 90, paid: true, gender: "female" },
  { key: "paternity", name: "Paternity leave", days: 14, paid: true, gender: "male" },
  { key: "compassionate", name: "Compassionate leave", days: 5, paid: true, gender: "any" },
  { key: "unpaid", name: "Unpaid leave", days: null, paid: false, gender: "any" },
];
// Nigeria Tax Act 2025, in force from 1 January 2026. Employers can change these in HR settings.
const DEFAULT_BANDS = [
  { upTo: 800000, rate: 0 }, { upTo: 3000000, rate: 15 }, { upTo: 12000000, rate: 18 },
  { upTo: 25000000, rate: 21 }, { upTo: 50000000, rate: 23 }, { upTo: null, rate: 25 },
];

const settingsSchema = new Schema({
  employer: oid("User", { required: true, unique: true }),
  staffIdPrefix: { type: String, default: "EMP", uppercase: true, trim: true, maxlength: 6 },
  nextStaffNumber: { type: Number, default: 1 },
  departments: { type: [String], default: ["Operations", "Sales", "Finance", "Human Resources", "Administration"] },
  workSchedule: {
    start: { type: String, default: "08:00" }, end: { type: String, default: "17:00" },
    graceMinutes: { type: Number, default: 15 }, workDays: { type: [Number], default: [1, 2, 3, 4, 5] }, // 0 = Sunday
  },
  leaveTypes: { type: [{ _id: false, key: String, name: String, days: Number, paid: Boolean, gender: String }], default: () => DEFAULT_LEAVE },
  holidays: {
    type: [{ _id: false, date: String, name: String }],
    default: () => ["01-01:New Year's Day", "05-01:Workers' Day", "06-12:Democracy Day", "10-01:Independence Day", "12-25:Christmas Day", "12-26:Boxing Day"]
      .map((s) => { const y = new Date().getFullYear(); const [md, name] = s.split(":"); return { date: `${y}-${md}`, name }; }),
  },
  payroll: {
    pensionEmployeePct: { type: Number, default: 8 }, pensionEmployerPct: { type: Number, default: 10 },
    nhfPct: { type: Number, default: 0 }, payeEnabled: { type: Boolean, default: true },
    rentReliefPct: { type: Number, default: 20 }, rentReliefCap: { type: Number, default: 500000 },
    bands: { type: [{ _id: false, upTo: Number, rate: Number }], default: () => DEFAULT_BANDS },
  },
}, { timestamps: true });
export const HrSettings = make("HrSettings", settingsSchema);

/* ---------------- Employee (staff record) ---------------- */
const allowance = { _id: false, name: String, amount: Number, pensionable: { type: Boolean, default: false } };
const employeeSchema = new Schema({
  employer: oid("User", { required: true, index: true }),
  user: oid("User", { default: null, index: true }), // the employee's platform account (linked by email)
  application: oid("applicationModel", { default: null }),
  source: { type: String, enum: ["application", "manual"], default: "manual" },
  staffId: { type: String, required: true },

  firstName: { type: String, required: true, trim: true }, middleName: { type: String, trim: true }, lastName: { type: String, required: true, trim: true },
  email: { type: String, required: true, lowercase: true, trim: true, index: true },
  phone: String, gender: String, dateOfBirth: Date, maritalStatus: String, nationality: { type: String, default: "Nigerian" },
  stateOfOrigin: String, address: String, state: String, localGovernment: String, photo: { type: String, default: "" },
  emergencyContact: { name: String, relationship: String, phone: String, address: String },

  jobTitle: { type: String, required: true, trim: true }, department: { type: String, default: "" },
  employmentType: { type: String, enum: EMPLOYMENT_TYPES, default: "Full-time" }, workLocation: String,
  reportsTo: oid("HrEmployee", { default: null }),
  hireDate: { type: Date, required: true }, probationEndDate: Date, contractEndDate: Date,
  status: { type: String, enum: EMPLOYEE_STATUS, default: "Active", index: true },
  statusReason: { type: String, default: "" }, exitDate: Date,

  compensation: {
    currency: { type: String, default: "NGN" }, basic: { type: Number, default: 0, min: 0 }, allowances: { type: [allowance], default: [] },
    payFrequency: { type: String, default: "Monthly" }, annualRent: { type: Number, default: 0, min: 0 },
    taxId: String, pensionNumber: String, nhfNumber: String,
    bank: { name: String, accountName: String, accountNumber: String },
  },

  documents: [{ name: String, type: { type: String, enum: DOC_TYPES, default: "Other" }, url: String, visibleToEmployee: { type: Boolean, default: true },
    uploadedBy: { type: String, enum: ["employer", "employee"], default: "employer" }, expiresAt: Date, createdAt: { type: Date, default: Date.now } }],
  tasks: [{ title: String, description: String, kind: { type: String, enum: ["onboarding", "offboarding", "general"], default: "general" },
    dueDate: Date, assignedTo: { type: String, enum: ["employee", "employer"], default: "employee" }, done: { type: Boolean, default: false },
    doneAt: Date, doneBy: String, createdAt: { type: Date, default: Date.now } }],
  notes: { type: String, default: "" }, // private to the employer
  lastEmail: { employer: Date, employee: Date }, // throttles chat emails
}, { timestamps: true });
employeeSchema.index({ employer: 1, staffId: 1 }, { unique: true });
employeeSchema.virtual("fullName").get(function () { return [this.firstName, this.middleName, this.lastName].filter(Boolean).join(" "); });
employeeSchema.set("toJSON", { virtuals: true });
export const HrEmployee = make("HrEmployee", employeeSchema);

/* ---------------- Leave ---------------- */
const leaveSchema = new Schema({
  employer: oid("User", { required: true, index: true }), employee: oid("HrEmployee", { required: true, index: true }),
  type: String, typeName: String, paid: { type: Boolean, default: true },
  startDate: { type: String, required: true }, endDate: { type: String, required: true }, days: { type: Number, required: true },
  reason: { type: String, default: "", maxlength: 1000 },
  status: { type: String, enum: ["Pending", "Approved", "Rejected", "Cancelled"], default: "Pending", index: true },
  requestedBy: { type: String, enum: ["employee", "employer"], default: "employee" },
  decidedAt: Date, decisionNote: { type: String, default: "" },
}, { timestamps: true });
leaveSchema.index({ employer: 1, status: 1, startDate: 1 });
export const HrLeave = make("HrLeave", leaveSchema);

/* ---------------- Attendance ---------------- */
const attendanceSchema = new Schema({
  employer: oid("User", { required: true, index: true }), employee: oid("HrEmployee", { required: true }),
  date: { type: String, required: true }, clockIn: Date, clockOut: Date, hours: { type: Number, default: 0 },
  status: { type: String, enum: ["Present", "Late", "Absent", "HalfDay", "Leave", "Holiday"], default: "Present" },
  method: { type: String, enum: ["self", "hr"], default: "self" }, note: { type: String, default: "" },
}, { timestamps: true });
attendanceSchema.index({ employee: 1, date: 1 }, { unique: true });
attendanceSchema.index({ employer: 1, date: 1 });
export const HrAttendance = make("HrAttendance", attendanceSchema);

/* ---------------- Payslips ---------------- */
const line = { _id: false, name: String, amount: Number };
const payslipSchema = new Schema({
  employer: oid("User", { required: true, index: true }), employee: oid("HrEmployee", { required: true }),
  month: { type: String, required: true }, // YYYY-MM
  status: { type: String, enum: ["Draft", "Published", "Paid"], default: "Draft" },
  currency: { type: String, default: "NGN" },
  basic: Number, allowances: [{ _id: false, name: String, amount: Number, pensionable: Boolean }], annualRent: { type: Number, default: 0 },
  adjustments: [{ _id: false, kind: { type: String, enum: ["bonus", "overtime", "reimbursement", "deduction"] }, name: String, amount: Number }],
  unpaidLeaveDays: { type: Number, default: 0 }, unpaidLeaveDeduction: { type: Number, default: 0 },
  gross: Number, pension: Number, nhf: Number, rentRelief: Number, taxable: Number, paye: Number, otherDeductions: Number,
  totalDeductions: Number, net: Number, employerPension: Number,
  snapshot: { fullName: String, staffId: String, jobTitle: String, department: String, bank: { name: String, accountName: String, accountNumber: String } },
  publishedAt: Date, paidAt: Date, paymentReference: String,
}, { timestamps: true });
payslipSchema.index({ employee: 1, month: 1 }, { unique: true });
payslipSchema.index({ employer: 1, month: 1 });
export const HrPayslip = make("HrPayslip", payslipSchema);

/* ---------------- Performance ---------------- */
const reviewSchema = new Schema({
  employer: oid("User", { required: true, index: true }), employee: oid("HrEmployee", { required: true, index: true }),
  period: { type: String, required: true }, ratings: [{ _id: false, criterion: String, score: { type: Number, min: 1, max: 5 }, comment: String }],
  overall: { type: Number, default: 0 }, strengths: String, improvements: String, comments: String, nextGoals: String,
  status: { type: String, enum: ["Draft", "Published", "Acknowledged"], default: "Draft" },
  employeeComment: { type: String, default: "" }, publishedAt: Date, acknowledgedAt: Date,
}, { timestamps: true });
export const HrReview = make("HrReview", reviewSchema);

const goalSchema = new Schema({
  employer: oid("User", { required: true, index: true }), employee: oid("HrEmployee", { required: true, index: true }),
  title: { type: String, required: true, trim: true, maxlength: 160 }, description: { type: String, default: "", maxlength: 1000 },
  dueDate: Date, progress: { type: Number, default: 0, min: 0, max: 100 },
  status: { type: String, enum: ["NotStarted", "InProgress", "Completed"], default: "NotStarted" },
  createdBy: { type: String, enum: ["employer", "employee"], default: "employer" },
}, { timestamps: true });
export const HrGoal = make("HrGoal", goalSchema);

/* ---------------- Cases (warnings, queries, commendations) ---------------- */
const caseSchema = new Schema({
  employer: oid("User", { required: true, index: true }), employee: oid("HrEmployee", { required: true, index: true }),
  type: { type: String, enum: CASE_TYPES, required: true }, subject: { type: String, required: true, maxlength: 160 }, details: { type: String, required: true, maxlength: 4000 },
  incidentDate: Date, requiresResponse: { type: Boolean, default: false },
  status: { type: String, enum: ["Open", "Responded", "Acknowledged", "Closed"], default: "Open" },
  response: { type: String, default: "" }, respondedAt: Date, closedAt: Date,
}, { timestamps: true });
export const HrCase = make("HrCase", caseSchema);

/* ---------------- Communication ---------------- */
export const HrAnnouncement = make("HrAnnouncement", new Schema({
  employer: oid("User", { required: true, index: true }), title: { type: String, required: true, maxlength: 160 }, body: { type: String, required: true, maxlength: 5000 },
  audience: { type: String, enum: ["all", "department"], default: "all" }, department: String, pinned: { type: Boolean, default: false },
  readBy: [oid("HrEmployee")], recipients: { type: Number, default: 0 },
}, { timestamps: true }));

const messageSchema = new Schema({
  employer: oid("User", { required: true }), employee: oid("HrEmployee", { required: true }),
  from: { type: String, enum: ["employer", "employee"], required: true }, body: { type: String, required: true, maxlength: 3000 }, readAt: Date,
}, { timestamps: true });
messageSchema.index({ employee: 1, createdAt: -1 });
export const HrMessage = make("HrMessage", messageSchema);

/* ---------------- Audit log + persistent notifications ---------------- */
export const HrActivity = make("HrActivity", new Schema({
  employer: oid("User", { required: true }), employee: oid("HrEmployee", { index: true }),
  actor: { type: String, enum: ["employer", "employee", "system"], default: "employer" }, action: String, detail: String,
}, { timestamps: { createdAt: true, updatedAt: false } }));

const notifSchema = new Schema({
  user: oid("User", { required: true }), employee: oid("HrEmployee"), type: String, title: String, body: String, tab: String, readAt: Date,
}, { timestamps: { createdAt: true, updatedAt: false } });
notifSchema.index({ user: 1, readAt: 1, createdAt: -1 });
export const HrNotification = make("HrNotification", notifSchema);