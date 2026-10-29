import { useCallback, useEffect, useState } from "react";
import { Users, BarChart3, RefreshCw, Send, CreditCard, Lock, MapPin, Clock, Eye, AlertCircle, Pencil } from "lucide-react";
import { toast } from "sonner";
import { jobsApi, getError } from "../../api";
import { PlanBadge, StatusBadge, Spinner, useNow, timeLeft, naira } from "./jobUi";
import useJobCheckout from "./useJobCheckout";
import JobApplicants from "./JobApplicants";
import JobAnalytics from "./JobAnalytics";
import PostJob from "./PostJob";

export default function MyJobs() {
  const [jobs, setJobs] = useState(null);
  const [view, setView] = useState(null); // { type: "applicants" | "analytics", job }
  const now = useNow();

  const load = useCallback(async () => {
    try {
      const { data } = await jobsApi.mine();
      setJobs(data.jobs);
    } catch (err) {
      toast.error(getError(err));
      setJobs([]);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  const { checkout, busy } = useJobCheckout(load);

  if (view?.type === "edit")
    return <PostJob job={view.job} onCancel={() => setView(null)} onDone={() => { setView(null); load(); }} />;
  if (view?.type === "applicants") return <JobApplicants job={view.job} onBack={() => { setView(null); load(); }} />;
  if (view?.type === "analytics") return <JobAnalytics job={view.job} onBack={() => setView(null)} />;
  if (!jobs) return <Spinner label="Loading your jobs…" />;

  if (!jobs.length)
    return (
      <div className="rounded-2xl bg-white p-10 text-center shadow-sm">
        <h2 className="text-xl font-bold">No jobs yet</h2>
        <p className="mt-1 text-slate-500">Post your first job and it will show up here.</p>
      </div>
    );

  return (
    <ul className="space-y-4">
      {jobs.map((job) => {
        const { plan } = job;
        const live = ["Online", "Offline"].includes(job.status);
        const unsent = ["Draft", "Rejected"].includes(job.status);
        const limitText = plan.maxApplicants ? `${job.applicantCount}/${plan.maxApplicants} viewable` : `${job.applicantCount} (unlimited)`;

        return (
          <li key={job._id} className="rounded-2xl bg-white p-4 shadow-sm sm:p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="truncate text-lg font-bold">{job.jobTitle}</h3>
                <p className="mt-0.5 flex items-center gap-1 text-sm text-slate-500">
                  <MapPin size={14} /> {job.city}, {job.state} · {job.workType}
                </p>
              </div>
              <div className="flex gap-2"><PlanBadge type={job.jobType} /><StatusBadge status={job.status} /></div>
            </div>

            {job.status === "Rejected" && job.rejectionReason && (
              <p className="mt-3 flex items-start gap-2 rounded-xl bg-red-50 p-3 text-sm text-red-700">
                <AlertCircle size={16} className="mt-0.5 shrink-0" /> {job.rejectionReason}
              </p>
            )}
            {job.status === "Awaiting Approval" && (
              <p className="mt-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-700">
                Waiting for a super admin to approve it. You'll be notified when it goes live.
              </p>
            )}

            <dl className="mt-4 grid grid-cols-3 gap-3 text-sm">
              <div><dt className="flex items-center gap-1 text-slate-500"><Users size={14} /> Applicants</dt><dd className="font-semibold">{limitText}</dd></div>
              <div><dt className="flex items-center gap-1 text-slate-500"><Clock size={14} /> Time</dt>
                <dd className="font-semibold">{job.status === "Online" ? timeLeft(job.expiryDate, now) : job.status === "Offline" ? "Expired" : "Not live"}</dd></div>
              <div><dt className="flex items-center gap-1 text-slate-500"><Eye size={14} /> Plan</dt><dd className="font-semibold">{naira(plan.price)}</dd></div>
            </dl>

            <div className="mt-4 flex flex-wrap gap-2">
              {unsent && (
                <button onClick={() => setView({ type: "edit", job })}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold hover:bg-slate-50">
                  <Pencil size={16} /> Edit
                </button>
              )}

              {unsent && (
                <button disabled={busy} onClick={() => checkout(job)}
                  className="inline-flex items-center gap-2 rounded-xl bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-700 disabled:opacity-60">
                  {plan.price > 0 && job.paymentStatus !== "Paid" ? <CreditCard size={16} /> : <Send size={16} />}
                  {plan.price > 0 && job.paymentStatus !== "Paid" ? `Pay ${naira(plan.price)} & submit` : "Submit for approval"}
                </button>
              )}

              {live && (
                <button onClick={() => setView({ type: "applicants", job })}
                  className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700">
                  <Users size={16} /> Applicants
                </button>
              )}

              {live && (plan.analytics ? (
                <button onClick={() => setView({ type: "analytics", job })}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold hover:bg-slate-50">
                  <BarChart3 size={16} /> Analytics
                </button>
              ) : (
                <button onClick={() => toast.info("Analytics are available on Standard and Premium jobs")}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-400">
                  <Lock size={14} /> Analytics
                </button>
              ))}

              {live && (plan.renewable ? (
                <button disabled={busy} onClick={() => checkout(job, "renew")}
                  className="inline-flex items-center gap-2 rounded-xl border border-orange-600 px-4 py-2 text-sm font-semibold text-orange-700 hover:bg-orange-50 disabled:opacity-60">
                  <RefreshCw size={16} /> Renew {naira(plan.price)}
                </button>
              ) : (
                <button onClick={() => toast.info("Basic jobs can't be renewed. Post a new job on Standard or Premium to keep hiring.")}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-400">
                  <Lock size={14} /> Renew
                </button>
              ))}
            </div>
          </li>
        );
      })}
    </ul>
  );
}