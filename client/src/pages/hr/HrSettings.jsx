import { useEffect, useState } from "react";
import { Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { hrApi } from "../../api";
import { Btn, Card, Spinner, Field, inputCls, useAsync, toastErr, today } from "./HrUi";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function HrSettings() {
  const { data, loading } = useAsync(() => hrApi.settings(), []);
  const [s, setS] = useState(null);
  const [saving, setSaving] = useState("");
  const [dept, setDept] = useState("");
  useEffect(() => { if (data) setS(JSON.parse(JSON.stringify(data.settings))); }, [data]);
  if (loading || !s) return <Spinner label="Loading settings…" />;

  const save = async (key, payload, msg) => {
    setSaving(key);
    try { const r = await hrApi.saveSettings(payload); setS(JSON.parse(JSON.stringify(r.data.settings))); toast.success(msg); } catch (e) { toastErr(e); } finally { setSaving(""); }
  };
  const w = s.workSchedule, p = s.payroll;
  const patch = (k, v) => setS((x) => ({ ...x, [k]: v }));

  return (
    <div className="space-y-4">
      <Card title="General" action={<Btn loading={saving === "gen"} onClick={() => save("gen", { staffIdPrefix: s.staffIdPrefix, departments: s.departments }, "Saved")}>Save</Btn>}>
        <div className="grid gap-4 sm:grid-cols-[200px_1fr]">
          <Field label="Staff ID prefix" hint="Next ID: EMP-0001 style"><input className={inputCls} maxLength={6} value={s.staffIdPrefix} onChange={(e) => patch("staffIdPrefix", e.target.value.toUpperCase())} /></Field>
          <div><p className="mb-1 text-sm font-medium text-slate-700">Departments</p>
            <div className="mb-2 flex flex-wrap gap-2">{s.departments.map((d) => <span key={d} className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-3 py-1 text-sm text-orange-800">{d}<button aria-label={`Remove ${d}`} onClick={() => patch("departments", s.departments.filter((x) => x !== d))}><X size={12} /></button></span>)}</div>
            <div className="flex gap-2"><input className={inputCls} placeholder="Add a department" value={dept} onChange={(e) => setDept(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); if (dept.trim()) { patch("departments", [...new Set([...s.departments, dept.trim()])]); setDept(""); } } }} />
              <Btn variant="soft" onClick={() => { if (dept.trim()) { patch("departments", [...new Set([...s.departments, dept.trim()])]); setDept(""); } }}><Plus size={15} /></Btn></div></div>
        </div>
      </Card>

      <Card title="Work schedule" action={<Btn loading={saving === "sch"} onClick={() => save("sch", { workSchedule: w }, "Work schedule saved")}>Save</Btn>}>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Start time"><input type="time" className={inputCls} value={w.start} onChange={(e) => patch("workSchedule", { ...w, start: e.target.value })} /></Field>
          <Field label="End time"><input type="time" className={inputCls} value={w.end} onChange={(e) => patch("workSchedule", { ...w, end: e.target.value })} /></Field>
          <Field label="Grace period (minutes)" hint="Clocking in after this counts as late"><input type="number" min="0" max="120" className={inputCls} value={w.graceMinutes} onChange={(e) => patch("workSchedule", { ...w, graceMinutes: e.target.value })} /></Field>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">{DAYS.map((d, i) => { const on = w.workDays.includes(i); return <button key={d} type="button" aria-pressed={on} onClick={() => patch("workSchedule", { ...w, workDays: on ? w.workDays.filter((x) => x !== i) : [...w.workDays, i] })} className={`rounded-full border px-4 py-1.5 text-sm font-semibold ${on ? "border-orange-600 bg-orange-600 text-white" : "border-slate-200 bg-white text-slate-600"}`}>{d}</button>; })}</div>
      </Card>

      <Card title="Leave types" action={<Btn loading={saving === "lv"} onClick={() => save("lv", { leaveTypes: s.leaveTypes }, "Leave types saved")}>Save</Btn>}>
        <p className="mb-3 text-xs text-slate-400">Days per year. Leave empty for unlimited (for example unpaid leave).</p>
        <div className="space-y-2">{s.leaveTypes.map((t, i) => (
          <div key={i} className="flex flex-wrap items-center gap-2">
            <input className={`${inputCls} min-w-0 flex-1`} placeholder="Name" value={t.name} onChange={(e) => patch("leaveTypes", s.leaveTypes.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} />
            <input type="number" min="0" className={`${inputCls} w-28`} placeholder="Days" value={t.days ?? ""} onChange={(e) => patch("leaveTypes", s.leaveTypes.map((x, j) => (j === i ? { ...x, days: e.target.value === "" ? null : e.target.value } : x)))} />
            <select className={`${inputCls} w-32`} value={t.gender} onChange={(e) => patch("leaveTypes", s.leaveTypes.map((x, j) => (j === i ? { ...x, gender: e.target.value } : x)))}><option value="any">Everyone</option><option value="female">Women only</option><option value="male">Men only</option></select>
            <label className="flex items-center gap-1.5 text-sm"><input type="checkbox" className="accent-orange-600" checked={t.paid} onChange={(e) => patch("leaveTypes", s.leaveTypes.map((x, j) => (j === i ? { ...x, paid: e.target.checked } : x)))} /> Paid</label>
            <button aria-label="Remove" onClick={() => patch("leaveTypes", s.leaveTypes.filter((_, j) => j !== i))} className="rounded-lg p-2 text-red-600 hover:bg-red-50"><Trash2 size={16} /></button>
          </div>))}</div>
        <Btn variant="soft" className="mt-3" onClick={() => patch("leaveTypes", [...s.leaveTypes, { key: "", name: "", days: 5, paid: true, gender: "any" }])}><Plus size={15} /> Add leave type</Btn>
      </Card>

      <Card title="Public holidays" action={<Btn loading={saving === "hol"} onClick={() => save("hol", { holidays: s.holidays }, "Holidays saved")}>Save</Btn>}>
        <p className="mb-3 text-xs text-slate-400">Holidays don't count as working days for leave, attendance or unpaid-day deductions. Add Eid, Good Friday and other moving dates each year.</p>
        <div className="space-y-2">{s.holidays.map((h, i) => (
          <div key={i} className="flex flex-wrap items-center gap-2"><input type="date" className={`${inputCls} w-44`} value={h.date} onChange={(e) => patch("holidays", s.holidays.map((x, j) => (j === i ? { ...x, date: e.target.value } : x)))} />
            <input className={`${inputCls} min-w-0 flex-1`} placeholder="Name" value={h.name} onChange={(e) => patch("holidays", s.holidays.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} />
            <button aria-label="Remove" onClick={() => patch("holidays", s.holidays.filter((_, j) => j !== i))} className="rounded-lg p-2 text-red-600 hover:bg-red-50"><Trash2 size={16} /></button></div>))}</div>
        <Btn variant="soft" className="mt-3" onClick={() => patch("holidays", [...s.holidays, { date: today(), name: "" }])}><Plus size={15} /> Add holiday</Btn>
      </Card>

      <Card title="Payroll and tax" action={<Btn loading={saving === "pay"} onClick={() => save("pay", { payroll: p }, "Payroll settings saved")}>Save</Btn>}>
        <p className="mb-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">The defaults follow the Nigeria Tax Act 2025 (in force from 1 January 2026): the first ₦800,000 a year is tax-free, then 15%, 18%, 21%, 23% and 25%. Rules can change, so confirm these with your accountant.</p>
        <div className="grid gap-4 sm:grid-cols-3">
          {[["pensionEmployeePct", "Employee pension %"], ["pensionEmployerPct", "Employer pension %"], ["nhfPct", "NHF % of basic"], ["rentReliefPct", "Rent relief %"], ["rentReliefCap", "Rent relief cap (₦)"]].map(([k, l]) => (
            <Field key={k} label={l}><input type="number" min="0" step="any" className={inputCls} value={p[k]} onChange={(e) => patch("payroll", { ...p, [k]: e.target.value })} /></Field>))}
          <label className="flex items-center gap-2 self-end pb-2 text-sm font-medium"><input type="checkbox" className="accent-orange-600" checked={p.payeEnabled} onChange={(e) => patch("payroll", { ...p, payeEnabled: e.target.checked })} /> Calculate PAYE automatically</label>
        </div>
        <p className="mb-2 mt-5 text-sm font-medium text-slate-700">Tax bands (annual, cumulative limits)</p>
        <div className="space-y-2">{p.bands.map((b, i) => {
          const last = i === p.bands.length - 1;
          return (<div key={i} className="flex flex-wrap items-center gap-2"><span className="w-24 text-sm text-slate-500">{last ? "Above" : "Up to (₦)"}</span>
            {last ? <span className="w-44 text-sm text-slate-400">no limit</span> : <input type="number" min="0" className={`${inputCls} w-44`} value={b.upTo ?? ""} onChange={(e) => patch("payroll", { ...p, bands: p.bands.map((x, j) => (j === i ? { ...x, upTo: e.target.value } : x)) })} />}
            <input type="number" min="0" max="100" className={`${inputCls} w-24`} value={b.rate} onChange={(e) => patch("payroll", { ...p, bands: p.bands.map((x, j) => (j === i ? { ...x, rate: e.target.value } : x)) })} /><span className="text-sm text-slate-500">%</span></div>);
        })}</div>
      </Card>
    </div>
  );
}