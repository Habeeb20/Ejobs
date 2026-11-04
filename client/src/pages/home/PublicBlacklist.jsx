import { useCallback, useEffect, useRef, useState } from "react";
import { Ban, Building2, MapPin, RefreshCw, Search, SearchX, ShieldAlert, UserRound } from "lucide-react";
import { blacklistApi, getError } from "../../api";
import { CATEGORIES, ROLE_META, categoryLabel, inputCls } from "../../components/blacklist/constants";
import { Pagination, RoleBadge } from "../../components/blacklist/ui";

const PUBLIC_ROLES = ["jobseeker", "employer", "agent"];
const PAGE_SIZE = 12;

const formatDay = (d) =>
  d ? new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(new Date(d)) : "";

function EntryCard({ item }) {
  const Icon = item.role === "employer" ? Building2 : UserRound;
  return (
    <article className="flex flex-col rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100 transition duration-200 hover:-translate-y-0.5 hover:shadow-lg">
      <div className="flex items-center gap-3">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-red-50 text-red-600">
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <h3 className="truncate text-base font-bold text-slate-900" title={item.name}>
            {item.name}
          </h3>
          <div className="mt-1">
            <RoleBadge role={item.role} />
          </div>
        </div>
      </div>

      <span className="mt-4 inline-flex w-fit items-center gap-1.5 rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-700 ring-1 ring-red-200">
        <Ban className="h-3 w-3" aria-hidden="true" /> {categoryLabel(item.category)}
      </span>

      <div className="mt-4 flex items-center justify-between gap-3 border-t border-slate-100 pt-3 text-xs text-slate-500">
        <span className="inline-flex min-w-0 items-center gap-1">
          {item.state && (
            <>
              <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span className="truncate">{item.state}</span>
            </>
          )}
        </span>
        <span className="shrink-0">Since {formatDay(item.blacklistedAt)}</span>
      </div>
    </article>
  );
}

function SkeletonCard() {
  return (
    <div className="animate-pulse rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
      <div className="flex items-center gap-3">
        <div className="h-12 w-12 rounded-full bg-slate-100" />
        <div className="space-y-2">
          <div className="h-4 w-32 rounded bg-slate-100" />
          <div className="h-4 w-20 rounded bg-slate-100" />
        </div>
      </div>
      <div className="mt-4 h-6 w-36 rounded-full bg-slate-100" />
      <div className="mt-4 h-4 w-full rounded bg-slate-100" />
    </div>
  );
}

// Public page: anyone can check whether an account has been blacklisted. No login needed.
export default function PublicBlacklist() {
  const [filters, setFilters] = useState({ search: "", role: "", category: "" });
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ items: [], total: 0, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const reqId = useRef(0);

  const support = import.meta.env.VITE_SUPPORT_EMAIL;

  // wait a moment after typing before searching
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(filters.search.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(t);
  }, [filters.search]);

  const load = useCallback(async () => {
    const id = ++reqId.current;
    setLoading(true);
    setError("");
    try {
      const { data: res } = await publicBlacklistApi.list({
        page,
        limit: PAGE_SIZE,
        search: debouncedSearch || undefined,
        role: filters.role || undefined,
        category: filters.category || undefined,
      });
      if (id === reqId.current) setData(res);
    } catch (err) {
      if (id === reqId.current) setError(getError(err));
    } finally {
      if (id === reqId.current) setLoading(false);
    }
  }, [page, debouncedSearch, filters.role, filters.category]);

  useEffect(() => {
    load();
  }, [load]);

  const setFilter = (key, value) => {
    setFilters((f) => ({ ...f, [key]: value }));
    if (key !== "search") setPage(1);
  };

  const hasFilters = Boolean(filters.search || filters.role || filters.category);

  return (
    <section className="bg-slate-50 px-4 py-10 sm:px-6 sm:py-14">
      <div className="mx-auto max-w-6xl">
        {/* heading */}
        <div className="mx-auto max-w-2xl text-center">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-red-100 text-red-600">
            <ShieldAlert className="h-7 w-7" aria-hidden="true" />
          </span>
          <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
            Blacklisted accounts
          </h1>
          <p className="mt-3 text-base text-slate-600">
            Check whether a job seeker, employer or agent has been removed from the platform for breaking our rules.
          </p>
        </div>

        <p className="mx-auto mt-6 max-w-2xl rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-center text-sm text-amber-800">
          Only limited details are shown to protect privacy.
          {support ? (
            <>
              {" "}
              Think an entry is a mistake? Email{" "}
              <a href={`mailto:${support}`} className="font-semibold underline">
                {support}
              </a>
              .
            </>
          ) : (
            " Think an entry is a mistake? Please contact support."
          )}
        </p>

        {/* filters */}
        <div className="mt-8 grid gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100 sm:grid-cols-2 lg:grid-cols-[1fr_190px_230px_auto]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={filters.search}
              onChange={(e) => setFilter("search", e.target.value)}
              placeholder="Search a name or company"
              aria-label="Search by name or company"
              className={`${inputCls} pl-10`}
            />
          </div>
          <select
            value={filters.role}
            onChange={(e) => setFilter("role", e.target.value)}
            aria-label="Filter by type"
            className={inputCls}
          >
            <option value="">Everyone</option>
            {PUBLIC_ROLES.map((r) => (
              <option key={r} value={r}>
                {ROLE_META[r].label}s
              </option>
            ))}
          </select>
          <select
            value={filters.category}
            onChange={(e) => setFilter("category", e.target.value)}
            aria-label="Filter by category"
            className={inputCls}
          >
            <option value="">All categories</option>
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
          {hasFilters && (
            <button
              type="button"
              onClick={() => {
                setFilters({ search: "", role: "", category: "" });
                setPage(1);
              }}
              className="rounded-xl px-4 py-3 text-sm font-semibold text-orange-600 transition hover:bg-orange-50"
            >
              Clear
            </button>
          )}
        </div>

        {/* results */}
        <div className="mt-6" aria-live="polite">
          {loading ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          ) : error ? (
            <div role="alert" className="rounded-2xl bg-white p-10 text-center shadow-sm ring-1 ring-slate-100">
              <p className="font-semibold text-slate-800">{error}</p>
              <button
                type="button"
                onClick={load}
                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-orange-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-orange-700"
              >
                <RefreshCw className="h-4 w-4" /> Try again
              </button>
            </div>
          ) : data.items.length === 0 ? (
            <div className="rounded-2xl bg-white p-10 text-center shadow-sm ring-1 ring-slate-100">
              <SearchX className="mx-auto h-10 w-10 text-slate-300" />
              <h2 className="mt-3 text-lg font-bold text-slate-800">
                {hasFilters ? "No matching entries" : "Nobody is listed"}
              </h2>
              <p className="mt-1 text-slate-500">
                {hasFilters
                  ? "No blacklisted account matches that search. Check the spelling or clear the filters."
                  : "No accounts are on the public blacklist right now."}
              </p>
            </div>
          ) : (
            <>
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {data.items.map((item) => (
                  <EntryCard key={item.id} item={item} />
                ))}
              </div>
              <div className="mt-6 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-100">
                <Pagination page={page} pages={data.pages} total={data.total} onChange={setPage} />
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}