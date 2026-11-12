import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Check, Search } from "lucide-react";
import { careerApi } from "../../api";

const EMPTY = {
  dissability: [], jobMode: [], artisanTrades: [],
  jobDecision: "", jobChangeFrom: "", jobChangeTo: "", jobDecisionSalary: "",
  privateStaff: false, privateStaffType: "", TIN: "",
};

const inputCls = "w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100";
const msg = (e) => e?.response?.data?.message || e?.message || "Something went wrong";

const Chip = ({ active, onClick, children }) => (
  <button type="button" onClick={onClick} aria-pressed={active}
    className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm font-medium transition ${active ? "border-orange-600 bg-orange-50 text-orange-700" : "border-slate-300 bg-white text-slate-600 hover:border-slate-400"}`}>
    {active && <Check size={14} />}{children}
  </button>
);

const Section = ({ title, hint, children }) => (
  <section className="space-y-3 rounded-2xl bg-white p-4 shadow-sm sm:p-5">
    <div><h3 className="font-bold">{title}</h3>{hint && <p className="text-xs text-slate-500">{hint}</p>}</div>
    {children}
  </section>
);

const Field = ({ label, error, children }) => (
  <label className="block text-sm">
    <span className="mb-1 block font-medium text-slate-700">{label}</span>
    {children}
    {error && <span className="mt-1 block text-xs text-red-600">{error}</span>}
  </label>
);

export default function CareerProfile() {
  const [opts, setOpts] = useState(null);
  const [f, setF] = useState(EMPTY);
  const [saved, setSaved] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [loadErr, setLoadErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [q, setQ] = useState("");

  useEffect(() => {
    let live = true;
    Promise.all([careerApi.options(), careerApi.get()])
      .then(([o, p]) => {
        if (!live) return;
        const profile = { ...EMPTY, ...p.data.profile };
        setOpts(o.data.options); setF(profile); setSaved(profile);
      })
      .catch((e) => live && setLoadErr(msg(e)));
    return () => { live = false; };
  }, []);

  const trades = useMemo(
    () => (opts?.artisanTrades || []).filter((t) => t.toLowerCase().includes(q.trim().toLowerCase())),
    [opts, q]
  );

  const set = (k, v) => { setF((p) => ({ ...p, [k]: v })); setErrors((e) => ({ ...e, [k]: undefined })); };
  const toggle = (k, v) => set(k, f[k].includes(v) ? f[k].filter((x) => x !== v) : [...f[k], v]);
  const toggleMode = (v) => setF((p) => {
    const jobMode = p.jobMode.includes(v) ? p.jobMode.filter((x) => x !== v) : [...p.jobMode, v];
    return { ...p, jobMode, artisanTrades: jobMode.includes("artisan") ? p.artisanTrades : [] };
  });

  const check = () => {
    const e = {};
    if (f.jobMode.includes("artisan") && !f.artisanTrades.length) e.artisanTrades = "Pick at least one trade";
    if (f.jobDecision === "jobchanger") {
      if (f.jobChangeFrom.trim().length < 2) e.jobChangeFrom = "Enter the job you are changing from";
      if (f.jobChangeTo.trim().length < 2) e.jobChangeTo = "Enter the job you want to move to";
    }
    if (f.privateStaff) {
      if (!f.privateStaffType) e.privateStaffType = "Choose the kind of private staff you are";
      if (!/^[A-Z0-9-]{8,15}$/.test(f.TIN)) e.TIN = "Enter a valid TIN (8 to 15 letters, numbers or dashes)";
    }
    return e;
  };

  const save = async (ev) => {
    ev.preventDefault();
    const e = check();
    setErrors(e);
    if (Object.keys(e).length) return toast.error("Please fix the highlighted fields");
    setBusy(true);
    try {
      const r = await careerApi.save(f);
      const profile = { ...EMPTY, ...r.data.profile };
      setF(profile); setSaved(profile);
      toast.success("Career profile saved");
    } catch (err) {
      setErrors(err?.response?.data?.errors || {});
      toast.error(msg(err));
    } finally { setBusy(false); }
  };

  if (loadErr) return <p className="rounded-2xl bg-red-50 p-4 text-sm text-red-700">{loadErr}</p>;
  if (!opts) return <p className="p-6 text-center text-sm text-slate-400">Loading your career profile…</p>;

  const dirty = JSON.stringify(f) !== JSON.stringify(saved);
  const artisan = f.jobMode.includes("artisan");
  const changer = f.jobDecision === "jobchanger";

  return (
    <form onSubmit={save} className="space-y-4">
      <Section title="About you" hint="Optional. Select any that apply, or leave this blank.">
        <div className="flex flex-wrap gap-2">
          {opts.disability.map((o) => <Chip key={o.value} active={f.dissability.includes(o.value)} onClick={() => toggle("dissability", o.value)}>{o.label}</Chip>)}
        </div>
      </Section>

      <Section title="How do you work?" hint="You can pick both. For example, an accountant who also does plumbing.">
        <div className="flex flex-wrap gap-2">
          {opts.jobModes.map((o) => <Chip key={o.value} active={f.jobMode.includes(o.value)} onClick={() => toggleMode(o.value)}>{o.label}</Chip>)}
        </div>
        {artisan && (
          <div className="space-y-3 border-t border-slate-100 pt-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold">Your trades <span className="font-normal text-slate-400">({f.artisanTrades.length} selected)</span></p>
              <div className="relative w-48 max-w-full">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input className={`${inputCls} py-2 pl-8`} placeholder="Search trades" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search trades" />
              </div>
            </div>
            <div className="flex max-h-56 flex-wrap gap-2 overflow-y-auto pr-1">
              {trades.map((t) => <Chip key={t} active={f.artisanTrades.includes(t)} onClick={() => toggle("artisanTrades", t)}>{t}</Chip>)}
              {!trades.length && <p className="text-sm text-slate-400">No trade matches “{q}”.</p>}
            </div>
            {errors.artisanTrades && <p className="text-xs text-red-600">{errors.artisanTrades}</p>}
          </div>
        )}
      </Section>

      <Section title="What are you looking for?">
        <div className="flex flex-wrap gap-2">
          {opts.jobDecisions.map((o) => <Chip key={o.value} active={f.jobDecision === o.value} onClick={() => set("jobDecision", o.value)}>{o.label}</Chip>)}
        </div>
        {changer && (
          <div className="grid gap-3 border-t border-slate-100 pt-3 sm:grid-cols-2">
            <Field label="Job you are changing from" error={errors.jobChangeFrom}>
              <input className={inputCls} maxLength={80} placeholder="e.g. Accountant" value={f.jobChangeFrom} onChange={(e) => set("jobChangeFrom", e.target.value)} />
            </Field>
            <Field label="Job you want to move to" error={errors.jobChangeTo}>
              <input className={inputCls} maxLength={80} placeholder="e.g. Project manager" value={f.jobChangeTo} onChange={(e) => set("jobChangeTo", e.target.value)} />
            </Field>
            <Field label="Salary you expect for the new job (₦ per month)" error={errors.jobDecisionSalary}>
              <input className={inputCls} inputMode="numeric" placeholder="e.g. 350,000"
                value={f.jobDecisionSalary ? Number(f.jobDecisionSalary).toLocaleString() : ""}
                onChange={(e) => set("jobDecisionSalary", e.target.value.replace(/\D/g, "").slice(0, 12))} />
            </Field>
          </div>
        )}
      </Section>

      <Section title="Private staff" hint="For people who work in a private home or for a private person.">
        <Chip active={f.privateStaff} onClick={() => set("privateStaff", !f.privateStaff)}>I work as private staff</Chip>
        {f.privateStaff && (
          <div className="grid gap-3 border-t border-slate-100 pt-3 sm:grid-cols-2">
            <Field label="What kind of private staff?" error={errors.privateStaffType}>
              <select className={inputCls} value={f.privateStaffType} onChange={(e) => set("privateStaffType", e.target.value)}>
                <option value="">Select…</option>
                {opts.privateStaffTypes.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </Field>
            <Field label="Tax Identification Number (TIN)" error={errors.TIN}>
              <input className={inputCls} maxLength={15} autoComplete="off" value={f.TIN}
                onChange={(e) => set("TIN", e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, ""))} />
            </Field>
          </div>
        )}
      </Section>

      <div className="flex justify-end gap-2">
        <button type="button" disabled={!dirty || busy} onClick={() => { setF(saved); setErrors({}); }}
          className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 disabled:opacity-40">Reset</button>
        <button type="submit" disabled={!dirty || busy}
          className="rounded-xl bg-orange-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-orange-700 disabled:opacity-50">
          {busy ? "Saving…" : "Save career profile"}
        </button>
      </div>
    </form>
  );
}