import { useEffect, useState } from "react";
import { MapPin, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { jobsApi, getError } from "../../api";
import { Spinner, timeAgo } from "./jobUi";

const STYLE = {
  Applied: "bg-slate-100 text-slate-700", Shortlisted: "bg-sky-100 text-sky-700",
  Scheduled: "bg-violet-100 text-violet-700", Interviewed: "bg-indigo-100 text-indigo-700",
  Offer: "bg-emerald-100 text-emerald-700", Accepted: "bg-emerald-100 text-emerald-700",
  Rejected: "bg-red-100 text-red-700",
};
const STEPS = ["Applied", "Shortlisted", "Interviewed", "Offer"];

export default function MyApplications() {
  const [apps, setApps] = useState(null);

  useEffect(() => {
    jobsApi.myApplications().then((r) => setApps(r.data.applications)).catch((e) => { toast.error(getError(e)); setApps([]); });
  }, []);

  if (!apps) return <Spinner label="Loading your applications…" />;
  if (!apps.length)
    return (
      <div className="rounded-2xl bg-white p-10 text-center shadow-sm">
        <h2 className="text-xl font-bold">No applications yet</h2>
        <p className="mt-1 text-slate-500">When you apply for a job, you can follow its progress here.</p>
      </div>
    );

  return (
    <ul className="space-y-3">
      {apps.map((a) => {
        const step = STEPS.indexOf(a.status);
        return (
          <li key={a._id} className="rounded-2xl bg-white p-4 shadow-sm sm:p-5">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className="truncate font-bold">{a.job?.jobTitle || a.position}</h3>
                <p className="text-sm text-slate-500">{a.companyId?.companyName}</p>
                {a.job && <p className="mt-0.5 flex items-center gap-1 text-sm text-slate-500"><MapPin size={13} /> {a.job.city}, {a.job.state}</p>}
              </div>
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STYLE[a.status] || STYLE.Applied}`}>{a.status}</span>
            </div>

            {step >= 0 && (
              <div className="mt-4 flex items-center gap-1" aria-label={`Progress: ${a.status}`}>
                {STEPS.map((s, i) => (
                  <div key={s} className="flex-1">
                    <div className={`h-1.5 rounded-full ${i <= step ? "bg-orange-500" : "bg-slate-200"}`} />
                    <p className={`mt-1 hidden text-[11px] sm:block ${i <= step ? "font-semibold text-slate-700" : "text-slate-400"}`}>{s}</p>
                  </div>
                ))}
              </div>
            )}
            {a.status === "Rejected" && a.reasonForRejection && (
              <p className="mt-3 flex items-start gap-2 rounded-xl bg-red-50 p-3 text-sm text-red-700">
                <AlertCircle size={16} className="mt-0.5 shrink-0" /> {a.reasonForRejection}
              </p>
            )}
            <p className="mt-3 text-xs text-slate-400">Applied {timeAgo(a.createdAt)}</p>
          </li>
        );
      })}
    </ul>
  );
}