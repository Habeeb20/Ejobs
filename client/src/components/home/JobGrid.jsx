import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight, BadgeCheck, Briefcase, Clock, Eye, Heart, MapPin, SearchX, Share2, Star, Wallet,
} from "lucide-react";
import { toast } from "sonner";
import { jobsApi, getError } from "../../api";

const FILTERS = [
  { label: "Recent jobs", value: "" },
  { label: "Part time", value: "Part-Time" },
  { label: "Full time", value: "Full-Time" },
  { label: "Contract", value: "Contract" },
  { label: "Freelance", value: "Freelance" },
  { label: "Remote", value: "Remote" },
];

const SHOW = 6;

const timeAgo = (date) => {
  const days = Math.floor((Date.now() - new Date(date)) / 864e5);
  if (days <= 0) return "Today";
  if (days < 30) return `${days} day${days === 1 ? "" : "s"} ago`;
  const months = Math.floor(days / 30);
  return `${months} month${months === 1 ? "" : "s"} ago`;
};

const money = (currency, salary) => {
  const n = Number(String(salary).replace(/,/g, ""));
  const amount = Number.isFinite(n) && salary !== "" ? n.toLocaleString("en-NG") : salary;
  return [currency, amount].filter(Boolean).join(" ") || "Not stated";
};

const Stat = ({ icon: Icon, value, label, color }) => (
  <div className="flex items-center gap-1.5 text-xs text-slate-500" title={label}>
    <Icon className={`h-3.5 w-3.5 ${color}`} aria-hidden="true" />
    <span className="font-semibold text-slate-700">{value}</span>
    <span className="sr-only">{label}</span>
  </div>
);

function JobCardSkeleton() {
  return (
    <div className="animate-pulse rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
      <div className="flex gap-3">
        <div className="h-12 w-12 rounded-xl bg-slate-100" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-3/4 rounded bg-slate-100" />
          <div className="h-3 w-1/2 rounded bg-slate-100" />
        </div>
      </div>
      <div className="mt-5 space-y-2">
        <div className="h-3 w-2/3 rounded bg-slate-100" />
        <div className="h-3 w-1/2 rounded bg-slate-100" />
      </div>
      <div className="mt-6 h-10 rounded-xl bg-slate-100" />
    </div>
  );
}

function JobCard({ job }) {
  const e = job.employer || {};
  const company = e.companyName || "Company";
  const likes = job.likeCount ?? job.likes?.length ?? 0;
  const views = job.totalViews ?? job.uniqueViewers?.length ?? 0;
  const shares = job.shareCount ?? 0;
  const link = `/jobs/${job._id}`;

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-100 transition duration-200 hover:-translate-y-1 hover:shadow-xl hover:ring-orange-200">
      <div className="h-1 bg-gradient-to-r from-orange-500 to-amber-400" aria-hidden="true" />

      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-start gap-3">
          {e.avatar ? (
            <img src={e.avatar} alt="" className="h-12 w-12 shrink-0 rounded-xl object-cover ring-1 ring-slate-100" />
          ) : (
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-orange-100 text-lg font-bold text-orange-700">
              {company[0]?.toUpperCase()}
            </span>
          )}
          <div className="min-w-0 flex-1">
            <Link to={link}>
              <h3 className="line-clamp-2 text-base font-bold leading-snug text-slate-900 transition group-hover:text-orange-700">
                {job.jobTitle}
              </h3>
            </Link>
            <p className="mt-0.5 flex items-center gap-1.5 truncate text-sm text-slate-500">
              <span className="truncate">{company}</span>
              {job.isValidated && <BadgeCheck className="h-4 w-4 shrink-0 text-emerald-600" aria-label="Verified job" />}
            </p>
          </div>
          {job.featuredJob && (
            <span title="Featured job" className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-amber-500 text-white shadow">
              <Star className="h-4 w-4 fill-white" />
            </span>
          )}
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {job.workType && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-orange-50 px-3 py-1 text-xs font-semibold text-orange-700 ring-1 ring-orange-100">
              <Briefcase className="h-3.5 w-3.5" /> {job.workType}
            </span>
          )}
          {job.industry && (
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">{job.industry}</span>
          )}
        </div>

        <ul className="mt-4 space-y-2 text-sm text-slate-600">
          <li className="flex items-center gap-2">
            <MapPin className="h-4 w-4 shrink-0 text-slate-400" />
            <span className="truncate">{[job.localGovernment, job.state].filter(Boolean).join(", ")}</span>
          </li>
          <li className="flex items-center gap-2">
            <Wallet className="h-4 w-4 shrink-0 text-slate-400" />
            <span className="font-bold text-slate-900">{money(job.currency, job.salary)}</span>
          </li>
          <li className="flex items-center gap-2">
            <Clock className="h-4 w-4 shrink-0 text-slate-400" />
            <span>
              {job.experienceLength ? `${job.experienceLength} experience · ` : ""}
              {timeAgo(job.createdAt)}
            </span>
          </li>
        </ul>

        <div className="mt-auto flex items-center justify-between border-t border-slate-100 pt-4 mt-5">
          <div className="flex items-center gap-4">
            <Stat icon={Heart} value={likes} label="Likes" color="text-rose-500" />
            <Stat icon={Eye} value={views} label="Views" color="text-emerald-600" />
            <Stat icon={Share2} value={shares} label="Shares" color="text-blue-600" />
          </div>
        </div>
      </div>

      <Link
        to={`${link}#apply`}
        className="flex items-center justify-center gap-2 bg-orange-600 px-6 py-3 text-sm font-bold text-white transition hover:bg-orange-700"
      >
        Apply now <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
      </Link>
    </article>
  );
}

