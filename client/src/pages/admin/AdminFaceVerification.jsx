import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Search, X, CheckCircle2, XCircle, Clock, ChevronLeft, ChevronRight, Loader2, UserRound } from "lucide-react";

/**
 * Admin page for reviewing face verifications.
 * Env: VITE_BACKEND_URL (no trailing slash, no /api). Auth: localStorage "token".
 * Uses: GET /api/admin/face-verifications, GET /:id, PUT /:id/review
 */

const BASE = `${import.meta.env.VITE_BACKEND}/api/admin/face-verifications`;

const authHeaders = () => {
  const token = localStorage.getItem("token") || localStorage.getItem("adminToken");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

async function api(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: { "Content-Type": "application/json", ...authHeaders(), ...(options.headers || {}) },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.message || "Request failed");
  return data;
}

const STEP_LABEL = { blink: "Blink", mouth: "Open mouth", right: "Turn right", left: "Turn left" };

const STATUS_STYLE = {
  pending: "bg-amber-50 text-amber-700 ring-amber-200",
  approved: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  rejected: "bg-red-50 text-red-700 ring-red-200",
};

const TABS = [
  { key: "", label: "All" },
  { key: "pending", label: "Pending" },
  { key: "approved", label: "Approved" },
  { key: "rejected", label: "Rejected" },
];

const fullName = (u) => [u?.firstName, u?.lastName].filter(Boolean).join(" ") || "Unknown user";
const fmt = (d) => (d ? new Date(d).toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" }) : "—");
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString("en-NG", { dateStyle: "medium" }) : "—");

