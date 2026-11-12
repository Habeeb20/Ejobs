import { HrReview, HrGoal, HrCase, CASE_TYPES } from "../../models/Hr.js";
import { notifyEmployee, logActivity } from "../../utils/hrNotify.js";
import { wrap, httpError, txt, date, validId, ownEmployee } from "./shared.js";

const populateEmp = "firstName lastName staffId jobTitle department photo";

/* ---------------- performance reviews ---------------- */
const cleanRatings = (list) => {
  if (!Array.isArray(list) || !list.length) throw httpError(400, "Rate at least one criterion");
  return list.slice(0, 15).map((r) => {
    const score = Number(r.score);
    if (!txt(r.criterion) || !(score >= 1 && score <= 5)) throw httpError(400, "Each criterion needs a name and a score from 1 to 5");
    return { criterion: txt(r.criterion, 80), score, comment: txt(r.comment, 500) };
  });
};
const overallOf = (ratings) => Math.round((ratings.reduce((s, r) => s + r.score, 0) / ratings.length) * 10) / 10;
const reviewFields = (b) => ({ period: txt(b.period, 60), strengths: txt(b.strengths, 2000), improvements: txt(b.improvements, 2000), comments: txt(b.comments, 2000), nextGoals: txt(b.nextGoals, 2000) });

export const listReviews = wrap("listReviews", async (req, res) => {
  const filter = { employer: req.user._id };
  if (validId(req.query.employee)) filter.employee = req.query.employee;
  if (["Draft", "Published", "Acknowledged"].includes(req.query.status)) filter.status = req.query.status;
  const reviews = await HrReview.find(filter).sort({ createdAt: -1 }).limit(200).populate("employee", populateEmp).lean();
  res.json({ success: true, reviews });
});

export const createReview = wrap("createReview", async (req, res) => {
  const emp = await ownEmployee(req, req.body.employee);
  const f = reviewFields(req.body);
  if (!f.period) throw httpError(400, "Name the review period, for example H1 2026");
  const ratings = cleanRatings(req.body.ratings);
  const review = await HrReview.create({ employer: req.user._id, employee: emp._id, ...f, ratings, overall: overallOf(ratings) });
  res.status(201).json({ success: true, review });
});

export const updateReview = wrap("updateReview", async (req, res) => {
  if (!validId(req.params.id)) throw httpError(404, "Review not found");
  const r = await HrReview.findOne({ _id: req.params.id, employer: req.user._id });
  if (!r) throw httpError(404, "Review not found");
  if (r.status !== "Draft") throw httpError(400, "A published review can't be edited");
  const f = reviewFields({ ...r.toObject(), ...req.body });
  const ratings = req.body.ratings ? cleanRatings(req.body.ratings) : r.ratings;
  Object.assign(r, f, { ratings, overall: overallOf(ratings) });
  await r.save();
  res.json({ success: true, review: r });
});

export const publishReview = wrap("publishReview", async (req, res) => {
  if (!validId(req.params.id)) throw httpError(404, "Review not found");
  const r = await HrReview.findOneAndUpdate({ _id: req.params.id, employer: req.user._id, status: "Draft" }, { $set: { status: "Published", publishedAt: new Date() } }, { new: true });
  if (!r) throw httpError(409, "This review is already published or doesn't exist");
  const emp = await ownEmployee(req, r.employee);
  await logActivity(req.user._id, emp._id, "employer", "Review published", `${r.period}, overall ${r.overall}/5`);
  notifyEmployee(emp, { type: "review", tab: "performance", title: "Your performance review is ready", body: `Your ${r.period} review is published (overall ${r.overall} out of 5). Read it and add your comments.` });
  res.json({ success: true, review: r });
});

export const deleteReview = wrap("deleteReview", async (req, res) => {
  if (!validId(req.params.id)) throw httpError(404, "Review not found");
  const r = await HrReview.deleteOne({ _id: req.params.id, employer: req.user._id, status: "Draft" });
  if (!r.deletedCount) throw httpError(400, "Only a draft review can be deleted");
  res.json({ success: true });
});

/* ---------------- goals ---------------- */
export const statusFromProgress = (p, current) => (p >= 100 ? "Completed" : p > 0 ? "InProgress" : current === "Completed" ? "InProgress" : "NotStarted");