const JobGrid = () => {
  const [jobs, setJobs] = useState([]);
  const [total, setTotal] = useState(0);
  const [filter, setFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const reqId = useRef(0);

  useEffect(() => {
    const id = ++reqId.current;
    setLoading(true);
    (async () => {
      try {
        const params = { page: 1, ...(filter ? { workType: filter } : {}) };
        const { data } = await jobsApi.all(params);
        if (id !== reqId.current) return; // a newer filter click replaced this request
        setJobs((data.jobs || []).slice(0, SHOW));
        setTotal(data.total || 0);
      } catch (err) {
        if (id === reqId.current) {
          setJobs([]);
          toast.error(getError(err));
        }
      } finally {
        if (id === reqId.current) setLoading(false);
      }
    })();
  }, [filter]);

  return (
    <section className="bg-gradient-to-b from-white to-slate-50 px-4 py-12 sm:px-6 sm:py-16 lg:px-10">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-widest text-orange-600">Latest openings</span>
            <h2 className="mt-1 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
              Jobs you can apply for today
            </h2>
            <p className="mt-2 max-w-xl text-slate-500">
              Fresh roles from verified employers across Nigeria.
              {!loading && total > 0 && <> Showing {jobs.length} of {total}.</>}
            </p>
          </div>
          <Link
            to="/jobs"
            className="hidden shrink-0 items-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-orange-300 hover:text-orange-700 sm:inline-flex"
          >
            View all jobs <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div role="group" aria-label="Filter jobs by type" className="-mx-1 mt-6 flex gap-2 overflow-x-auto px-1 pb-1">
          {FILTERS.map((f) => (
            <button
              key={f.label}
              type="button"
              aria-pressed={filter === f.value}
              onClick={() => setFilter(f.value)}
              className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition ${
                filter === f.value
                  ? "bg-orange-600 text-white shadow-md shadow-orange-600/25"
                  : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-orange-50 hover:text-orange-700 hover:ring-orange-200"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="mt-8">
          {loading ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3" role="status" aria-label="Loading jobs">
              {Array.from({ length: 3 }).map((_, i) => <JobCardSkeleton key={i} />)}
            </div>
          ) : jobs.length === 0 ? (
            <div className="rounded-2xl bg-white p-12 text-center shadow-sm ring-1 ring-slate-100">
              <SearchX className="mx-auto h-10 w-10 text-slate-300" />
              <h3 className="mt-3 text-lg font-bold text-slate-900">No jobs found</h3>
              <p className="mt-1 text-slate-500">There are no open jobs for this filter right now.</p>
              {filter && (
                <button
                  type="button"
                  onClick={() => setFilter("")}
                  className="mt-4 rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-700"
                >
                  Show recent jobs
                </button>
              )}
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {jobs.map((job) => <JobCard key={job._id} job={job} />)}
            </div>
          )}
        </div>

        <div className="mt-8 text-center sm:hidden">
          <Link
            to="/jobs"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:border-orange-300"
          >
            View all jobs <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
};

export default JobGrid;