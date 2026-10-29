import { useEffect, useState } from "react";
import { ArrowLeft, Mail, Phone, ChevronDown, Lock, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { jobsApi, getError } from "../../api";
import { PlanBadge, Spinner } from "./jobUi";

const SETTABLE = ["Shortlisted", "Interviewed", "Scheduled", "Offer", "Rejected"];

function StatusControl({ app, onChanged }) {
  const [value, setValue] = useState(app.status);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const dirty = value !== app.status;

  const save = async () => {
    setBusy(true);
    try {
      await jobsApi.setStatus(app._id, value, reason.trim());
      toast.success(`Marked as ${value}`);
      onChanged(app._id, value);
      setReason("");
    } catch (err) { toast.error(getError(err)); setValue(app.status); }
    finally { setBusy(false); }
  };

  return (
    <div className="mt-3 flex flex-wrap items-center gap-2">
      <select value={value} onChange={(e) => setValue(e.target.value)} aria-label="Applicant status"
        className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm">
        {[...new Set([app.status, ...SETTABLE])].map((s) => <option key={s}>{s}</option>)}
      </select>
      {dirty && value === "Rejected" && (
        <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason (optional)"
          className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-1.5 text-sm" />
      )}
      {dirty && (
        <button disabled={busy} onClick={save} className="rounded-lg bg-orange-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-orange-700 disabled:opacity-60">Save</button>
      )}
    </div>
  );
}

const LABELS = { role: "Role fit", education: "Education", location: "Location", workType: "Work type", salary: "Salary", experience: "Experience" };
const colorFor = (s) => (s >= 80 ? "#10b981" : s >= 60 ? "#f97316" : s >= 40 ? "#f59e0b" : "#ef4444");

function MatchRing({ score }) {
  return (
    <div className="grid h-14 w-14 shrink-0 place-items-center rounded-full"
      style={{ background: `conic-gradient(${colorFor(score)} ${score * 3.6}deg, #e2e8f0 0deg)` }}
      aria-label={`${score}% match`}>
      <span className="grid h-11 w-11 place-items-center rounded-full bg-white text-sm font-bold">{score}%</span>
    </div>
  );
}

export default function JobApplicants({ job, onBack }) {
  const [data, setData] = useState(null);
  const [open, setOpen] = useState(null);

  useEffect(() => {
    jobsApi.applicants(job._id).then((r) => setData(r.data)).catch((e) => { toast.error(getError(e)); onBack(); });
  }, [job._id]); // eslint-disable-line react-hooks/exhaustive-deps

  const onChanged = (id, status) =>
    setData((d) => ({ ...d, applicants: d.applicants.map((a) => (a._id === id ? { ...a, status } : a)) }));

  return (
    <div className="space-y-4">
      <button onClick={onBack} className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900">
        <ArrowLeft size={16} /> Back to my jobs
      </button>

      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-xl font-bold">{job.jobTitle}</h2><PlanBadge type={job.jobType} />
      </div>

      {!data ? <Spinner label="Loading applicants…" /> : (
        <>
          <p className="text-sm text-slate-500">
            {data.total} applicant{data.total === 1 ? "" : "s"} ·{" "}
            {data.plan.matchScore ? "sorted by best match" : "oldest first"}
          </p>

          {!data.plan.matchScore && (
            <div className="flex items-start gap-2 rounded-xl bg-slate-100 p-3 text-sm text-slate-600">
              <Lock size={16} className="mt-0.5 shrink-0" /> Candidate match percentages are available on Standard and Premium jobs.
            </div>
          )}

          <ul className="space-y-3">
            {data.applicants.map((a) => {
              const p = a.applicant || {};
              const name = [p.firstName, p.lastName].filter(Boolean).join(" ") || "Candidate";
              const isOpen = open === a._id;
              return (
                <li key={a._id} className="rounded-2xl bg-white p-4 shadow-sm">
                  <div className="flex items-center gap-3">
                    {p.avatar
                      ? <img src={p.avatar} alt="" className="h-12 w-12 shrink-0 rounded-full object-cover" />
                      : <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-orange-100 font-bold text-orange-700">{name[0]}</span>}
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">{name}</p>
                      <p className="truncate text-sm text-slate-500">{[p.localGovernment, p.state].filter(Boolean).join(", ")} · {p.educationLevel}</p>
                      <p className="text-xs text-slate-400">Applied {new Date(a.createdAt).toLocaleDateString("en-NG", { day: "numeric", month: "short" })} · {a.status}</p>
                    </div>
                    {a.matchScore != null && <MatchRing score={a.matchScore} />}
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {p.email && <a href={`mailto:${p.email}`} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-sm hover:bg-slate-50"><Mail size={14} /> Email</a>}
                    {p.phoneNumber && <a href={`tel:${p.phoneNumber}`} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-sm hover:bg-slate-50"><Phone size={14} /> Call</a>}
                    {a.matchBreakdown && (
                      <button onClick={() => setOpen(isOpen ? null : a._id)} className="ml-auto inline-flex items-center gap-1 text-sm font-semibold text-orange-700">
                        Why this match <ChevronDown size={16} className={isOpen ? "rotate-180" : ""} />
                      </button>
                    )}
                  </div>

                  <StatusControl app={a} onChanged={onChanged} />

                  {isOpen && a.matchBreakdown && (
                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      {Object.entries(a.matchBreakdown).map(([k, v]) => (
                        <div key={k}>
                          <div className="flex justify-between text-xs text-slate-600"><span>{LABELS[k] || k}</span><span>{v.earned}/{v.max}</span></div>
                          <div className="mt-1 h-1.5 rounded-full bg-slate-100">
                            <div className="h-full rounded-full bg-orange-500" style={{ width: `${(v.earned / v.max) * 100}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>

          {data.locked > 0 && (
            <div className="flex items-start gap-3 rounded-2xl border border-orange-200 bg-orange-50 p-4 text-sm">
              <Sparkles size={18} className="mt-0.5 shrink-0 text-orange-600" />
              <p>
                <strong>{data.locked} more applicant{data.locked === 1 ? " is" : "s are"} hidden.</strong>{" "}
                {data.plan.key} jobs can open {data.plan.maxApplicants} applicants. Post your next job on a higher plan to see everyone.
              </p>
            </div>
          )}
          {!data.applicants.length && <p className="rounded-2xl bg-white p-8 text-center text-slate-500 shadow-sm">No applicants yet.</p>}
        </>
      )}
    </div>
  );
}