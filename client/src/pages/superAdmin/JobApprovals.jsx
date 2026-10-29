import { useCallback, useEffect, useState } from "react";
import { Check, X, Building2, MapPin, BadgeCheck } from "lucide-react";
import { toast } from "sonner";
import { jobsApi, getError } from "../../api";
import { PlanBadge, Spinner, naira } from "../features/jobUI";

export default function JobApprovals() {
  const [jobs, setJobs] = useState(null);
  const [rejecting, setRejecting] = useState(null); // job id
  const [reason, setReason] = useState("");
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(() =>
    jobsApi.admin.pending().then((r) => setJobs(r.data.jobs)).catch((e) => { toast.error(getError(e)); setJobs([]); }), []);
  useEffect(() => { load(); }, [load]);

  const remove = (id) => setJobs((js) => js.filter((j) => j._id !== id));

  const approve = async (job) => {
    setBusyId(job._id);
    try {
      await jobsApi.admin.approve(job._id);
      toast.success(`"${job.jobTitle}" is now live`);
      remove(job._id);
    } catch (e) { toast.error(getError(e)); load(); }
    finally { setBusyId(null); }
  };

  const reject = async (job) => {
    if (reason.trim().length < 5) return toast.error("Give the employer a reason (at least 5 characters)");
    setBusyId(job._id);
    try {
      await jobsApi.admin.reject(job._id, reason.trim());
      toast.success("Job sent back to the employer");
      remove(job._id); setRejecting(null); setReason("");
    } catch (e) { toast.error(getError(e)); load(); }
    finally { setBusyId(null); }
  };

  if (!jobs) return <Spinner label="Loading the approval queue…" />;
  if (!jobs.length)
    return <div className="rounded-2xl bg-white p-10 text-center shadow-sm"><h2 className="text-xl font-bold">All caught up</h2><p className="mt-1 text-slate-500">No jobs are waiting for approval.</p></div>;

  return (
    <ul className="space-y-4">
      {jobs.map((job) => (
        <li key={job._id} className="rounded-2xl bg-white p-4 shadow-sm sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="text-lg font-bold">{job.jobTitle}</h3>
              <p className="mt-0.5 flex items-center gap-1 text-sm text-slate-500"><Building2 size={14} /> {job.employer?.companyName || job.employer?.email}
                {job.employer?.businessVerified && <BadgeCheck size={14} className="text-emerald-600" />}</p>
              <p className="flex items-center gap-1 text-sm text-slate-500"><MapPin size={14} /> {job.city}, {job.state} · {job.workType}</p>
            </div>
            <div className="text-right">
              <PlanBadge type={job.jobType} />
              <p className="mt-1 text-xs text-slate-500">{naira(job.plan.price)} · {job.paymentStatus}</p>
            </div>
          </div>

          <p className="mt-3 line-clamp-3 text-sm text-slate-600">{job.jobSummary}</p>
          <p className="mt-2 text-xs text-slate-400">{job.industry} · {job.minimumQualification} · {job.currency} {job.salary}</p>

          {rejecting === job._id ? (
            <div className="mt-4 space-y-2">
              <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} autoFocus
                placeholder="Tell the employer what to fix"
                className="w-full rounded-xl border border-slate-300 p-3 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-orange-600" />
              <div className="flex gap-2">
                <button disabled={busyId === job._id} onClick={() => reject(job)} className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60">Send back</button>
                <button onClick={() => { setRejecting(null); setReason(""); }} className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100">Cancel</button>
              </div>
            </div>
          ) : (
            <div className="mt-4 flex gap-2">
              <button disabled={busyId === job._id} onClick={() => approve(job)} className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"><Check size={16} /> Approve</button>
              <button onClick={() => setRejecting(job._id)} className="inline-flex items-center gap-2 rounded-xl border border-red-200 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50"><X size={16} /> Reject</button>
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}