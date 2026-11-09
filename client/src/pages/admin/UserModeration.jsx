import { useCallback, useEffect, useRef, useState } from "react";
import { adminApi } from "../../adminApi";


const TABS = [
  { id: "all", label: "Everyone" },
  { id: "jobseeker", label: "Job seekers" },
  { id: "employer", label: "Employers" },
  { id: "agent", label: "Agents" },
];

const displayName = (u) =>
  (u.role === "employer" && u.companyName) ||
  [u.firstName, u.lastName].filter(Boolean).join(" ") ||
  u.email ||
  "Unnamed account";

const when = (d) => (d ? new Date(d).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" }) : "Never");

function useDebounced(value, ms = 350) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

const Badge = ({ tone, children }) => {
  const tones = {
    good: "bg-teal-50 text-teal-800 border-teal-200",
    muted: "bg-stone-100 text-stone-600 border-stone-200",
    bad: "bg-red-50 text-red-800 border-red-200",
    warn: "bg-amber-50 text-amber-800 border-amber-200",
  };
  return <span className={`inline-block rounded border px-1.5 py-0.5 text-xs ${tones[tone]}`}>{children}</span>;
};

export default function UserModeration() {
  const [filters, setFilters] = useState({ role: "all", verified: "all", blocked: "all", search: "", page: 1 });
  const [list, setList] = useState({ users: [], total: 0, pages: 1, summary: {} });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState(null);
  const [selected, setSelected] = useState(new Set());
  const [blockDialog, setBlockDialog] = useState(null); // { ids, name, hasEmployer }

  const search = useDebounced(filters.search);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page: filters.page, limit: 20, search };
      if (filters.role !== "all") params.role = filters.role;
      if (filters.verified !== "all") params.verified = filters.verified === "yes";
      if (filters.blocked !== "all") params.blocked = filters.blocked === "yes";
      setList(await adminApi.get("/admin/users", params));
    } catch (e) {
      setNotice({ type: "error", text: e.message });
    } finally {
      setLoading(false);
    }
  }, [filters.page, filters.role, filters.verified, filters.blocked, search]);

  useEffect(() => {
    load();
  }, [load]);

  const change = (patch) => {
    setFilters((f) => ({ ...f, ...patch, page: patch.page ?? 1 }));
    setSelected(new Set());
  };

  const run = async (fn, successText) => {
    setBusy(true);
    setNotice(null);
    try {
      const res = await fn();
      const extra = res.jobsTakenOffline ? ` ${res.jobsTakenOffline} live job(s) taken offline.` : "";
      setNotice({ type: "ok", text: (successText || res.message) + extra });
      setSelected(new Set());
      await load();
    } catch (e) {
      setNotice({ type: "error", text: e.message });
    } finally {
      setBusy(false);
    }
  };

  const single = (u, action, body = {}) =>
    run(() => adminApi.patch(`/admin/users/${u._id}/${action}`, body));

  const bulk = (action, body = {}) =>
    run(() => adminApi.post("/admin/users/bulk", { ids: [...selected], action, ...body }));

  const askBlock = (ids, name) => {
    const hasEmployer = list.users.some((u) => ids.includes(u._id) && u.role === "employer");
    setBlockDialog({ ids, name, hasEmployer });
  };

  const confirmBlock = async ({ reason, takeJobsOffline }) => {
    const { ids } = blockDialog;
    setBlockDialog(null);
    if (ids.length === 1) {
      await run(() => adminApi.patch(`/admin/users/${ids[0]}/block`, { reason, takeJobsOffline }));
    } else {
      await run(() => adminApi.post("/admin/users/bulk", { ids, action: "block", reason, takeJobsOffline }));
    }
  };

  const allOnPage = list.users.length > 0 && list.users.every((u) => selected.has(u._id));
  const toggleAll = () => setSelected(allOnPage ? new Set() : new Set(list.users.map((u) => u._id)));
  const toggleOne = (id) =>
    setSelected((s) => {
      const n = new Set(s);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });

  const countFor = (id) =>
    id === "all"
      ? Object.values(list.summary).reduce((s, r) => s + r.total, 0)
      : list.summary[id]?.total ?? 0;

  const select = "rounded border border-stone-300 bg-white px-2 py-1.5 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-700";
  const btn = "rounded border px-2.5 py-1 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-700 disabled:opacity-50";

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 text-stone-800">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold text-stone-900">Manage accounts</h1>
        <p className="mt-1 max-w-2xl text-sm text-stone-600">
          Verify or unverify accounts, and block or unblock job seekers, employers and agents. Blocking needs a reason.
        </p>
      </header>

      <div role="tablist" className="flex flex-wrap gap-1 border-b border-stone-200">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={filters.role === t.id}
            onClick={() => change({ role: t.id })}
            className={`-mb-px border-b-2 px-3 py-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-700 ${
              filters.role === t.id ? "border-orange-700 font-semibold text-stone-900" : "border-transparent text-stone-600 hover:text-stone-900"
            }`}
          >
            {t.label} <span className="ml-1 tabular-nums text-stone-500">{countFor(t.id)}</span>
          </button>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <input
          type="search"
          aria-label="Search accounts"
          placeholder="Search name, company, email or phone"
          value={filters.search}
          onChange={(e) => change({ search: e.target.value })}
          className={`${select} w-72`}
        />
        <select aria-label="Verification" className={select} value={filters.verified} onChange={(e) => change({ verified: e.target.value })}>
          <option value="all">Verified and unverified</option>
          <option value="yes">Verified only</option>
          <option value="no">Unverified only</option>
        </select>
        <select aria-label="Account status" className={select} value={filters.blocked} onChange={(e) => change({ blocked: e.target.value })}>
          <option value="all">Active and blocked</option>
          <option value="no">Active only</option>
          <option value="yes">Blocked only</option>
        </select>
        <span className="ml-auto text-sm text-stone-500">{list.total} account(s)</span>
      </div>

      {notice && (
        <p
          role={notice.type === "error" ? "alert" : "status"}
          className={`mt-4 rounded border px-3 py-2 text-sm ${
            notice.type === "error" ? "border-red-200 bg-red-50 text-red-800" : "border-teal-200 bg-teal-50 text-teal-900"
          }`}
        >
          {notice.text}
        </p>
      )}

      {selected.size > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-2 rounded border border-stone-300 bg-stone-50 px-3 py-2 text-sm">
          <span className="font-medium">{selected.size} selected</span>
          <button disabled={busy} onClick={() => bulk("verify")} className={`${btn} border-teal-300 text-teal-800 hover:bg-teal-50`}>Verify</button>
          <button disabled={busy} onClick={() => bulk("unverify")} className={`${btn} border-stone-300 hover:bg-stone-100`}>Unverify</button>
          <button disabled={busy} onClick={() => askBlock([...selected], `${selected.size} accounts`)} className={`${btn} border-red-300 text-red-800 hover:bg-red-50`}>Block</button>
          <button disabled={busy} onClick={() => bulk("unblock")} className={`${btn} border-stone-300 hover:bg-stone-100`}>Unblock</button>
          <button onClick={() => setSelected(new Set())} className="ml-auto text-stone-600 underline">Clear selection</button>
        </div>
      )}

      <div className={`mt-4 overflow-x-auto rounded border border-stone-200 bg-white ${loading ? "opacity-60" : ""}`}>
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-stone-200 text-stone-500">
              <th className="w-10 p-3">
                <input type="checkbox" aria-label="Select all on this page" checked={allOnPage} onChange={toggleAll} />
              </th>
              <th className="p-3 font-medium">Account</th>
              <th className="p-3 font-medium">Role</th>
              <th className="p-3 font-medium">Status</th>
              <th className="p-3 font-medium">Last login</th>
              <th className="p-3 font-medium">Joined</th>
              <th className="p-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {list.users.map((u) => (
              <tr key={u._id} className="border-b border-stone-100 align-top last:border-0">
                <td className="p-3">
                  <input type="checkbox" aria-label={`Select ${displayName(u)}`} checked={selected.has(u._id)} onChange={() => toggleOne(u._id)} />
                </td>
                <td className="p-3">
                  <div className="font-medium text-stone-900">{displayName(u)}</div>
                  <div className="text-xs text-stone-500">{u.email}</div>
                  {u.isBlocked && u.blockReason && <div className="mt-1 text-xs text-red-700">Reason: {u.blockReason}</div>}
                </td>
                <td className="p-3 capitalize">{u.role}</td>
                <td className="space-x-1 p-3">
                  <Badge tone={u.isVerified ? "good" : "muted"}>{u.isVerified ? "Verified" : "Unverified"}</Badge>
                  {u.isBlocked && <Badge tone="bad">Blocked</Badge>}
                  {u.isBlacklisted && <Badge tone="warn">Blacklisted</Badge>}
                </td>
                <td className="p-3 tabular-nums">{when(u.lastLogin)}</td>
                <td className="p-3 tabular-nums">{when(u.createdAt)}</td>
                <td className="space-x-2 whitespace-nowrap p-3 text-right">
                  {u.isVerified ? (
                    <button disabled={busy} onClick={() => single(u, "unverify")} className={`${btn} border-stone-300 hover:bg-stone-100`}>Unverify</button>
                  ) : (
                    <button disabled={busy} onClick={() => single(u, "verify")} className={`${btn} border-teal-300 text-teal-800 hover:bg-teal-50`}>Verify</button>
                  )}
                  {u.isBlocked ? (
                    <button disabled={busy} onClick={() => single(u, "unblock")} className={`${btn} border-stone-300 hover:bg-stone-100`}>Unblock</button>
                  ) : (
                    <button disabled={busy} onClick={() => askBlock([u._id], displayName(u))} className={`${btn} border-red-300 text-red-800 hover:bg-red-50`}>Block</button>
                  )}
                </td>
              </tr>
            ))}
            {!loading && list.users.length === 0 && (
              <tr>
                <td colSpan={7} className="p-8 text-center text-stone-500">No accounts match these filters. Clear a filter or change the search.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex items-center justify-between text-sm">
        <button disabled={filters.page <= 1} onClick={() => change({ page: filters.page - 1 })} className={`${btn} border-stone-300`}>Previous</button>
        <span className="text-stone-600">Page {list.page || 1} of {list.pages}</span>
        <button disabled={filters.page >= list.pages} onClick={() => change({ page: filters.page + 1 })} className={`${btn} border-stone-300`}>Next</button>
      </div>

      {blockDialog && <BlockDialog dialog={blockDialog} onCancel={() => setBlockDialog(null)} onConfirm={confirmBlock} />}
    </div>
  );
}

