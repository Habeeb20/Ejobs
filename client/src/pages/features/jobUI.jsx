import { useEffect, useState } from "react";
import { Loader2, Lock } from "lucide-react";

export const naira = (n) => (n === 0 ? "Free" : `₦${Number(n).toLocaleString("en-NG")}`);

const PLAN_STYLE = {
  Basic: "bg-slate-100 text-slate-700",
  Standard: "bg-sky-100 text-sky-700",
  Premium: "bg-orange-100 text-orange-700",
};
const STATUS_STYLE = {
  Draft: "bg-slate-100 text-slate-600",
  "Awaiting Approval": "bg-amber-100 text-amber-700",
  Online: "bg-emerald-100 text-emerald-700",
  Offline: "bg-slate-200 text-slate-600",
  Rejected: "bg-red-100 text-red-700",
};

export const PlanBadge = ({ type }) => (
  <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${PLAN_STYLE[type] || PLAN_STYLE.Basic}`}>
    {type}
  </span>
);
export const StatusBadge = ({ status }) => (
  <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLE[status] || STATUS_STYLE.Draft}`}>
    {status}
  </span>
);

export const Spinner = ({ label = "Loading…" }) => (
  <div className="flex items-center justify-center gap-3 py-16 text-slate-500">
    <Loader2 className="animate-spin text-orange-600" size={22} /> {label}
  </div>
);

export const LockedNotice = ({ title, text }) => (
  <div className="flex flex-col items-center rounded-2xl border border-dashed border-orange-300 bg-orange-50 px-6 py-12 text-center">
    <span className="mb-3 grid h-12 w-12 place-items-center rounded-full bg-orange-100 text-orange-600">
      <Lock size={22} />
    </span>
    <h3 className="text-lg font-bold">{title}</h3>
    <p className="mt-1 max-w-md text-sm text-slate-600">{text}</p>
  </div>
);

export const useNow = (ms = 30000) => {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(t);
  }, [ms]);
  return now;
};

export const timeLeft = (expiry, now = Date.now()) => {
  const diff = new Date(expiry).getTime() - now;
  if (!expiry || diff <= 0) return "Expired";
  const d = Math.floor(diff / 864e5);
  const h = Math.floor((diff % 864e5) / 36e5);
  const m = Math.floor((diff % 36e5) / 6e4);
  return d > 0 ? `${d}d ${h}h left` : h > 0 ? `${h}h ${m}m left` : `${m}m left`;
};

// Works for axios errors and plain Errors
export const errText = (err, getError) => (err?.response ? getError(err) : err?.message || "Something went wrong");



export const timeAgo = (date) => {
  const mins = Math.floor((Date.now() - new Date(date).getTime()) / 6e4);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return days < 30
    ? `${days}d ago`
    : new Date(date).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" });
};