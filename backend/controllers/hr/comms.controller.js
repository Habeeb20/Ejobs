import { HrAnnouncement, HrMessage, HrEmployee, HrNotification } from "../../models/Hr.js";
import { notifyEmployee, notifyEmployer } from "../../utils/hrNotify.js";
import { wrap, httpError, txt, validId, ownEmployee } from "./shared.js";

const THROTTLE_MS = 10 * 60 * 1000; // at most one chat email per direction every 10 minutes

/* ---------------- announcements ---------------- */
export const listAnnouncements = wrap("listAnnouncements", async (req, res) => {
  const items = await HrAnnouncement.find({ employer: req.user._id }).sort({ pinned: -1, createdAt: -1 }).limit(100).select("-readBy").lean();
  const reads = await HrAnnouncement.aggregate([{ $match: { employer: req.user._id } }, { $project: { n: { $size: "$readBy" } } }]);
  const readBy = Object.fromEntries(reads.map((r) => [String(r._id), r.n]));
  res.json({ success: true, announcements: items.map((a) => ({ ...a, readCount: readBy[String(a._id)] || 0 })) });
});

export const createAnnouncement = wrap("createAnnouncement", async (req, res) => {
  const title = txt(req.body.title, 160), body = txt(req.body.body, 5000);
  if (!title || body.length < 3) throw httpError(400, "Add a title and a message");
  const audience = req.body.audience === "department" ? "department" : "all";
  const department = audience === "department" ? txt(req.body.department, 80) : undefined;
  if (audience === "department" && !department) throw httpError(400, "Choose a department");

  const filter = { employer: req.user._id, status: { $in: ["Active", "OnLeave"] }, ...(department ? { department } : {}) };
  const staff = await HrEmployee.find(filter);
  if (!staff.length) throw httpError(400, "There is nobody to send this to yet");
  const a = await HrAnnouncement.create({ employer: req.user._id, title, body, audience, department, pinned: !!req.body.pinned, recipients: staff.length });

  // Live toast for everyone at once; emails go out in small batches in the background
  (async () => {
    for (let i = 0; i < staff.length; i += 10) {
      await Promise.allSettled(staff.slice(i, i + 10).map((e) =>
        notifyEmployee(e, { type: "announcement", tab: "announcements", title: `Announcement: ${title}`, subject: `Announcement: ${title}`, body: body.slice(0, 400) + (body.length > 400 ? "..." : "") })));
    }
  })();
  res.status(201).json({ success: true, announcement: a, recipients: staff.length });
});

export const deleteAnnouncement = wrap("deleteAnnouncement", async (req, res) => {
  if (!validId(req.params.id)) throw httpError(404, "Announcement not found");
  await HrAnnouncement.deleteOne({ _id: req.params.id, employer: req.user._id });
  res.json({ success: true });
});

/* ---------------- messages (employer <-> one employee) ---------------- */
// Emails the other side, but not for every chat line: one email per direction per 10 minutes
export async function sendMessage({ emp, from, body }) {
  const text = txt(body, 3000);
  if (!text) throw httpError(400, "Write a message first");
  const msg = await HrMessage.create({ employer: emp.employer, employee: emp._id, from, body: text });
  const to = from === "employer" ? "employee" : "employer";
  const last = emp.lastEmail?.[to];
  const email = !last || Date.now() - new Date(last).getTime() > THROTTLE_MS;
  if (email) await HrEmployee.updateOne({ _id: emp._id }, { $set: { [`lastEmail.${to}`]: new Date() } });
  const opts = { type: "message", title: from === "employer" ? "New message from HR" : `New message from ${emp.firstName} ${emp.lastName}`, body: text.slice(0, 200), email };
  if (from === "employer") notifyEmployee(emp, { ...opts, tab: "messages" });
  else notifyEmployer(emp, { ...opts, tab: "hrComms" });
  return msg;
}

export const threads = wrap("threads", async (req, res) => {
  const rows = await HrMessage.aggregate([
    { $match: { employer: req.user._id } }, { $sort: { createdAt: -1 } },
    { $group: { _id: "$employee", last: { $first: "$$ROOT" },
      unread: { $sum: { $cond: [{ $and: [{ $eq: ["$from", "employee"] }, { $eq: [{ $ifNull: ["$readAt", null] }, null] }] }, 1, 0] } } } },
    { $sort: { "last.createdAt": -1 } }, { $limit: 100 },
  ]);
  const emps = await HrEmployee.find({ _id: { $in: rows.map((r) => r._id) } }).select("firstName lastName staffId photo jobTitle");
  const by = Object.fromEntries(emps.map((e) => [String(e._id), e]));
  res.json({ success: true, threads: rows.filter((r) => by[String(r._id)]).map((r) => ({
    employee: by[String(r._id)], last: { body: r.last.body, from: r.last.from, createdAt: r.last.createdAt }, unread: r.unread })) });
});

export const thread = wrap("thread", async (req, res) => {
  const emp = await ownEmployee(req, req.params.employeeId);
  const [messages] = await Promise.all([
    HrMessage.find({ employee: emp._id }).sort({ createdAt: 1 }).limit(300).lean(),
    HrMessage.updateMany({ employee: emp._id, from: "employee", readAt: { $exists: false } }, { $set: { readAt: new Date() } }),
  ]);
  res.json({ success: true, employee: { _id: emp._id, name: `${emp.firstName} ${emp.lastName}`, jobTitle: emp.jobTitle, photo: emp.photo, hasAccount: !!emp.user }, messages });
});

export const send = wrap("send", async (req, res) => {
  const emp = await ownEmployee(req, req.params.employeeId);
  res.status(201).json({ success: true, message: await sendMessage({ emp, from: "employer", body: req.body.body }) });
});

/* ---------------- notification list (both roles) ---------------- */
export const listNotifications = wrap("listNotifications", async (req, res) => {
  const [items, unread] = await Promise.all([
    HrNotification.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(60).lean(),
    HrNotification.countDocuments({ user: req.user._id, readAt: { $exists: false } }),
  ]);
  res.json({ success: true, notifications: items, unread });
});

export const readNotifications = wrap("readNotifications", async (req, res) => {
  const filter = { user: req.user._id, readAt: { $exists: false } };
  if (!req.body.all && Array.isArray(req.body.ids)) filter._id = { $in: req.body.ids.filter(validId) };
  await HrNotification.updateMany(filter, { $set: { readAt: new Date() } });
  res.json({ success: true });
});