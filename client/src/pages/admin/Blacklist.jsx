import { useCallback, useEffect, useRef, useState } from "react";
import { Navigate } from "react-router-dom";
import { Ban, History, Loader2, Plus, RotateCcw, Search, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { blacklistApi, getError } from "../../api";
import { useAuth } from "../../context/AuthContext";
import BlacklistStats from "../../components/blacklist/BlacklistStats";
import BlacklistModal from "../../components/blacklist/BlacklistModal";
import LiftBlacklistModal from "../../components/blacklist/LiftBlacklistModal";
import HistoryModal from "../../components/blacklist/HistoryModal";
import { Pagination, RoleBadge, UserAvatar } from "../../components/blacklist/ui";
import {
  CATEGORIES,
  ELIGIBLE_ROLES,
  ROLE_META,
  categoryLabel,
  displayName,
  formatDate,
  inputCls,
} from "../../components/blacklist/constants";

const PAGE_SIZE = 10;

export default function Blacklist() {
  const { user, loading: authLoading } = useAuth();

  const [filters, setFilters] = useState({ search: "", role: "", category: "" });
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ users: [], total: 0, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);

  const [showBlacklist, setShowBlacklist] = useState(false);
  const [liftTarget, setLiftTarget] = useState(null);
  const [historyTarget, setHistoryTarget] = useState(null);

  const reqId = useRef(0);

  // wait a moment after typing before searching
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(filters.search.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(t);
  }, [filters.search]);

  const loadList = useCallback(async () => {
    const id = ++reqId.current;
    setLoading(true);
    try {
      const { data: res } = await blacklistApi.list({
        page,
        limit: PAGE_SIZE,
        search: debouncedSearch || undefined,
        role: filters.role || undefined,
        category: filters.category || undefined,
      });
      if (id === reqId.current) setData(res);
    } catch (err) {
      if (id === reqId.current) toast.error(getError(err));
    } finally {
      if (id === reqId.current) setLoading(false);
    }
  }, [page, debouncedSearch, filters.role, filters.category]);

  const loadStats = useCallback(async () => {
    try {
      const { data: res } = await blacklistApi.stats();
      setStats(res.stats);
    } catch {
      /* the cards just stay empty */
    }
  }, []);

  useEffect(() => {
    loadList();
  }, [loadList]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const refresh = () => {
    loadList();
    loadStats();
  };

  const setFilter = (key, value) => {
    setFilters((f) => ({ ...f, [key]: value }));
    if (key !== "search") setPage(1);
  };

  const hasFilters = filters.search || filters.role || filters.category;

  // Only superadmins may see this page
  if (authLoading) {
    return (
      <div role="status" className="flex min-h-[50vh] items-center justify-center text-slate-500">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }
  if (user?.role !== "superadmin") return <Navigate to="/" replace />;

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6">
      {/* header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
            <Ban className="h-7 w-7 text-red-600" /> Blacklist
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Block job seekers, employers, admins and agents. Every action is recorded.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowBlacklist(true)}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-red-700 focus:outline-none focus-visible:ring-4 focus-visible:ring-red-200"
        >
          <Plus className="h-4 w-4" /> Blacklist a user
        </button>
      </div>

      <BlacklistStats stats={stats} />

      {/* filters */}
      <div className="grid gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100 sm:grid-cols-2 lg:grid-cols-[1fr_200px_240px_auto]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={filters.search}
            onChange={(e) => setFilter("search", e.target.value)}
            placeholder="Search name, email, phone or company"
            aria-label="Search blacklisted users"
            className={`${inputCls} pl-10`}
          />
        </div>
        <select
          value={filters.role}
          onChange={(e) => setFilter("role", e.target.value)}
          aria-label="Filter by role"
          className={inputCls}
        >
          <option value="">All roles</option>
          {ELIGIBLE_ROLES.map((r) => (
            <option key={r} value={r}>
              {ROLE_META[r].label}
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

      {/* table */}
      <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-100">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3 font-semibold">User</th>
                <th className="px-4 py-3 font-semibold">Role</th>
                <th className="px-4 py-3 font-semibold">Category</th>
                <th className="px-4 py-3 font-semibold">Reason</th>
                <th className="px-4 py-3 font-semibold">Blacklisted</th>
                <th className="px-4 py-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    <td colSpan={6} className="px-4 py-4">
                      <div className="h-10 animate-pulse rounded-lg bg-slate-100" />
                    </td>
                  </tr>
                ))
              ) : data.users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-16 text-center">
                    <ShieldCheck className="mx-auto h-10 w-10 text-slate-300" />
                    <p className="mt-3 font-semibold text-slate-700">
                      {hasFilters ? "No blacklisted users match your filters" : "Nobody is blacklisted"}
                    </p>
                    <p className="mt-1 text-slate-500">
                      {hasFilters ? "Try different words or clear the filters." : "Users you blacklist will show up here."}
                    </p>
                  </td>
                </tr>
              ) : (
                data.users.map((u) => (
                  <tr key={u._id} className="align-top transition hover:bg-slate-50/70">
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <UserAvatar user={u} />
                        <div className="min-w-0">
                          <p className="max-w-[200px] truncate font-semibold text-slate-900">{displayName(u)}</p>
                          <p className="max-w-[200px] truncate text-xs text-slate-500">{u.email || u.phoneNumber}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <RoleBadge role={u.role} />
                    </td>
                    <td className="px-4 py-4 text-slate-700">{categoryLabel(u.blacklistCategory)}</td>
                    <td className="px-4 py-4">
                      <p className="line-clamp-2 max-w-xs text-slate-600" title={u.blacklistReason}>
                        {u.blacklistReason || "—"}
                      </p>
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 text-slate-600">
                      <p>{formatDate(u.blacklistedAt)}</p>
                      {u.blacklistedBy && (
                        <p className="text-xs text-slate-400">by {displayName(u.blacklistedBy)}</p>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setHistoryTarget(u)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                        >
                          <History className="h-3.5 w-3.5" /> History
                        </button>
                        <button
                          type="button"
                          onClick={() => setLiftTarget(u)}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200 transition hover:bg-emerald-100"
                        >
                          <RotateCcw className="h-3.5 w-3.5" /> Lift
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <Pagination page={page} pages={data.pages} total={data.total} onChange={setPage} />
      </div>

      {/* modals */}
      <BlacklistModal open={showBlacklist} onClose={() => setShowBlacklist(false)} onDone={refresh} />
      <LiftBlacklistModal user={liftTarget} onClose={() => setLiftTarget(null)} onDone={refresh} />
      <HistoryModal user={historyTarget} onClose={() => setHistoryTarget(null)} />
    </div>
  );
}
