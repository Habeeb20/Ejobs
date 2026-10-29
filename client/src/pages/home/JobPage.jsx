import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, Search, SearchX } from "lucide-react";
import { toast } from "sonner";
import { jobsApi, getError } from "../../api";
import { Spinner } from "../features/jobUi";
import { NIGERIA_STATES, WORK_TYPES } from "../../utils/jobOptions";

import JobCard, { LocationNotice } from "./jobKit/PublicJobCard";
import { useUserLocation } from "./jobKit/geo";

const inputCls =
  "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-orange-500 focus:ring-4 focus:ring-orange-500/15";

const FIELDS = ["jobFunction", "industry", "state", "workType", "minSalary", "maxSalary"];
const EMPTY = Object.fromEntries(FIELDS.map((k) => [k, ""]));
const same = (a, b) => FIELDS.every((k) => a[k] === b[k]);
const badSalary = (f) => f.minSalary !== "" && f.maxSalary !== "" && Number(f.minSalary) > Number(f.maxSalary);
const withCurrent = (list, value) => (value && !list.includes(value) ? [...list, value] : list);

export default function JobPage() {
  const [draft, setDraft] = useState(EMPTY);     // what's typed in the boxes
  const [applied, setApplied] = useState(EMPTY); // what the list is currently filtered by
  const [jobs, setJobs] = useState([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [stateCounts, setStateCounts] = useState([]);
  const [industries, setIndustries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [more, setMore] = useState(false);
  const [allStates, setAllStates] = useState(false);
  const reqId = useRef(0);
  const { coords, status, request } = useUserLocation();

  const salaryInvalid = badSalary(draft);

  // Typing applies after a short pause; selects and the Search button apply straight away
  useEffect(() => {
    if (salaryInvalid) return;
    const t = setTimeout(() => setApplied((prev) => (same(prev, draft) ? prev : draft)), 450);
    return () => clearTimeout(t);
  }, [draft, salaryInvalid]);

  const patch = (changes, immediate = false) => {
    const next = { ...draft, ...changes };
    setDraft(next);
    if (immediate && !badSalary(next)) setApplied(next);
  };

  const fetchPage = useCallback(async (p, filters) => {
    const id = ++reqId.current;
    p === 1 ? setLoading(true) : setMore(true);
    try {
      const params = Object.fromEntries(
        Object.entries({ ...filters, page: p }).filter(([, v]) => v !== "" && v != null)
      );
      const { data } = await jobsApi.all(params);
      if (id !== reqId.current) return; // a newer search has replaced this one
      setJobs((prev) => (p === 1 ? data.jobs : [...prev, ...data.jobs]));
      setPage(p);
      setTotal(data.total);
      setHasMore(data.hasMore);
      if (p === 1) {
        setStateCounts(data.stateCounts || []);
        setIndustries(data.industries || []);
      }
    } catch (err) {
      if (id === reqId.current) toast.error(getError(err));
    } finally {
      if (id === reqId.current) { setLoading(false); setMore(false); }
    }
  }, []);

  useEffect(() => { fetchPage(1, applied); }, [applied, fetchPage]);

  const clearAll = () => { setDraft(EMPTY); setApplied(EMPTY); };
  const submit = (e) => { e.preventDefault(); if (!salaryInvalid) setApplied({ ...draft }); };
  const visibleStates = allStates ? stateCounts : stateCounts.slice(0, 8);

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800">


      <main className="mx-auto max-w-7xl px-4 pb-16 pt-8 sm:px-6">
        <div className="mb-6">
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">Find work that fits.</h1>
          <p className="mt-1.5 text-slate-500">Browse every open job from verified employers. No account needed to look around.</p>
        </div>

        <form onSubmit={submit} noValidate className="space-y-5">
          {/* search bar */}
          <div className="rounded-2xl bg-white p-3 shadow-md ring-1 ring-slate-100 sm:p-4">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1.2fr_1fr_1fr_1fr_auto]">
              <input value={draft.jobFunction} onChange={(e) => patch({ jobFunction: e.target.value })}
                placeholder="Job function" aria-label="Job function" className={inputCls} />
              <select aria-label="Industry" value={draft.industry} className={inputCls}
                onChange={(e) => patch({ industry: e.target.value }, true)}>
                <option value="">Industry</option>
                {withCurrent(industries, draft.industry).map((i) => <option key={i}>{i}</option>)}
              </select>
              <select aria-label="State" value={draft.state} className={inputCls}
                onChange={(e) => patch({ state: e.target.value }, true)}>
                <option value="">State</option>
                {withCurrent(NIGERIA_STATES, draft.state).map((s) => <option key={s}>{s}</option>)}
              </select>
              <select aria-label="Work type" value={draft.workType} className={inputCls}
                onChange={(e) => patch({ workType: e.target.value }, true)}>
                <option value="">Work type</option>
                {withCurrent(WORK_TYPES, draft.workType).map((w) => <option key={w}>{w}</option>)}
              </select>
              <button type="submit"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-orange-600 px-6 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-orange-700">
                <Search className="h-4 w-4" /> Search
              </button>
            </div>
          </div>

          {/* salary range */}
          <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100 sm:p-6">
            <h2 className="text-lg font-bold text-slate-900">Filter by Salary Range (₦)</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1.5 block text-sm text-slate-600">Minimum Salary</span>
                <input type="number" inputMode="numeric" min="0" placeholder="e.g. 50000"
                  value={draft.minSalary} onChange={(e) => patch({ minSalary: e.target.value })} className={inputCls} />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-sm text-slate-600">Maximum Salary</span>
                <input type="number" inputMode="numeric" min="0" placeholder="e.g. 200000"
                  value={draft.maxSalary} onChange={(e) => patch({ maxSalary: e.target.value })} className={inputCls} />
              </label>
            </div>
            {salaryInvalid && (
              <p role="alert" className="mt-3 text-sm text-red-600">Minimum salary can't be higher than the maximum.</p>
            )}
            <button type="button" onClick={clearAll} className="mt-4 text-sm font-semibold text-orange-700 hover:underline">
              Clear All Filters
            </button>
          </section>
        </form>

        <div className="mt-6 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <section>
            <LocationNotice status={status} request={request} />

            {loading ? (
              <Spinner label="Finding jobs…" />
            ) : !jobs.length ? (
              <div className="rounded-2xl bg-white p-10 text-center shadow-sm ring-1 ring-slate-100">
                <SearchX className="mx-auto h-10 w-10 text-slate-300" />
                <h2 className="mt-3 text-lg font-bold">No jobs found</h2>
                <p className="mt-1 text-slate-500">Try a different search or clear the filters.</p>
                <button type="button" onClick={clearAll}
                  className="mt-4 rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-700">
                  Clear all filters
                </button>
              </div>
            ) : (
              <>
                <p className="mb-3 text-sm text-slate-500">{total} open job{total === 1 ? "" : "s"}</p>
                <div className="space-y-5">
                  {jobs.map((j) => <JobCard key={j._id} job={j} origin={coords} />)}
                </div>
                {hasMore && (
                  <div className="mt-6 text-center">
                    <button type="button" disabled={more} onClick={() => fetchPage(page + 1, applied)}
                      className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-6 py-2.5 text-sm font-semibold hover:bg-slate-50 disabled:opacity-60">
                      {more && <Loader2 className="h-4 w-4 animate-spin" />} Load more
                    </button>
                  </div>
                )}
              </>
            )}
          </section>

          <aside className="lg:sticky lg:top-24">
            <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
              <h2 className="text-2xl font-extrabold text-slate-900">Jobs in Nigeria</h2>

              <div className="mt-5 flex items-center justify-between rounded-xl border border-orange-100 bg-orange-50/70 px-4 py-4">
                <span className="text-slate-700">Total Jobs Found</span>
                <span className="text-3xl font-extrabold text-orange-700">{total}</span>
              </div>

              <ul className="mt-3 space-y-2">
                {visibleStates.map(({ state, count }) => (
                  <li key={state}>
                    <button type="button" aria-pressed={draft.state === state}
                      onClick={() => patch({ state: draft.state === state ? "" : state }, true)}
                      className={`flex w-full items-center justify-between rounded-xl px-4 py-3 text-left transition ${draft.state === state ? "bg-orange-100 ring-1 ring-orange-300" : "bg-slate-50 hover:bg-orange-50"
                        }`}>
                      <span className="text-slate-700">{state}</span>
                      <span className="text-lg font-bold text-orange-700">{count}</span>
                    </button>
                  </li>
                ))}
              </ul>

              {stateCounts.length > 8 && (
                <button type="button" onClick={() => setAllStates((v) => !v)}
                  className="mt-3 text-sm font-semibold text-orange-700 hover:underline">
                  {allStates ? "Show fewer states" : `Show all ${stateCounts.length} states`}
                </button>
              )}
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}