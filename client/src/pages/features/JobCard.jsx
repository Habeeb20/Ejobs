import { Heart, MapPin, Briefcase, Clock, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { jobsApi, getError } from "../../api";
import { timeAgo } from "./jobUi";

// Shared card for Browse and Saved jobs
export default function JobCard({ job, onOpen, onLiked }) {
  const toggle = async (e) => {
    e.stopPropagation();
    try {
      const { data } = await jobsApi.like(job._id);
      onLiked?.(job._id, data.liked);
      toast.success(data.liked ? "Saved to your jobs" : "Removed from saved jobs");
    } catch (err) { toast.error(getError(err)); }
  };

  return (
    <article
      onClick={() => onOpen(job._id)}
      onKeyDown={(e) => e.key === "Enter" && onOpen(job._id)}
      tabIndex={0}
      role="button"
      className="cursor-pointer rounded-2xl bg-white p-4 shadow-sm transition hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-orange-600 sm:p-5"
    >
      <div className="flex items-start gap-3">
        {job.employer?.avatar
          ? <img src={job.employer.avatar} alt="" className="h-12 w-12 shrink-0 rounded-xl object-cover" />
          : <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-orange-100 font-bold text-orange-700">{(job.employer?.companyName || "J")[0]}</span>}
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-base font-bold sm:text-lg">{job.jobTitle}</h3>
          <p className="truncate text-sm text-slate-500">{job.employer?.companyName}</p>
        </div>
        <button onClick={toggle} aria-label={job.liked ? "Remove from saved" : "Save job"} aria-pressed={job.liked}
          className="grid h-9 w-9 shrink-0 place-items-center rounded-full hover:bg-slate-100">
          <Heart size={18} className={job.liked ? "fill-orange-600 text-orange-600" : "text-slate-400"} />
        </button>
      </div>

      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-sm text-slate-600">
        <span className="flex items-center gap-1"><MapPin size={14} /> {job.city}, {job.state}</span>
        <span className="flex items-center gap-1"><Briefcase size={14} /> {job.workType}</span>
        <span className="flex items-center gap-1"><Clock size={14} /> {timeAgo(job.createdAt)}</span>
      </div>

      <div className="mt-3 flex items-center justify-between">
        <p className="font-semibold">{job.currency} {job.salary}</p>
        {job.applied && (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
            <CheckCircle2 size={12} /> Applied
          </span>
        )}
      </div>
    </article>
  );
}