export const listGoals = wrap("listGoals", async (req, res) => {
  const filter = { employer: req.user._id };
  if (validId(req.query.employee)) filter.employee = req.query.employee;
  const goals = await HrGoal.find(filter).sort({ dueDate: 1, createdAt: -1 }).limit(300).populate("employee", populateEmp).lean();
  res.json({ success: true, goals });
});

export const createGoal = wrap("createGoal", async (req, res) => {
  const emp = await ownEmployee(req, req.body.employee);
  const title = txt(req.body.title, 160);
  if (!title) throw httpError(400, "Give the goal a title");
  const goal = await HrGoal.create({ employer: req.user._id, employee: emp._id, title, description: txt(req.body.description, 1000),
    dueDate: req.body.dueDate ? date(req.body.dueDate, "Due date") : undefined, createdBy: "employer" });
  notifyEmployee(emp, { type: "goal", tab: "performance", title: "You have a new goal", body: `${title}${goal.dueDate ? " (due " + goal.dueDate.toISOString().slice(0, 10) + ")" : ""}` });
  res.status(201).json({ success: true, goal });
});

export const updateGoal = wrap("updateGoal", async (req, res) => {
  if (!validId(req.params.id)) throw httpError(404, "Goal not found");
  const g = await HrGoal.findOne({ _id: req.params.id, employer: req.user._id });
  if (!g) throw httpError(404, "Goal not found");
  if (req.body.title !== undefined) g.title = txt(req.body.title, 160) || g.title;
  if (req.body.description !== undefined) g.description = txt(req.body.description, 1000);
  if (req.body.dueDate !== undefined) g.dueDate = req.body.dueDate ? date(req.body.dueDate, "Due date") : undefined;
  if (req.body.progress !== undefined) { g.progress = Math.min(100, Math.max(0, Number(req.body.progress) || 0)); g.status = statusFromProgress(g.progress, g.status); }
  await g.save();
  res.json({ success: true, goal: g });
});

export const deleteGoal = wrap("deleteGoal", async (req, res) => {
  if (!validId(req.params.id)) throw httpError(404, "Goal not found");
  await HrGoal.deleteOne({ _id: req.params.id, employer: req.user._id });
  res.json({ success: true });
});

/* ---------------- cases: warnings, queries, commendations ---------------- */
export const listCases = wrap("listCases", async (req, res) => {
  const filter = { employer: req.user._id };
  if (validId(req.query.employee)) filter.employee = req.query.employee;
  if (["Open", "Responded", "Acknowledged", "Closed"].includes(req.query.status)) filter.status = req.query.status;
  const cases = await HrCase.find(filter).sort({ createdAt: -1 }).limit(300).populate("employee", populateEmp).lean();
  res.json({ success: true, cases });
});

export const createCase = wrap("createCase", async (req, res) => {
  const emp = await ownEmployee(req, req.body.employee);
  if (!CASE_TYPES.includes(req.body.type)) throw httpError(400, "Choose a valid type");
  const subject = txt(req.body.subject, 160), details = txt(req.body.details, 4000);
  if (!subject || details.length < 5) throw httpError(400, "Add a subject and the details");
  const commendation = req.body.type === "Commendation";
  const c = await HrCase.create({ employer: req.user._id, employee: emp._id, type: req.body.type, subject, details,
    incidentDate: req.body.incidentDate ? date(req.body.incidentDate, "Incident date") : undefined, requiresResponse: !commendation && !!req.body.requiresResponse });
  await logActivity(req.user._id, emp._id, "employer", `${c.type} issued`, subject);
  notifyEmployee(emp, { type: "case", tab: "notices", title: commendation ? "You received a commendation" : `You received a ${c.type.toLowerCase()}`,
    body: `${subject}. ${c.requiresResponse ? "HR is asking for your response." : "Open your staff dashboard to read the details."}` });
  res.status(201).json({ success: true, case: c });
});

export const closeCase = wrap("closeCase", async (req, res) => {
  if (!validId(req.params.id)) throw httpError(404, "Case not found");
  const c = await HrCase.findOneAndUpdate({ _id: req.params.id, employer: req.user._id, status: { $ne: "Closed" } }, { $set: { status: "Closed", closedAt: new Date() } }, { new: true });
  if (!c) throw httpError(409, "This case is already closed or doesn't exist");
  const emp = await ownEmployee(req, c.employee);
  notifyEmployee(emp, { type: "case", tab: "notices", email: false, title: "A notice was closed", body: `${c.subject} is now closed.` });
  res.json({ success: true, case: c });
});