function BlockDialog({ dialog, onCancel, onConfirm }) {
  const [reason, setReason] = useState("");
  const [takeJobsOffline, setTakeJobsOffline] = useState(true);
  const ref = useRef(null);

  useEffect(() => {
    ref.current?.focus();
    const onKey = (e) => e.key === "Escape" && onCancel();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  const valid = reason.trim().length >= 3;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/40 p-4" onMouseDown={onCancel}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="block-title"
        onMouseDown={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded bg-white p-5"
      >
        <h2 id="block-title" className="text-lg font-semibold text-stone-900">Block {dialog.name}?</h2>
        <p className="mt-1 text-sm text-stone-600">They won't be able to log in until someone unblocks them.</p>

        <label className="mt-4 block text-sm font-medium text-stone-800">
          Reason
          <textarea
            ref={ref}
            rows={3}
            maxLength={500}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="mt-1 w-full rounded border border-stone-300 p-2 text-sm font-normal focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-700"
          />
        </label>

        {dialog.hasEmployer && (
          <label className="mt-3 flex items-start gap-2 text-sm text-stone-700">
            <input type="checkbox" className="mt-1" checked={takeJobsOffline} onChange={(e) => setTakeJobsOffline(e.target.checked)} />
            Take blocked employers' live jobs offline
          </label>
        )}

        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onCancel} className="rounded border border-stone-300 px-3 py-1.5 text-sm hover:bg-stone-100">Cancel</button>
          <button
            disabled={!valid}
            onClick={() => onConfirm({ reason: reason.trim(), takeJobsOffline: dialog.hasEmployer && takeJobsOffline })}
            className="rounded bg-red-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-800 disabled:opacity-50"
          >
            Block account
          </button>
        </div>
      </div>
    </div>
  );
}