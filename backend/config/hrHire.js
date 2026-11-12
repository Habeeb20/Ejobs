import { HrEmployee, HrSettings, HrActivity, HrNotification } from "../models/Hr.js"; // adjust path
import User from "../models/User.js"; // adjust path
const splitName = (full = "") => {
  const parts = String(full).trim().split(/\s+/).filter(Boolean);
  const firstName = parts[0] || "Staff";
  const lastName = parts.length > 1 ? parts[parts.length - 1] : firstName;
  const middleName = parts.slice(1, -1).join(" ");
  return { firstName, middleName, lastName };
};

// Atomically reserve the next staff number, e.g. EMP-0007
async function nextStaffId(employerId) {
  const s = await HrSettings.findOneAndUpdate(
    { employer: employerId },
    { $inc: { nextStaffNumber: 1 }, $setOnInsert: { employer: employerId } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  return `${s.staffIdPrefix}-${String(s.nextStaffNumber - 1).padStart(4, "0")}`;
}



export async function createEmployeeFromApplication({ app, job, employerId }) {
  // 1. Already linked to this application? Return it (safe to call twice).
  let emp = await HrEmployee.findOne({ employer: employerId, application: app._id });
  if (emp) return emp;

  // 2. Load the candidate's account from the applicant id
  const c = await User.findById(app.applicant).select("-password").lean();
  if (!c) throw new Error(`No user found for applicant ${app.applicant}`);
  const email = String(c.email || "").toLowerCase().trim();
  if (!email) throw new Error(`User ${c._id} has no email field. Keys: ${Object.keys(c).join(", ")}`);

  const hireDate = app.dateHired || new Date();
  const jobTitle = job?.jobTitle || app.position || "Staff";

  // 3. Re-hire: same person already on file for this employer
  emp = await HrEmployee.findOne({ employer: employerId, email });
  if (emp) {
    Object.assign(emp, { status: "Active", exitDate: undefined, statusReason: "", hireDate, application: app._id, jobTitle });
    await emp.save();
    return emp;
  }

  // 4. New employee
  const name = splitName(c.fullName || c.name || [c.firstName, c.lastName].filter(Boolean).join(" "));
  try {
    emp = await HrEmployee.create({
      employer: employerId,
      user: c._id,
      application: app._id,
      source: "application",
      staffId: await nextStaffId(employerId),
      ...name,
      email,
      phone: c.phone || c.phoneNumber,
      photo: c.photo || c.avatar || c.profileImage || "",
      jobTitle,
      hireDate,
    });
  } catch (err) {
    if (err.code === 11000) {
      const existing = await HrEmployee.findOne({ employer: employerId, application: app._id });
      if (existing) return existing;
    }
    throw err;
  }

  await HrActivity.create({ employer: employerId, employee: emp._id, actor: "system", action: "hired", detail: `Added from application for ${jobTitle}` });
  await HrNotification.create({ user: emp.user, employee: emp._id, type: "hired", title: "Welcome aboard", body: `You are now on the ${jobTitle} team.`, tab: "staffHome" });
  return emp;
}




// Sacked after being hired -> close the staff record too
export async function terminateEmployeeFromApplication({ app, employerId, reason }) {
  return HrEmployee.findOneAndUpdate(
    { employer: employerId, application: app._id },
    { status: "Terminated", exitDate: new Date(), statusReason: reason || "Dismissed" },
    { new: true }
  );
}