function StatusBadge({ status }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ring-1 ring-inset ${STATUS_STYLE[status]}`}>
      {status}
    </span>
  );
}

function Avatar({ user, size = "h-9 w-9" }) {
  return user?.profilePicture ? (
    <img src={user.profilePicture} alt="" className={`${size} rounded-full object-cover`} />
  ) : (
    <span className={`${size} flex items-center justify-center rounded-full bg-gray-200 text-gray-500`}>
      <UserRound className="h-4 w-4" />
    </span>
  );
}

/* ----------------------------- Detail drawer ----------------------------- */

function DetailDrawer({ id, onClose, onReviewed }) {
  const [record, setRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [zoom, setZoom] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api(`${BASE}/${id}`)
      .then((d) => !cancelled && setRecord(d.data))
      .catch((e) => {
        toast.error(e.message);
        onClose();
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && (zoom ? setZoom(null) : onClose());
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [zoom, onClose]);

  const review = async (status) => {
    if (status === "rejected" && !reason.trim()) {
      toast.error("Enter a reason for rejecting");
      return;
    }
    setSubmitting(true);
    try {
      const d = await api(`${BASE}/${id}/review`, {
        method: "PUT",
        body: JSON.stringify({ status, reason: reason.trim() }),
      });
      setRecord(d.data);
      setRejecting(false);
      setReason("");
      toast.success(d.message);
      onReviewed();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const u = record?.user;
  const blocked = u?.isBlocked && u.isBlocked !== "false";

  const details = u
    ? [
        ["Username", u.username],
        ["Email", u.email],
        ["Phone", u.phoneNumber],
        ["Alternate contact", u.alternateContact],
        ["Role", u.role],
        ["State / LGA", [u.state, u.lga].filter(Boolean).join(" / ")],
        ["Date of birth", fmtDate(u.dateOfBirth)],
        ["Joined", fmtDate(u.createdAt)],
        ["ID verified", u.identityVerification?.approved ? "Yes" : "No"],
      ]
    : [];

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-black/40" onClick={onClose}>
      <aside
        className="flex h-full w-full max-w-xl flex-col overflow-y-auto bg-gray-50 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Face verification details"
      >
        <header className="flex items-center justify-between border-b border-gray-200 bg-white px-5 py-4">
          <h2 className="text-lg font-semibold text-gray-900">Face verification</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </header>

        {loading || !record ? (
          <div className="flex flex-1 items-center justify-center text-gray-500">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : (
          <div className="space-y-5 p-5">
            {/* User */}
            <section className="rounded-2xl border border-gray-200 bg-white p-4">
              <div className="flex items-center gap-3">
                <Avatar user={u} size="h-12 w-12" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-gray-900">{fullName(u)}</p>
                  <p className="truncate text-sm text-gray-500">{u?.email || u?.phoneNumber || "—"}</p>
                </div>
                <StatusBadge status={record.status} />
              </div>

              {(blocked || u?.isBlacklisted) && (
                <div className="mt-3 flex gap-2">
                  {blocked && <span className="rounded-md bg-red-50 px-2 py-0.5 text-xs text-red-700 ring-1 ring-inset ring-red-200">Blocked</span>}
                  {u?.isBlacklisted && <span className="rounded-md bg-red-50 px-2 py-0.5 text-xs text-red-700 ring-1 ring-inset ring-red-200">Blacklisted</span>}
                </div>
              )}

              <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                {details.map(([k, v]) => (
                  <div key={k}>
                    <dt className="text-gray-500">{k}</dt>
                    <dd className="mt-0.5 break-words font-medium text-gray-900">{v || "—"}</dd>
                  </div>
                ))}
              </dl>
            </section>

            {/* Captures */}
            <section className="rounded-2xl border border-gray-200 bg-white p-4">
              <h3 className="font-medium text-gray-900">Captured actions</h3>
              <p className="mt-0.5 text-xs text-gray-500">Submitted {fmt(record.submittedAt)}. Click an image to enlarge.</p>
              <div className="mt-3 grid grid-cols-2 gap-3">
                {record.actions.map((a) => (
                  <figure key={a.step}>
                    <button onClick={() => setZoom(a)} className="block w-full overflow-hidden rounded-xl bg-gray-100">
                      <img src={a.url} alt={STEP_LABEL[a.step]} className="aspect-[4/3] w-full object-cover" loading="lazy" />
                    </button>
                    <figcaption className="mt-1 text-center text-sm text-gray-700">{STEP_LABEL[a.step]}</figcaption>
                  </figure>
                ))}
              </div>
            </section>

            {/* Previous review */}
            {record.reviewedAt && (
              <section className="rounded-2xl border border-gray-200 bg-white p-4 text-sm">
                <p className="text-gray-700">
                  <span className="font-medium capitalize">{record.status}</span> by{" "}
                  {record.reviewedBy ? fullName(record.reviewedBy) : "an admin"} on {fmt(record.reviewedAt)}
                </p>
                {record.status === "rejected" && record.rejectionReason && (
                  <p className="mt-2 rounded-lg bg-red-50 p-3 text-red-700">Reason: {record.rejectionReason}</p>
                )}
              </section>
            )}

            {/* Actions */}
            <section className="rounded-2xl border border-gray-200 bg-white p-4">
              {rejecting ? (
                <div>
                  <label htmlFor="reason" className="text-sm font-medium text-gray-900">
                    Why is this being rejected?
                  </label>
                  <textarea
                    id="reason"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    maxLength={500}
                    rows={3}
                    placeholder="e.g. Face is not clearly visible in the “Turn left” capture"
                    className="mt-2 w-full rounded-xl border border-gray-300 p-3 text-sm focus:border-gray-900 focus:outline-none"
                  />
                  <p className="mt-1 text-xs text-gray-500">The user will see this reason. {reason.length}/500</p>
                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={() => review("rejected")}
                      disabled={submitting}
                      className="flex-1 rounded-xl bg-red-600 py-2.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60"
                    >
                      {submitting ? "Rejecting…" : "Confirm rejection"}
                    </button>
                    <button
                      onClick={() => {
                        setRejecting(false);
                        setReason("");
                      }}
                      disabled={submitting}
                      className="rounded-xl border border-gray-300 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={() => review("approved")}
                    disabled={submitting || record.status === "approved"}
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    {submitting ? "Saving…" : "Approve"}
                  </button>
                  <button
                    onClick={() => setRejecting(true)}
                    disabled={submitting || record.status === "rejected"}
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-red-200 bg-white py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <XCircle className="h-4 w-4" />
                    Reject
                  </button>
                </div>
              )}
            </section>
          </div>
        )}
      </aside>

      {zoom && (
        <div
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/85 p-4"
          onClick={(e) => {
            e.stopPropagation();
            setZoom(null);
          }}
        >
          <img src={zoom.url} alt={STEP_LABEL[zoom.step]} className="max-h-[85vh] max-w-full rounded-xl" />
          <p className="mt-3 text-sm text-white">{STEP_LABEL[zoom.step]}</p>
        </div>
      )}
    </div>
  );
}

/* --------------------------------- Page --------------------------------- */

export default function AdminFaceVerifications() {
  const [status, setStatus] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [items, setItems] = useState([]);
  const [counts, setCounts] = useState({ all: 0, pending: 0, approved: 0, rejected: 0 });
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState(null);

  // Debounce the search box
  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 15 });
      if (status) params.set("status", status);
      if (search) params.set("search", search);
      const d = await api(`${BASE}?${params}`);
      setItems(d.data);
      setCounts(d.counts);
      setPagination(d.pagination);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }, [status, search, page]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="mx-auto max-w-6xl">
        <h1 className="text-2xl font-semibold text-gray-900">Face verifications</h1>
        <p className="mt-1 text-sm text-gray-500">Review each user’s liveness captures and approve or reject them.</p>

        {/* Filters */}
        <div className="mt-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap gap-2">
            {TABS.map((t) => {
              const active = status === t.key;
              const count = t.key ? counts[t.key] : counts.all;
              return (
                <button
                  key={t.key || "all"}
                  onClick={() => {
                    setStatus(t.key);
                    setPage(1);
                  }}
                  className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
                    active ? "bg-gray-900 text-white" : "bg-white text-gray-700 ring-1 ring-inset ring-gray-200 hover:bg-gray-100"
                  }`}
                >
                  {t.label} <span className={active ? "text-gray-300" : "text-gray-400"}>{count}</span>
                </button>
              );
            })}
          </div>

          <div className="relative w-full md:w-72">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search name, email, phone"
              className="w-full rounded-xl border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm focus:border-gray-900 focus:outline-none"
            />
          </div>
        </div>

        {/* Table */}
        <div className="mt-4 overflow-x-auto rounded-2xl border border-gray-200 bg-white">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-gray-500">
              <tr>
                <th className="px-4 py-3 font-medium">User</th>
                <th className="px-4 py-3 font-medium">Contact</th>
                <th className="px-4 py-3 font-medium">Submitted</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-gray-500">
                    <Loader2 className="mx-auto h-5 w-5 animate-spin" />
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-gray-500">
                    {search || status ? "No verifications match these filters." : "No face verifications have been submitted yet."}
                  </td>
                </tr>
              ) : (
                items.map((v) => (
                  <tr key={v._id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar user={v.user} />
                        <div className="min-w-0">
                          <p className="truncate font-medium text-gray-900">{fullName(v.user)}</p>
                          <p className="truncate text-xs text-gray-500">@{v.user?.username || "—"}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      <p className="truncate">{v.user?.email || "—"}</p>
                      <p className="text-xs text-gray-400">{v.user?.phoneNumber || ""}</p>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-gray-600">
                      <span className="inline-flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5 text-gray-400" />
                        {fmt(v.submittedAt)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={v.status} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => setSelectedId(v._id)}
                        className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100"
                      >
                        Review
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="mt-4 flex items-center justify-between text-sm text-gray-600">
            <span>
              Page {pagination.page} of {pagination.pages} · {pagination.total} total
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(p - 1, 1))}
                disabled={page <= 1}
                className="rounded-lg border border-gray-200 bg-white p-2 hover:bg-gray-100 disabled:opacity-40"
                aria-label="Previous page"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={() => setPage((p) => Math.min(p + 1, pagination.pages))}
                disabled={page >= pagination.pages}
                className="rounded-lg border border-gray-200 bg-white p-2 hover:bg-gray-100 disabled:opacity-40"
                aria-label="Next page"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {selectedId && <DetailDrawer id={selectedId} onClose={() => setSelectedId(null)} onReviewed={load} />}
    </div>
  );
}