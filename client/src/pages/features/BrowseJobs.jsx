import { useCallback, useEffect, useState } from "react";
import { Search, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { jobsApi, getError } from "../../api";
import { Spinner } from "./jobUi";
import { NIGERIA_STATES, WORK_TYPES } from "../../utils/jobOptions";
import JobCard from "./JobCard";
import JobDetails from "./JobDetails";
import FeaturedAds from "../../data/Featuredads";

const selectCls = "rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-orange-600";

export default function BrowseJobs({ user }) {
  const [filters, setFilters] = useState({ q: "", state: "", workType: "" });
  const [q, setQ] = useState(""); // debounced search text
  const [jobs, setJobs] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [more, setMore] = useState(false);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    const t = setTimeout(() => setQ(filters.q), 400);
    return () => clearTimeout(t);
  }, [filters.q]);

  const fetchPage = useCallback(async (p) => {
    p === 1 ? setLoading(true) : setMore(true);
    try {
      const { data } = await jobsApi.browse({ q, state: filters.state, workType: filters.workType, page: p });
      setJobs((prev) => (p === 1 ? data.jobs : [...prev, ...data.jobs]));
      setPage(p);
      setHasMore(data.hasMore);
    } catch (err) { toast.error(getError(err)); }
    finally { setLoading(false); setMore(false); }
  }, [q, filters.state, filters.workType]);

  useEffect(() => { fetchPage(1); }, [fetchPage]);

  const patch = (id, changes) => setJobs((js) => js.map((j) => (j._id === id ? { ...j, ...changes } : j)));

  if (selected)
    return <JobDetails jobId={selected} user={user} onBack={() => setSelected(null)}
      onChange={(id, changes) => patch(id, changes)} />;

  return (
    <div className="space-y-5">
      <FeaturedAds onSelect={(j) => setSelected(j._id)} />

      <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto]">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={filters.q} onChange={(e) => setFilters({ ...filters, q: e.target.value })}
            placeholder="Search jobs, skills or cities"
            className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-9 pr-3 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-orange-600" />
        </div>
        <select aria-label="State" value={filters.state} onChange={(e) => setFilters({ ...filters, state: e.target.value })} className={selectCls}>
          <option value="">All states</option>{NIGERIA_STATES.map((s) => <option key={s}>{s}</option>)}
        </select>
        <select aria-label="Work type" value={filters.workType} onChange={(e) => setFilters({ ...filters, workType: e.target.value })} className={selectCls}>
          <option value="">All work types</option>{WORK_TYPES.map((s) => <option key={s}>{s}</option>)}
        </select>
      </div>

      {loading ? <Spinner label="Finding jobs…" /> : !jobs.length ? (
        <div className="rounded-2xl bg-white p-10 text-center shadow-sm">
          <h3 className="text-lg font-bold">No jobs found</h3>
          <p className="mt-1 text-slate-500">Try a different search or clear the filters.</p>
        </div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2">
            {jobs.map((j) => <JobCard key={j._id} job={j} onOpen={setSelected} onLiked={(id, liked) => patch(id, { liked })} />)}
          </div>
          {hasMore && (
            <div className="text-center">
              <button disabled={more} onClick={() => fetchPage(page + 1)}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold hover:bg-slate-50 disabled:opacity-60">
                {more && <Loader2 size={16} className="animate-spin" />} Load more
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}