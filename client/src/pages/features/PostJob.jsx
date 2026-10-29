import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, Check, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { jobsApi, getError } from "../../api";
import PlanPicker, { featureRows } from "../../utils/planPicker";
import TargetingFields from "../../utils/TargertingFields";
import useJobCheckout from "./useJobCheckout";
import { Spinner, naira } from "./jobUi";
import {
  NIGERIA_STATES, WORK_TYPES, EDUCATION_LEVELS, EXPERIENCE, JOB_LEVELS, INDUSTRIES,
  JOB_CATEGORIES, CURRENCIES, HIRING_TIMELINES,
} from "../../utils/jobOptions";

const cls = "w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-orange-600";
const STEPS = ["Plan", "Details", "Review"];

const EMPTY = {
  jobTitle: "", jobFunction: "", industry: "", state: "", localGovernment: "", city: "",
  minimumQualification: "", workType: "", experienceLength: "", jobLevel: "", openForStudents: "No",
  currency: "NGN", salary: "", vacancyDuration: "", numberOfOpenings: "1", jobSummary: "",
  descriptionText: "", questionsText: "", skills: [],
  requireCoverLetter: true, requiredDocumentUpload: false, virtualInterview: false,
};
const REQUIRED = {
  jobTitle: "Enter a job title", jobFunction: "Choose a category", industry: "Choose an industry",
  state: "Choose a state", localGovernment: "Enter the local government", city: "Enter the city or town",
  minimumQualification: "Choose a qualification", workType: "Choose a work type",
  experienceLength: "Choose the experience needed", salary: "Enter the salary",
  vacancyDuration: "Choose a hiring timeline", jobSummary: "Add a short summary",
};

const fromJob = (j) => ({
  ...EMPTY, ...Object.fromEntries(Object.keys(EMPTY).filter((k) => j[k] !== undefined && j[k] !== null).map((k) => [k, j[k]])),
  descriptionText: (j.jobDescription || []).join("\n"),
  questionsText: (j.additionalInterviewQuestion || []).join("\n"),
  skills: j.jobSkills || [],
});
const lines = (t) => t.split("\n").map((s) => s.trim()).filter(Boolean);
const toPayload = (f) => {
  const { descriptionText, questionsText, skills, ...rest } = f;
  return {
    ...Object.fromEntries(Object.entries(rest).map(([k, v]) => [k, typeof v === "string" ? v.trim() : v])),
    jobDescription: lines(descriptionText), additionalInterviewQuestion: lines(questionsText), jobSkills: skills,
  };
};

function Field({ label, error, children, className = "" }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>
      {children}
      {error && <span className="mt-1 block text-xs text-red-600">{error}</span>}
    </label>
  );
}
const Select = ({ options, placeholder = "Select…", ...p }) => (
  <select className={cls} {...p}><option value="">{placeholder}</option>{options.map((o) => <option key={o}>{o}</option>)}</select>
);
const Toggle = ({ label, checked, onChange }) => (
  <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm">
    {label}
    <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="h-4 w-4 accent-orange-600" />
  </label>
);

function ChipInput({ value, onChange }) {
  const [text, setText] = useState("");
  const add = () => {
    const v = text.trim();
    if (v && !value.includes(v) && value.length < 15) onChange([...value, v]);
    setText("");
  };
  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {value.map((s) => (
          <span key={s} className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-3 py-1 text-sm text-orange-800">
            {s}<button type="button" onClick={() => onChange(value.filter((x) => x !== s))} aria-label={`Remove ${s}`}><X size={12} /></button>
          </span>
        ))}
      </div>
      <input className={`${cls} mt-2`} value={text} placeholder="Type a skill and press Enter"
        onChange={(e) => setText(e.target.value)} onBlur={add}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); add(); } }} />
    </div>
  );
}

/**
 * New job:   <PostJob go={go} />
 * Edit job:  <PostJob job={job} onDone={...} onCancel={...} />  (drafts and rejected jobs)
 */
