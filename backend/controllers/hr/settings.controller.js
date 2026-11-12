import { HrSettings } from "../../models/Hr.js";
import { isDateStr } from "../../utils/hrCalc.js";
import { wrap, httpError, txt, num, getSettings } from "./shared.js";

export const readSettings = wrap("readSettings", async (req, res) => res.json({ success: true, settings: await getSettings(req.user._id) }));

const slug = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 30);
const hhmm = (s, label) => { if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(String(s))) throw httpError(400, `${label} must look like 08:00`); return s; };

export const updateSettings = wrap("updateSettings", async (req, res) => {
  const b = req.body, set = {};
  await getSettings(req.user._id);

  if (b.departments !== undefined) {
    if (!Array.isArray(b.departments)) throw httpError(400, "Departments must be a list");
    set.departments = [...new Set(b.departments.map((d) => txt(d, 60)).filter(Boolean))].slice(0, 40);
  }
  if (b.staffIdPrefix !== undefined) {
    const p = txt(b.staffIdPrefix, 6).toUpperCase();
    if (!/^[A-Z0-9]{2,6}$/.test(p)) throw httpError(400, "The staff ID prefix must be 2 to 6 letters or numbers");
    set.staffIdPrefix = p;
  }
  if (b.workSchedule) {
    const w = b.workSchedule;
    const days = [...new Set((w.workDays || []).map(Number).filter((d) => d >= 0 && d <= 6))];
    if (!days.length) throw httpError(400, "Choose at least one working day");
    set.workSchedule = { start: hhmm(w.start, "Start time"), end: hhmm(w.end, "End time"), graceMinutes: num(w.graceMinutes ?? 15, { max: 120, label: "Grace minutes" }), workDays: days };
    if (set.workSchedule.end <= set.workSchedule.start) throw httpError(400, "The end time must be after the start time");
  }
  if (b.leaveTypes) {
    if (!Array.isArray(b.leaveTypes) || !b.leaveTypes.length) throw httpError(400, "Keep at least one leave type");
    const seen = new Set();
    set.leaveTypes = b.leaveTypes.slice(0, 15).map((t) => {
      const name = txt(t.name, 60); if (!name) throw httpError(400, "Every leave type needs a name");
      const key = slug(t.key || name); if (seen.has(key)) throw httpError(400, `"${name}" is listed twice`); seen.add(key);
      return { key, name, days: t.days === null || t.days === "" || t.days === undefined ? null : num(t.days, { max: 365, label: "Leave days" }), paid: t.paid !== false, gender: ["male", "female"].includes(t.gender) ? t.gender : "any" };
    });
  }
  if (b.holidays) {
    if (!Array.isArray(b.holidays)) throw httpError(400, "Holidays must be a list");
    set.holidays = b.holidays.slice(0, 80).map((h) => { if (!isDateStr(h.date)) throw httpError(400, "Every holiday needs a valid date"); return { date: h.date, name: txt(h.name, 80) || "Holiday" }; })
      .sort((a, c) => a.date.localeCompare(c.date));
  }
  if (b.payroll) {
    const p = b.payroll, out = {};
    out.pensionEmployeePct = num(p.pensionEmployeePct ?? 8, { max: 30, label: "Employee pension %" });
    out.pensionEmployerPct = num(p.pensionEmployerPct ?? 10, { max: 30, label: "Employer pension %" });
    out.nhfPct = num(p.nhfPct ?? 0, { max: 10, label: "NHF %" });
    out.payeEnabled = p.payeEnabled !== false;
    out.rentReliefPct = num(p.rentReliefPct ?? 20, { max: 100, label: "Rent relief %" });
    out.rentReliefCap = num(p.rentReliefCap ?? 500000, { label: "Rent relief cap" });
    if (!Array.isArray(p.bands) || !p.bands.length) throw httpError(400, "Add at least one tax band");
    let prev = 0;
    out.bands = p.bands.map((x, i) => {
      const last = i === p.bands.length - 1;
      const upTo = last ? null : num(x.upTo, { label: "Band limit" });
      if (!last && upTo <= prev) throw httpError(400, "Tax band limits must increase");
      if (!last) prev = upTo;
      return { upTo, rate: num(x.rate, { max: 100, label: "Tax rate" }) };
    });
    set.payroll = out;
  }
  if (!Object.keys(set).length) throw httpError(400, "Nothing to update");
  const settings = await HrSettings.findOneAndUpdate({ employer: req.user._id }, { $set: set }, { new: true, runValidators: true });
  res.json({ success: true, settings });
});