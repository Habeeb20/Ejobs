// src/components/recruitment/ui.jsx
import { useEffect } from "react";
import { X, Loader2, Inbox, AlertCircle, CheckCircle2 } from "lucide-react";

/* ---------- formatting ---------- */
export const money = (n, currency = "NGN") =>
  new Intl.NumberFormat("en-NG", { style: "currency", currency, maximumFractionDigits: 0 }).format(Number(n) || 0);

export const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" }) : "Not set";

export const fmtDateTime = (d) =>
  d ? new Date(d).toLocaleString("en-NG", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" }) : "Not set";

export const humanize = (s = "") =>
  String(s).replace(/_/g, " ").replace(/([a-z])([A-Z])/g, "$1 $2").toLowerCase().replace(/^./, (c) => c.toUpperCase());

export const apiError = (e) => e?.response?.data?.message || e?.message || "Something went wrong. Please try again.";

export const personName = (u) => [u?.firstName, u?.lastName].filter(Boolean).join(" ") || u?.companyName || u?.email || "Unknown";

export const planPrice = (plan) => {
  const p = plan?.pricing || {};
  if (!plan?.priced) return null;
  return p.model === "percent" ? `${p.percent}% of annual salary` : money(p.amount);
};

/* ---------- styles ---------- */
export const inputCls =
  "w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-200 disabled:bg-gray-50";
const btnBase =
  "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50";
export const btnPrimary = `${btnBase} bg-orange-600 text-white hover:bg-orange-700 focus-visible:outline-orange-600`;
export const btnGhost = `${btnBase} border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 focus-visible:outline-gray-400`;
export const btnDanger = `${btnBase} bg-red-600 text-white hover:bg-red-700 focus-visible:outline-red-600`;
export const btnSmall = "!px-3 !py-1.5 !text-xs";

const TONES = {
  gray: "bg-gray-100 text-gray-700",
  orange: "bg-orange-100 text-orange-800",
  green: "bg-green-100 text-green-800",
  red: "bg-red-100 text-red-800",
  blue: "bg-blue-100 text-blue-800",
  amber: "bg-amber-100 text-amber-800",
};

export const STATUS_TONE = {
  AwaitingPayment: "amber", Active: "green", Suspended: "gray", Completed: "blue", Cancelled: "red",
  Pending: "amber", Paid: "green", Failed: "red",
  Passed: "green", InProgress: "blue", NotApplicable: "gray",
  Sourced: "gray", Screened: "gray", Shortlisted: "gray", Submitted: "orange", Interviewing: "blue", Offered: "amber",
  Hired: "green", Rejected: "red", Withdrawn: "gray", Replaced: "gray",
  AwaitingApproval: "amber", Declined: "red", Approved: "green", Fulfilled: "blue", Scheduled: "blue",
};

export function Badge({ tone, status, children }) {
  const t = tone || STATUS_TONE[status] || "gray";
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${TONES[t]}`}>
      {children ?? humanize(status)}
    </span>
  );
}

/* ---------- layout ---------- */
export function PageHeader({ title, subtitle, actions }) {
  return (
    <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 max-w-2xl text-sm text-gray-600 sm:text-base">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Panel({ title, action, children, className = "" }) {
  return (
    <section className={`rounded-xl border border-gray-200 bg-white ${className}`}>
      {(title || action) && (
        <div className="flex items-center justify-between gap-3 border-b border-gray-100 px-5 py-3.5">
          <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
          {action}
        </div>
      )}
      <div className="p-5">{children}</div>
    </section>
  );
}

export function Tabs({ tabs, value, onChange }) {
  return (
    <div className="mb-6 overflow-x-auto border-b border-gray-200" role="tablist">
      <div className="flex min-w-max gap-1">
        {tabs.map((t) => (
          <button
            key={t.key} role="tab" aria-selected={value === t.key} onClick={() => onChange(t.key)}
            className={`-mb-px flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition ${
              value === t.key ? "border-orange-600 text-orange-700" : "border-transparent text-gray-500 hover:text-gray-800"
            }`}
          >
            {t.label}
            {t.count > 0 && <span className="rounded-full bg-orange-100 px-1.5 text-xs font-semibold text-orange-700">{t.count}</span>}
          </button>
        ))}
      </div>
    </div>
  );
}

export function Field({ label, hint, error, children, className = "" }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 block text-sm font-medium text-gray-800">{label}</span>
      {children}
      {hint && !error && <span className="mt-1 block text-xs text-gray-500">{hint}</span>}
      {error && <span className="mt-1 block text-xs text-red-600">{error}</span>}
    </label>
  );
}

export function Notice({ tone = "info", children }) {
  const styles = {
    info: "border-blue-200 bg-blue-50 text-blue-900",
    warn: "border-amber-200 bg-amber-50 text-amber-900",
    error: "border-red-200 bg-red-50 text-red-800",
    success: "border-green-200 bg-green-50 text-green-900",
  };
  const Icon = tone === "success" ? CheckCircle2 : AlertCircle;
  return (
    <div role={tone === "error" ? "alert" : undefined} className={`flex gap-3 rounded-lg border px-4 py-3 text-sm ${styles[tone]}`}>
      <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <div className="min-w-0">{children}</div>
    </div>
  );
}

export function Spinner({ label = "Loading" }) {
  return (
    <div className="flex items-center justify-center gap-2 py-16 text-sm text-gray-500" role="status">
      <Loader2 className="h-5 w-5 animate-spin text-orange-600" aria-hidden /> {label}
    </div>
  );
}

export function Empty({ title, text, action }) {
  return (
    <div className="flex flex-col items-center rounded-xl border border-dashed border-gray-300 px-6 py-12 text-center">
      <Inbox className="mb-3 h-8 w-8 text-gray-400" aria-hidden />
      <p className="font-semibold text-gray-900">{title}</p>
      {text && <p className="mt-1 max-w-md text-sm text-gray-600">{text}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Modal({ open, title, onClose, children, footer, wide = false }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === "Escape" && onClose?.();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = prev; };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}>
      <div role="dialog" aria-modal="true" aria-label={title}
        className={`flex max-h-[92vh] w-full flex-col rounded-t-2xl bg-white shadow-xl sm:rounded-2xl ${wide ? "sm:max-w-3xl" : "sm:max-w-lg"}`}>
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <h2 className="text-base font-semibold text-gray-900">{title}</h2>
          <button onClick={onClose} aria-label="Close" className="rounded-md p-1 text-gray-500 hover:bg-gray-100"><X className="h-5 w-5" /></button>
        </div>
        <div className="space-y-4 overflow-y-auto px-5 py-5">{children}</div>
        {footer && <div className="flex flex-wrap justify-end gap-2 border-t border-gray-100 px-5 py-4">{footer}</div>}
      </div>
    </div>
  );
}

/** Renders the policy blocks coming from config/recruitmentPlans.js */
export function PolicyBody({ policy }) {
  return (
    <div className="space-y-3 text-sm leading-relaxed text-gray-700">
      {policy.intro && <p>{policy.intro}</p>}
      {policy.paragraphs?.map((p, i) => <p key={i}>{p}</p>)}
      {policy.items && <ul className="list-disc space-y-1.5 pl-5">{policy.items.map((it, i) => <li key={i}>{it}</li>)}</ul>}
      {policy.sections?.map((s) => (
        <div key={s.heading}>
          <p className="mb-1 font-medium text-gray-900">{s.heading}</p>
          <ul className="list-disc space-y-1.5 pl-5">{s.items.map((it, i) => <li key={i}>{it}</li>)}</ul>
        </div>
      ))}
      {policy.outro && <p>{policy.outro}</p>}
    </div>
  );
}