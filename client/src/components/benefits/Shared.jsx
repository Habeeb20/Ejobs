import { CheckCircle2, Loader2, XCircle } from "lucide-react";

/* ---------- formatting ---------- */
export const naira = (n) => `₦${Number(n || 0).toLocaleString("en-NG")}`;

export const fmtDate = (d, withTime = false) =>
  d
    ? new Date(d).toLocaleString("en-NG", withTime ? { dateStyle: "medium", timeStyle: "short" } : { dateStyle: "medium" })
    : "—";

export const daysUntil = (d) => (d ? Math.ceil((new Date(d) - Date.now()) / 86400000) : null);

export const fullName = (u) => [u?.firstName, u?.lastName].filter(Boolean).join(" ") || "Unnamed";

export const PERIODS = [
  { id: "daily", label: "Daily" },
  { id: "weekly", label: "Weekly" },
  { id: "monthly", label: "Monthly" },
  { id: "quarterly", label: "Quarterly" },
  { id: "half_year", label: "Half year" },
  { id: "yearly", label: "Yearly" },
];

export const CATEGORY_LABELS = {
  medical: "Medical",
  education: "Education",
  housing: "Housing",
  emergency: "Emergency",
  business: "Business",
  other: "Other",
};

/* ---------- class names ---------- */
export const inputCls =
  "w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-slate-400 focus:border-primary-500 focus:ring-4 focus:ring-primary-500/20";

export const primaryBtn =
  "inline-flex items-center justify-center gap-2 rounded-lg bg-primary-500 px-4 py-2.5 text-sm font-semibold text-slate-900 shadow-sm transition hover:bg-primary-600 focus:outline-none focus-visible:ring-4 focus-visible:ring-primary-500/30 disabled:cursor-not-allowed disabled:opacity-60";

export const ghostBtn =
  "inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus:outline-none focus-visible:ring-4 focus-visible:ring-slate-300/50 disabled:cursor-not-allowed disabled:opacity-60";

export const dangerBtn =
  "inline-flex items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 focus:outline-none focus-visible:ring-4 focus-visible:ring-red-500/30 disabled:cursor-not-allowed disabled:opacity-60";

/* ---------- small components ---------- */
const STATUS_STYLES = {
  pending: "bg-amber-50 text-amber-800 ring-amber-200",
  approved: "bg-sky-50 text-sky-800 ring-sky-200",
  paid: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  rejected: "bg-red-50 text-red-700 ring-red-200",
};

export const StatusBadge = ({ status }) => (
  <span
    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ring-1 ring-inset ${
      STATUS_STYLES[status] || "bg-slate-100 text-slate-700 ring-slate-200"
    }`}
  >
    {status}
  </span>
);

export const Card = ({ title, action, className = "", children }) => (
  <section className={`rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 ${className}`}>
    {(title || action) && (
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        {title && <h2 className="font-display text-base font-semibold text-slate-900">{title}</h2>}
        {action}
      </div>
    )}
    {children}
  </section>
);

export const StatCard = ({ label, value, hint, accent = false }) => (
  <div
    className={`rounded-2xl border p-5 ${
      accent ? "border-primary-200 bg-primary-50" : "border-slate-200 bg-white"
    }`}
  >
    <p className="text-sm text-slate-500">{label}</p>
    <p className="mt-1 font-display text-2xl font-bold tracking-tight text-slate-900">{value}</p>
    {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
  </div>
);

export const Spinner = ({ label = "Loading…" }) => (
  <div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-500" role="status">
    <Loader2 className="h-4 w-4 animate-spin text-primary-600" /> {label}
  </div>
);

export const EmptyState = ({ title, text, action }) => (
  <div className="rounded-xl border border-dashed border-slate-300 px-6 py-10 text-center">
    <p className="font-semibold text-slate-900">{title}</p>
    {text && <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">{text}</p>}
    {action && <div className="mt-4">{action}</div>}
  </div>
);

export const PageHeader = ({ title, text, action }) => (
  <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
    <div>
      <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">{title}</h1>
      {text && <p className="mt-1 text-sm text-slate-500">{text}</p>}
    </div>
    {action}
  </div>
);

export const PeriodTabs = ({ value, onChange }) => (
  <div role="tablist" aria-label="Period" className="flex flex-wrap gap-1 rounded-xl bg-slate-100 p-1">
    {PERIODS.map((p) => (
      <button
        key={p.id}
        role="tab"
        type="button"
        aria-selected={value === p.id}
        onClick={() => onChange(p.id)}
        className={`rounded-lg px-3 py-1.5 text-sm font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 ${
          value === p.id ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
        }`}
      >
        {p.label}
      </button>
    ))}
  </div>
);

/** Bars for a payment series: [{ key, label, amount, count }] */
export function PaymentChart({ series = [] }) {
  const max = Math.max(...series.map((s) => s.amount), 1);
  const nothing = series.every((s) => s.amount === 0);
  const labelEvery = Math.ceil(series.length / 8);

  return (
    <div>
      <div className="overflow-x-auto pt-8">
        <div style={{ minWidth: series.length * 28 }}>
          <div className="flex h-48 items-end gap-1.5 border-b border-slate-200" role="img" aria-label="Benefit payments over time">
            {series.map((s) => (
              <div key={s.key} className="group relative flex h-full flex-1 flex-col justify-end">
                <div
                  className="rounded-t bg-primary-400 transition-colors group-hover:bg-primary-600"
                  style={{ height: `${s.amount ? Math.max((s.amount / max) * 100, 3) : 0}%` }}
                />
                <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 hidden -translate-x-1/2 whitespace-nowrap rounded-md bg-slate-900 px-2 py-1 text-xs text-white group-hover:block">
                  {s.label}: {naira(s.amount)} · {s.count} paid
                </div>
              </div>
            ))}
          </div>
          <div className="mt-2 flex gap-1.5">
            {series.map((s, i) => (
              <span key={s.key} className="flex-1 truncate text-center text-[11px] text-slate-500">
                {i % labelEvery === 0 ? s.label : ""}
              </span>
            ))}
          </div>
        </div>
      </div>
      {nothing && <p className="mt-3 text-center text-sm text-slate-500">No payments in this period yet.</p>}
    </div>
  );
}

/** Horizontal bars: rows = [{ label, value, note }] */
export function BreakdownBars({ rows = [] }) {
  const max = Math.max(...rows.map((r) => r.value), 1);
  if (!rows.length) return <p className="text-sm text-slate-500">Nothing to show yet.</p>;
  return (
    <ul className="space-y-3">
      {rows.map((r) => (
        <li key={r.label}>
          <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
            <span className="font-medium capitalize text-slate-800">{r.label}</span>
            <span className="text-slate-500">{r.note}</span>
          </div>
          <div className="h-2 rounded-full bg-slate-100">
            <div className="h-2 rounded-full bg-primary-400" style={{ width: `${(r.value / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

/** Requirement checklist: [{ key, label, met }] */
export const Checklist = ({ items = [] }) => (
  <ul className="divide-y divide-slate-100">
    {items.map((r) => (
      <li key={r.key} className="flex items-center gap-3 py-2.5 text-sm">
        {r.met ? (
          <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" aria-hidden="true" />
        ) : (
          <XCircle className="h-5 w-5 shrink-0 text-red-500" aria-hidden="true" />
        )}
        <span className="text-slate-800">{r.label}</span>
        <span className={`ml-auto text-xs font-medium ${r.met ? "text-emerald-700" : "text-red-600"}`}>
          {r.met ? "Done" : "Missing"}
        </span>
      </li>
    ))}
  </ul>
);