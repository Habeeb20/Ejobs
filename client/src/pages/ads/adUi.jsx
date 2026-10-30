import { Loader2 } from "lucide-react";

export const PLACEMENT_LABEL = {
  dashboard: "Dashboard",
  public: "Public job board",
};

// 3000 -> "₦3,000"
export const naira = (amount) =>
  `₦${Number(amount || 0).toLocaleString("en-NG")}`;

// "2026-10-30T..." -> "30 Oct 2026"
export const fmtDate = (value) => {
  if (!value) return "";
  const d = new Date(value);
  if (isNaN(d)) return "";
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
};

// Turns any error into a message string. Pass your api.js getError helper as the second argument.
export const errText = (err, getError) => {
  try {
    const msg = typeof getError === "function" ? getError(err) : null;
    if (msg && typeof msg === "string") return msg;
  } catch {
    /* fall through */
  }
  return (
    err?.response?.data?.message ||
    err?.message ||
    "Something went wrong. Please try again."
  );
};

export function Spinner({ label = "Loading…" }) {
  return (
    <div role="status" aria-live="polite" className="flex items-center justify-center gap-2 rounded-2xl bg-white p-10 text-slate-500 shadow-sm">
      <Loader2 size={20} className="animate-spin" />
      <span className="text-sm font-medium">{label}</span>
    </div>
  );
}

const STYLES = {
  Draft: "bg-slate-100 text-slate-700",
  Pending: "bg-amber-100 text-amber-800",
  Live: "bg-emerald-100 text-emerald-800",
  Scheduled: "bg-sky-100 text-sky-800",
  Rejected: "bg-red-100 text-red-700",
  Paused: "bg-orange-100 text-orange-800",
  Expired: "bg-slate-200 text-slate-600",
};

// Works out the label from the ad's status plus isLive / isScheduled
export function StatusBadge({ ad }) {
  let key = ad?.status || "Draft";
  let label = key;

  if (key === "Approved") {
    if (ad.isScheduled) { key = "Scheduled"; label = "Scheduled"; }
    else { key = "Live"; label = "Live"; }
  } else if (key === "Pending") {
    label = "In review";
  }

  return (
    <span className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-xs font-semibold ${STYLES[key] || STYLES.Draft}`}>
      {label}
    </span>
  );
}