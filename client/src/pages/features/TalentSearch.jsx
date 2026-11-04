import { useCallback, useEffect, useState } from "react";
import { BadgeCheck, ChevronDown, History, MapPin, Search, UserPlus, User } from "lucide-react";
import { toast } from "sonner";
import { jobsApi, getError } from "../../api";
import { engageApi } from "./engageApi";
import { Spinner } from "./jobUi";
import ApplicantProfile, { nameOf } from "./ApplicantProfile";
import InviteModal from "./InviteModal";
import WorkHistoryModal from "./WorkHistoryModal";

const colorFor = (s) => (s >= 80 ? "#10b981" : s >= 60 ? "#f97316" : s >= 40 ? "#f59e0b" : "#ef4444");

const actionBtn = (active) =>
  `inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-semibold transition ${
    active ? "border-orange-300 bg-orange-100 text-orange-800" : "border-orange-200 bg-orange-50 text-orange-700 hover:bg-orange-100"
  }`;

/**
 * One jobseeker. `jobs` is the list the employer can shortlist them for ([{ _id, jobTitle }]).
 * `matchScore` is shown as a ring (used for Reach suggestions).
 */
export function TalentCard({ seeker, jobs, matchScore, onChanged }) {
  const [open, setOpen] = useState(false);
  const [entry, setEntry] = useState(null);
  const [invite, setInvite] = useState(false);
  const [history, setHistory] = useState(false);
  const name = nameOf(seeker);

  const toggleProfile = async () => {
    if (open) return setOpen(false);
    setOpen(true);
    if (entry?.data) return;
    setEntry({ loading: true });
    try {
      const { data } = await engageApi.talentProfile(seeker._id);
      setEntry({ data });
    } catch (err) {
      setEntry({ error: getError(err) });
    }
  };

  return (
    <li className="rounded-2xl bg-white p-4 shadow-sm">
      <div className="flex items-center gap-3">
        {seeker.avatar
          ? <img src={seeker.avatar} alt="" className="h-12 w-12 shrink-0 rounded-full object-cover" />
          : <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-orange-100 font-bold text-orange-700">{name[0]}</span>}
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-2 font-semibold">
            <span className="truncate">{name}</span>
            {seeker.availabilityForUrgentWork && (
              <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">Available now</span>
            )}
            {seeker.isCertified && (
              <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-2 py-0.5 text-xs font-semibold text-sky-700"><BadgeCheck size={12} /> Certified</span>
            )}
          </p>
          <p className="flex items-center gap-1 truncate text-sm text-slate-500">
            <MapPin size={13} /> {[seeker.localGovernment, seeker.state].filter(Boolean).join(", ") || "Location not set"}
            {seeker.educationLevel && ` · ${seeker.educationLevel}`}
          </p>
          {seeker.job && <p className="truncate text-xs text-slate-400">{seeker.job}</p>}
        </div>
        {matchScore != null && (
          <div className="grid h-14 w-14 shrink-0 place-items-center rounded-full" aria-label={`${matchScore}% match`}
            style={{ background: `conic-gradient(${colorFor(matchScore)} ${matchScore * 3.6}deg, #e2e8f0 0deg)` }}>
            <span className="grid h-11 w-11 place-items-center rounded-full bg-white text-sm font-bold">{matchScore}%</span>
          </div>
        )}
      </div>

      {seeker.jobChoice?.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {seeker.jobChoice.map((c) => <span key={c} className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs text-slate-600">{c}</span>)}
        </div>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" onClick={toggleProfile} aria-expanded={open} className={actionBtn(open)}>
          <User size={14} /> Profile <ChevronDown size={14} className={open ? "rotate-180" : ""} />
        </button>
        <button type="button" onClick={() => setHistory(true)} className={actionBtn(false)}>
          <History size={14} /> Work history
        </button>
        <button type="button" disabled={!jobs.length} onClick={() => setInvite(true)}
          title={jobs.length ? "" : "Post a live job first"}
          className="inline-flex items-center gap-1.5 rounded-lg bg-orange-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-50">
          <UserPlus size={14} /> Shortlist
        </button>
      </div>

      {open && <ApplicantProfile entry={entry} />}

      {invite && <InviteModal seeker={seeker} name={name} jobs={jobs} onClose={() => setInvite(false)} onDone={onChanged} />}
      {history && <WorkHistoryModal seekerId={seeker._id} name={name} onClose={() => setHistory(false)} />}
    </li>
  );
}

/** Employer page: search every jobseeker, filter to the ones who are available, shortlist them. */
export default function TalentSearch() {
  const [tab, setTab] = useState("available");
  const [q, setQ] = useState("");
  const [term, setTerm] = useState("");
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [jobs, setJobs] = useState([]);

  useEffect(() => {
    jobsApi.mine()
      .then((r) => setJobs(r.data.jobs.filter((j) => j.status === "Online").map((j) => ({ _id: j._id, jobTitle: j.jobTitle }))))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setTerm(q.trim()), 400);
    return () => clearTimeout(t);
  }, [q]);

  const fetchPage = useCallback(async (p, replace) => {
    setLoading(true);
    try {
      const { data } = await engageApi.talent({
        q: term || undefined, available: tab === "available" ? "true" : undefined, page: p,
      });
      setItems((prev) => (replace ? data.seekers : [...prev, ...data.seekers]));
      setPage(p);
      setHasMore(data.hasMore);
      setTotal(data.total);
    } catch (err) {
      toast.error(getError(err));
    } finally {
      setLoading(false);
    }
  }, [term, tab]);

  useEffect(() => { fetchPage(1, true); }, [fetchPage]);

  const tabBtn = (key, label) => (
    <button type="button" onClick={() => setTab(key)} aria-pressed={tab === key}
      className={`rounded-xl px-4 py-2 text-sm font-semibold ${tab === key ? "bg-orange-600 text-white" : "bg-white text-slate-600 shadow-sm hover:bg-slate-50"}`}>
      {label}
    </button>
  );

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold">Find talent</h2>
        <p className="text-sm text-slate-500">Search jobseekers, read their profile and work history, and shortlist them for one of your live jobs.</p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {tabBtn("available", "Available now")}
        {tabBtn("all", "All jobseekers")}
        <label className="relative ml-auto min-w-[14rem] flex-1 sm:max-w-sm">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name, job, state…" aria-label="Search jobseekers"
            className="w-full rounded-xl border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm" />
        </label>
      </div>

      {!jobs.length && (
        <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-700">You need a live job before you can shortlist someone.</p>
      )}

      <p className="text-sm text-slate-500">{loading && !items.length ? "Searching…" : `${total} jobseeker${total === 1 ? "" : "s"}`}</p>

      {loading && !items.length ? <Spinner label="Loading jobseekers…" /> : (
        <ul className="space-y-3">
          {items.map((s) => <TalentCard key={s._id} seeker={s} jobs={jobs} />)}
        </ul>
      )}

      {!loading && !items.length && (
        <p className="rounded-2xl bg-white p-8 text-center text-slate-500 shadow-sm">
          {tab === "available" ? "No jobseeker is marked available right now. Try All jobseekers." : "No jobseekers match your search."}
        </p>
      )}

      {hasMore && (
        <div className="text-center">
          <button type="button" disabled={loading} onClick={() => fetchPage(page + 1, false)}
            className="rounded-xl border border-slate-300 px-5 py-2 text-sm font-semibold hover:bg-slate-50 disabled:opacity-60">
            {loading ? "Loading…" : "Load more"}
          </button>
        </div>
      )}
    </div>
  );
}