export default function PostJob({ job, go, onDone, onCancel }) {
  const planLocked = job?.paymentStatus === "Paid"; // paid plans can't be switched
  const [plans, setPlans] = useState(null);
  const [step, setStep] = useState(job ? 1 : 0);
  const [plan, setPlan] = useState(job?.jobType && job.jobType !== "Draft" ? job.jobType : "Standard");
  const [f, setF] = useState(job ? fromJob(job) : EMPTY);
  const [targeting, setTargeting] = useState(job?.targeting || { states: [], educationLevels: [], jobCategories: [] });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const { checkout } = useJobCheckout();

  useEffect(() => {
    jobsApi.plans().then((r) => setPlans(r.data.plans)).catch((e) => toast.error(getError(e)));
  }, []);

  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }));
  const finish = () => (onDone ? onDone() : go?.("myListings"));
  const current = plans?.find((p) => p.key === plan);

  const validate = () => {
    const err = {};
    for (const [k, msg] of Object.entries(REQUIRED)) if (!String(f[k]).trim()) err[k] = msg;
    if (!(Number(f.numberOfOpenings) >= 1)) err.numberOfOpenings = "At least 1 opening";
    setErrors(err);
    if (Object.keys(err).length) toast.error("Please fix the highlighted fields");
    return !Object.keys(err).length;
  };

  const next = () => { if (step === 1 && !validate()) return; setStep((s) => s + 1); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const back = () => setStep((s) => Math.max(job && planLocked ? 1 : 0, s - 1));

  // Save the job, then (optionally) pay and submit it
  const save = async (andSubmit) => {
    setBusy(true);
    try {
      const payload = { ...toPayload(f), jobType: plan, targeting: plan === "Premium" ? targeting : undefined };
      const { data } = job ? await jobsApi.update(job._id, payload) : await jobsApi.create(payload);
      if (!andSubmit) { toast.success("Saved as a draft"); return finish(); }
      await checkout(data.job); // handles free submit, Paystack payment and its own toasts
      finish();
    } catch (err) { toast.error(getError(err)); }
    finally { setBusy(false); }
  };

  if (!plans) return <Spinner label="Loading…" />;

  const needsPayment = current.price > 0 && !planLocked;
  const submitLabel = needsPayment ? `Pay ${naira(current.price)} & submit` : "Submit for approval";

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      {onCancel && (
        <button onClick={onCancel} className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900">
          <ArrowLeft size={16} /> Back to my jobs
        </button>
      )}

      <ol className="flex items-center gap-2" aria-label="Progress">
        {STEPS.map((s, i) => (
          <li key={s} className="flex flex-1 items-center gap-2">
            <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-sm font-bold ${i < step ? "bg-emerald-500 text-white" : i === step ? "bg-orange-600 text-white" : "bg-slate-200 text-slate-500"}`}>
              {i < step ? <Check size={16} /> : i + 1}
            </span>
            <span className={`hidden text-sm font-semibold sm:block ${i === step ? "text-slate-900" : "text-slate-400"}`}>{s}</span>
            {i < STEPS.length - 1 && <span className="h-px flex-1 bg-slate-200" />}
          </li>
        ))}
      </ol>

      {step === 0 && (
        <section className="space-y-4">
          <div><h2 className="text-xl font-bold">Choose a plan</h2><p className="text-sm text-slate-500">Pick how long and how widely your job is promoted.</p></div>
          <PlanPicker plans={plans} value={plan} onChange={setPlan} />
        </section>
      )}

      {step === 1 && (
        <section className="space-y-5">
          {planLocked && <p className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700">Your {plan} plan is already paid for, so it can't be changed.</p>}

          <div className="space-y-4 rounded-2xl bg-white p-4 shadow-sm sm:p-6">
            <h2 className="text-lg font-bold">Job details</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Job title" error={errors.jobTitle} className="sm:col-span-2"><input className={cls} value={f.jobTitle} onChange={set("jobTitle")} placeholder="e.g. Sales Executive" /></Field>
              <Field label="Category" error={errors.jobFunction}><Select options={JOB_CATEGORIES} value={f.jobFunction} onChange={set("jobFunction")} /></Field>
              <Field label="Industry" error={errors.industry}><Select options={INDUSTRIES} value={f.industry} onChange={set("industry")} /></Field>
              <Field label="Work type" error={errors.workType}><Select options={WORK_TYPES} value={f.workType} onChange={set("workType")} /></Field>
              <Field label="Job level"><Select options={JOB_LEVELS} value={f.jobLevel} onChange={set("jobLevel")} /></Field>
              <Field label="Minimum qualification" error={errors.minimumQualification}><Select options={EDUCATION_LEVELS} value={f.minimumQualification} onChange={set("minimumQualification")} /></Field>
              <Field label="Experience needed" error={errors.experienceLength}><Select options={EXPERIENCE} value={f.experienceLength} onChange={set("experienceLength")} /></Field>
            </div>
          </div>

          <div className="space-y-4 rounded-2xl bg-white p-4 shadow-sm sm:p-6">
            <h2 className="text-lg font-bold">Location and pay</h2>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="State" error={errors.state}><Select options={NIGERIA_STATES} value={f.state} onChange={set("state")} /></Field>
              <Field label="Local government" error={errors.localGovernment}><input className={cls} value={f.localGovernment} onChange={set("localGovernment")} /></Field>
              <Field label="City or town" error={errors.city}><input className={cls} value={f.city} onChange={set("city")} /></Field>
              <Field label="Currency"><Select options={CURRENCIES} placeholder="Currency" value={f.currency} onChange={set("currency")} /></Field>
              <Field label="Salary" error={errors.salary}><input className={cls} value={f.salary} onChange={set("salary")} placeholder="e.g. 80,000 - 120,000" /></Field>
              <Field label="Openings" error={errors.numberOfOpenings}><input type="number" min="1" className={cls} value={f.numberOfOpenings} onChange={set("numberOfOpenings")} /></Field>
              <Field label="Hiring timeline" error={errors.vacancyDuration}><Select options={HIRING_TIMELINES} value={f.vacancyDuration} onChange={set("vacancyDuration")} /></Field>
            </div>
          </div>

          <div className="space-y-4 rounded-2xl bg-white p-4 shadow-sm sm:p-6">
            <h2 className="text-lg font-bold">About the role</h2>
            <Field label="Short summary" error={errors.jobSummary}><textarea rows={3} className={cls} value={f.jobSummary} onChange={set("jobSummary")} placeholder="What will this person do?" /></Field>
            <Field label="Responsibilities and requirements (one per line)"><textarea rows={5} className={cls} value={f.descriptionText} onChange={set("descriptionText")} /></Field>
            <Field label="Skills"><ChipInput value={f.skills} onChange={(skills) => setF((x) => ({ ...x, skills }))} /></Field>
            <Field label="Extra questions for applicants (one per line, optional)"><textarea rows={3} className={cls} value={f.questionsText} onChange={set("questionsText")} /></Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Toggle label="Require a cover letter" checked={f.requireCoverLetter} onChange={(v) => setF((x) => ({ ...x, requireCoverLetter: v }))} />
              <Toggle label="Ask for a supporting document" checked={f.requiredDocumentUpload} onChange={(v) => setF((x) => ({ ...x, requiredDocumentUpload: v }))} />
              <Toggle label="Virtual interview" checked={f.virtualInterview} onChange={(v) => setF((x) => ({ ...x, virtualInterview: v }))} />
              <Toggle label="Open to students" checked={f.openForStudents === "Yes"} onChange={(v) => setF((x) => ({ ...x, openForStudents: v ? "Yes" : "No" }))} />
            </div>
          </div>

          <TargetingFields plan={plan} value={targeting} onChange={setTargeting}
            stateOptions={NIGERIA_STATES} educationOptions={EDUCATION_LEVELS} categoryOptions={JOB_CATEGORIES} />
        </section>
      )}

      {step === 2 && (
        <section className="space-y-4">
          <div className="rounded-2xl bg-white p-4 shadow-sm sm:p-6">
            <h2 className="text-lg font-bold">Review</h2>
            <p className="mt-1 text-xl font-extrabold">{f.jobTitle}</p>
            <p className="text-sm text-slate-500">{f.city}, {f.state} · {f.workType} · {f.currency} {f.salary}</p>
            <p className="mt-3 line-clamp-3 text-sm text-slate-700">{f.jobSummary}</p>
          </div>

          <div className="rounded-2xl border-2 border-orange-600 bg-white p-4 shadow-sm sm:p-6">
            <div className="flex items-center justify-between">
              <h3 className="font-bold">{current.name} plan</h3>
              <span className="text-2xl font-extrabold">{naira(current.price)}</span>
            </div>
            <ul className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
              {featureRows(current).filter((r) => r.on).map((r) => (
                <li key={r.label} className="flex items-center gap-2"><Check size={16} className="text-emerald-600" /> {r.label}</li>
              ))}
            </ul>
            <p className="mt-4 text-xs text-slate-500">Every job is reviewed by our team before it goes live. Your plan time starts when it is approved.</p>
          </div>
        </section>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        {step > (job && planLocked ? 1 : 0) ? (
          <button onClick={back} disabled={busy} className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100">
            <ArrowLeft size={16} /> Back
          </button>
        ) : <span />}

        {step < 2 ? (
          <button onClick={next} className="inline-flex items-center gap-2 rounded-xl bg-orange-600 px-5 py-2.5 font-semibold text-white hover:bg-orange-700">
            Continue <ArrowRight size={16} />
          </button>
        ) : (
          <div className="flex flex-wrap gap-2">
            <button onClick={() => save(false)} disabled={busy} className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold hover:bg-slate-50 disabled:opacity-60">Save as draft</button>
            <button onClick={() => save(true)} disabled={busy} className="inline-flex items-center gap-2 rounded-xl bg-orange-600 px-5 py-2.5 font-semibold text-white hover:bg-orange-700 disabled:opacity-60">
              {busy && <Loader2 size={16} className="animate-spin" />} {submitLabel}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}