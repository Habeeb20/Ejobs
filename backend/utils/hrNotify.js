import { HrNotification, HrActivity } from "../models/Hr.js";
import User from "../models/User.js";
import { emitToUser, emailUser, esc } from "./notify.js";

const CLIENT = process.env.CLIENT_URL || "http://localhost:5173";
const SIGNUP_NOTE = `<p style="color:#78716C;font-size:13px">Create a free EJob account with this email address to follow everything in your staff dashboard: <a href="${CLIENT}/register">${CLIENT}/register</a></p>`;

// Audit trail shown on the employee's profile. Never throws.
export const logActivity = (employer, employee, actor, action, detail = "") =>
  HrActivity.create({ employer, employee, actor, action, detail }).catch((e) => console.error("hr activity:", e.message));

// Real-time (Socket.IO) + saved in the in-app notification list so nothing is missed while offline
const push = async (userId, employeeId, e) => {
  emitToUser(userId, "hr:event", { ...e, employeeId });
  await HrNotification.create({ user: userId, employee: employeeId, type: e.type, title: e.title, body: e.body, tab: e.tab })
    .catch((err) => console.error("hr notification:", err.message));
};

/**
 * Tell an employee instantly (live toast + notification list) and by email.
 * type: employment | leave | attendance | payroll | review | goal | announcement | message | case | document | task | profile
 * tab:  the section of the employee dashboard it belongs to
 */
export async function notifyEmployee(emp, { type, title, body, tab = "overview", subject, email = true, html = "" }) {
  try {
    if (emp.user) await push(emp.user, emp._id, { type, title, body, tab, to: "employee" });
    if (email && emp.email) {
      const url = `${CLIENT}/dashboard?tab=myEmployment&eid=${emp._id}&section=${tab}`;
      emailUser(emp.email, subject || title, title, `<p>${esc(body)}</p>${html}${emp.user ? "" : SIGNUP_NOTE}`, { url, label: "Open my staff dashboard" });
    }
  } catch (err) { console.error("notifyEmployee:", err.message); }
}

// Tell the employer (live toast + notification list + email). tab = the employer dashboard page id.
export async function notifyEmployer(emp, { type, title, body, tab = "hrEmployees", subject, email = true }) {
  try {
    const employer = await User.findById(emp.employer).select("email");
    await push(emp.employer, emp._id, { type, title, body, tab, to: "employer" });
    if (email && employer?.email) {
      const url = `${CLIENT}/dashboard?tab=${tab}&id=${emp._id}`;
      emailUser(employer.email, subject || title, title, `<p>${esc(body)}</p>`, { url, label: "Open HR dashboard" });
    }
  } catch (err) { console.error("notifyEmployer:", err.message); }
}