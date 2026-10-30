import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  BadgeCheck, Briefcase, ChevronDown, Loader2, MapPin, Search, SearchX, Tag, User, Users,
} from "lucide-react";
import { toast } from "sonner";
import im from "../../assets/searching.jpeg";

import { searchApi, getError } from "../../api";
import { statesAndLgas } from "../../data/statesLga";
import PublicJobCard from "../../pages/home/jobKit/PublicJobCard";


const STATES = Object.keys(statesAndLgas);

const fieldCls =
  "w-full rounded-xl border border-slate-200 bg-white py-3 pr-4 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-orange-500 focus:ring-4 focus:ring-orange-500/20";

/* ---------- Text input that suggests matches from the database as you type ---------- */
function SuggestInput({ label, icon: Icon, value, onChange, placeholder, type, field }) {
  const listId = useId();
  const [items, setItems] = useState([]);
  const [focused, setFocused] = useState(false);
  const [active, setActive] = useState(-1);
  const [loading, setLoading] = useState(false);
  const skip = useRef(false); // don't re-fetch right after the user picks a suggestion

  useEffect(() => {
    if (skip.current) { skip.current = false; return; }
    const q = value.trim();
    if (q.length < 2) { setItems([]); setLoading(false); return; }
    const ctrl = new AbortController();
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const { data } = await searchApi.suggest({ type, field, q }, ctrl.signal);
        setItems(data.suggestions || []);
        setActive(-1);
      } catch { /* aborted or failed: just show nothing */ }
      finally { if (!ctrl.signal.aborted) setLoading(false); }
    }, 250);
    return () => { clearTimeout(t); ctrl.abort(); };
  }, [value, type, field]);

  const open = focused && items.length > 0;
  const pick = (text) => { skip.current = true; onChange(text); setItems([]); setActive(-1); };

  const onKeyDown = (e) => {
    if (!open) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setActive((i) => (i + 1) % items.length); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive((i) => (i <= 0 ? items.length - 1 : i - 1)); }
    else if (e.key === "Enter" && active >= 0) { e.preventDefault(); pick(items[active]); }
    else if (e.key === "Escape") setItems([]);
  };

  return (
    <div className="relative">
      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</label>
      <div className="relative">
        <Icon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          role="combobox" aria-expanded={open} aria-controls={listId} aria-autocomplete="list"
          aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
          autoComplete="off" value={value} placeholder={placeholder} className={`${fieldCls} pl-10`}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} onKeyDown={onKeyDown}
        />
        {loading && <Loader2 className="absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-slate-400" />}
      </div>
      {open && (
        <ul id={listId} role="listbox"
          className="absolute left-0 right-0 top-full z-30 mt-1.5 max-h-60 overflow-auto rounded-xl border border-slate-200 bg-white py-1 shadow-xl">
          {items.map((s, i) => (
            <li key={s} id={`${listId}-${i}`} role="option" aria-selected={i === active}
              onMouseDown={(e) => { e.preventDefault(); pick(s); }} onMouseEnter={() => setActive(i)}
              className={`cursor-pointer px-4 py-2.5 text-sm ${i === active ? "bg-orange-50 text-orange-700" : "text-slate-700"}`}>
              {s}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ---------- Native dropdown (best on mobile) ---------- */
function Select({ label, icon: Icon, value, onChange, options, placeholder, disabled }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</label>
      <div className="relative">
        <Icon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <select value={value} disabled={disabled} onChange={(e) => onChange(e.target.value)}
          className={`${fieldCls} appearance-none pl-10 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400`}>
          <option value="">{placeholder}</option>
          {options.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      </div>
    </div>
  );
}

/* ---------- Candidate result card ---------- */
function CandidateCard({ c }) {
  const name = [c.firstName, c.lastName].filter(Boolean).join(" ") || "Candidate";
  const place = [c.localGovernment, c.state].filter((v) => v && v !== "none").join(", ");
  const roles = (c.jobChoice || []).filter(Boolean);
  return (
    <article className="flex flex-col rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100 transition hover:shadow-lg">
      <div className="flex items-center gap-4">
        {c.avatar ? (
          <img src={c.avatar} alt="" className="h-14 w-14 rounded-full object-cover" />
        ) : (
          <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-orange-100 text-lg font-bold text-orange-700">
            {name[0]?.toUpperCase()}
          </span>
        )}
        <div className="min-w-0">
          <h3 className="flex items-center gap-1.5 truncate text-lg font-bold text-slate-800">
            {name}
            {c.isCertified && <BadgeCheck className="h-5 w-5 shrink-0 text-emerald-600" aria-label="Certified" />}
          </h3>
          {place && (
            <p className="flex items-center gap-1.5 truncate text-sm text-slate-500">
              <MapPin className="h-3.5 w-3.5 shrink-0" /> {place}
            </p>
          )}
        </div>
      </div>
      {roles.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {roles.slice(0, 4).map((r) => (
            <span key={r} className="rounded-full bg-orange-50 px-3 py-1 text-xs font-semibold text-orange-800 ring-1 ring-orange-100">{r}</span>
          ))}
          {roles.length > 4 && <span className="px-1 py-1 text-xs text-slate-500">+{roles.length - 4} more</span>}
        </div>
      )}
      <Link to={`/candidates/${c._id}`}
        className="mt-5 rounded-xl bg-orange-600 px-4 py-2.5 text-center text-sm font-bold text-white transition hover:bg-orange-700">
        View profile
      </Link>
    </article>
  );
}

/* ---------- Hero ---------- */
const EMPTY_JOB = { title: "", category: "", state: "", lga: "" };
const EMPTY_CAND = { name: "", role: "", state: "", lga: "" };

const Hero = () => {
  const [mode, setMode] = useState("job"); // "job" | "candidate"
  const [jobF, setJobF] = useState(EMPTY_JOB);
  const [candF, setCandF] = useState(EMPTY_CAND);
  const [results, setResults] = useState(null); // { mode, items, total, page, hasMore, params }
  const [loading, setLoading] = useState(false);
  const [more, setMore] = useState(false);
  const resultsRef = useRef(null);
  const reqId = useRef(0);

  const isJob = mode === "job";
  const f = isJob ? jobF : candF;
  const setF = isJob ? setJobF : setCandF;
  const patch = (changes) => setF((x) => ({ ...x, ...changes }));
  const lgas = f.state ? statesAndLgas[f.state] || [] : [];

  const runSearch = useCallback(async (searchMode, params, page = 1) => {
    const id = ++reqId.current;
    page === 1 ? setLoading(true) : setMore(true);
    try {
      const call = searchMode === "job" ? searchApi.jobs : searchApi.candidates;
      const { data } = await call({ ...params, page });
      if (id !== reqId.current) return;
      const items = searchMode === "job" ? data.jobs : data.candidates;
      setResults((prev) => ({
        mode: searchMode, params, page, total: data.total, hasMore: data.hasMore,
        items: page === 1 ? items : [...(prev?.items || []), ...items],
      }));
      if (page === 1) setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
    } catch (err) {
      if (id === reqId.current) toast.error(getError(err));
    } finally {
      if (id === reqId.current) { setLoading(false); setMore(false); }
    }
  }, []);

  const submit = (e) => {
    e.preventDefault();
    const params = Object.fromEntries(Object.entries(f).map(([k, v]) => [k, v.trim()]).filter(([, v]) => v));
    if (!Object.keys(params).length) return toast.error("Enter at least one search detail");
    runSearch(mode, params, 1);
  };

  const switchMode = (m) => { setMode(m); setResults(null); };

  return (
    <>
      <section className="relative isolate overflow-hidden">
        <img src={im} alt="" className="absolute inset-0 -z-20 h-full w-full object-cover" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-slate-950/80 via-slate-900/70 to-slate-950/90" />

        <div className="mx-auto max-w-6xl px-4 pb-16 pt-14 sm:px-6 sm:pb-24 sm:pt-20 lg:pt-28">
          <div className="mx-auto max-w-3xl text-center">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-orange-200 ring-1 ring-white/20 backdrop-blur">
              Jobs · Talent · Opportunities
            </span>
            <h1 className="mt-5 text-4xl font-extrabold leading-tight tracking-tight text-white sm:text-5xl lg:text-6xl">
              The Easiest Way To Get Your New <span className="text-orange-400">Job</span> and <span className="text-orange-400">Staff</span>
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-base text-slate-200 sm:text-lg">
              Search thousands of open roles, or find verified candidates ready to work, all in one place.
            </p>
          </div>

          <div className="mx-auto mt-10 max-w-5xl">
            {/* tabs */}
            <div role="tablist" aria-label="What are you looking for?" className="mb-3 flex justify-center">
              <div className="inline-flex rounded-full bg-white/10 p-1 ring-1 ring-white/20 backdrop-blur">
                {[["job", "Find a job", Briefcase], ["candidate", "Find a candidate", Users]].map(([key, label, Icon]) => (
                  <button key={key} role="tab" type="button" aria-selected={mode === key} onClick={() => switchMode(key)}
                    className={`inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-bold transition sm:px-6 ${mode === key ? "bg-orange-600 text-white shadow" : "text-slate-200 hover:text-white"}`}>
                    <Icon className="h-4 w-4" /> {label}
                  </button>
                ))}
              </div>
            </div>

            {/* form */}
            <form onSubmit={submit} noValidate className="rounded-2xl bg-white p-4 shadow-2xl ring-1 ring-white/20 sm:p-6">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {isJob ? (
                  <>
                    <SuggestInput label="Job title" icon={Briefcase} type="job" field="title" placeholder="e.g. Accountant"
                      value={jobF.title} onChange={(v) => patch({ title: v })} />
                    <SuggestInput label="Category" icon={Tag} type="job" field="category" placeholder="e.g. Finance"
                      value={jobF.category} onChange={(v) => patch({ category: v })} />
                  </>
                ) : (
                  <>
                    <SuggestInput label="Candidate name" icon={User} type="candidate" field="name" placeholder="First or last name"
                      value={candF.name} onChange={(v) => patch({ name: v })} />
                    <SuggestInput label="Job role" icon={Briefcase} type="candidate" field="role" placeholder="e.g. Driver"
                      value={candF.role} onChange={(v) => patch({ role: v })} />
                  </>
                )}
                <Select label="State" icon={MapPin} placeholder="Any state" options={STATES} value={f.state}
                  onChange={(v) => patch({ state: v, lga: "" })} />
                <Select label="Local government" icon={MapPin} placeholder={f.state ? "Any LGA" : "Select a state first"}
                  options={lgas} value={f.lga} disabled={!f.state} onChange={(v) => patch({ lga: v })} />
              </div>

              <button type="submit" disabled={loading}
                className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-orange-600 px-6 py-3.5 text-base font-bold text-white shadow-lg shadow-orange-600/30 transition hover:bg-orange-700 disabled:opacity-70 sm:w-auto sm:px-10">
                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Search className="h-5 w-5" />}
                {isJob ? "Search jobs" : "Search candidates"}
              </button>
            </form>
          </div>
        </div>
      </section>

      {/* results */}
      {(loading || results) && (
        <section ref={resultsRef} className="scroll-mt-4 bg-slate-100 px-4 py-10 sm:px-6">
          <div className="mx-auto max-w-7xl">
            {loading ? (
              <div role="status" className="flex items-center justify-center gap-2 py-16 text-slate-500">
                <Loader2 className="h-5 w-5 animate-spin" /> Searching…
              </div>
            ) : !results.items.length ? (
              <div className="rounded-2xl bg-white p-10 text-center shadow-sm ring-1 ring-slate-100">
                <SearchX className="mx-auto h-10 w-10 text-slate-300" />
                <h2 className="mt-3 text-lg font-bold">Nothing found</h2>
                <p className="mt-1 text-slate-500">Try different words or remove a filter.</p>
              </div>
            ) : (
              <>
                <p className="mb-4 text-sm text-slate-600">
                  {results.total} {results.mode === "job" ? "open job" : "candidate"}{results.total === 1 ? "" : "s"} found
                </p>
                {results.mode === "job" ? (
                  <div className="space-y-5">
                    {results.items.map((j) => <PublicJobCard key={j._id} job={j} origin={null} />)}
                  </div>
                ) : (
                  <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                    {results.items.map((c) => <CandidateCard key={c._id} c={c} />)}
                  </div>
                )}
                {results.hasMore && (
                  <div className="mt-6 text-center">
                    <button type="button" disabled={more} onClick={() => runSearch(results.mode, results.params, results.page + 1)}
                      className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-6 py-2.5 text-sm font-semibold hover:bg-slate-50 disabled:opacity-60">
                      {more && <Loader2 className="h-4 w-4 animate-spin" />} Load more
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </section>
      )}
    </>
  );
};

export default Hero;