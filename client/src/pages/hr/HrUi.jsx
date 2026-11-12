import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, X, Upload, FileText } from "lucide-react";
import { toast } from "sonner";
import { getError } from "../../api";
import { uploadToCloudinary } from "../../utils/cloudinary";

/* ---------- formatting ---------- */
export const money = (n, cur = "NGN") => `${cur === "NGN" ? "₦" : cur + " "}${Number(n || 0).toLocaleString("en-NG", { maximumFractionDigits: 2 })}`;
export const fmtDate = (d) => (d ? new Date(d).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric", timeZone: "Africa/Lagos" }) : "-");
export const fmtTime = (d) => (d ? new Date(d).toLocaleTimeString("en-NG", { hour: "2-digit", minute: "2-digit", timeZone: "Africa/Lagos" }) : "-");
export const fmtDateTime = (d) => (d ? `${fmtDate(d)}, ${fmtTime(d)}` : "-");
export const monthLabel = (m) => new Date(`${m}-15T12:00:00Z`).toLocaleDateString("en-NG", { month: "long", year: "numeric", timeZone: "UTC" });
export const thisMonth = () => new Date().toLocaleDateString("en-CA", { timeZone: "Africa/Lagos" }).slice(0, 7);
export const today = () => new Date().toLocaleDateString("en-CA", { timeZone: "Africa/Lagos" });
export const iso = (d) => (d ? new Date(d).toISOString().slice(0, 10) : "");
export const fullName = (e) => [e?.firstName, e?.middleName, e?.lastName].filter(Boolean).join(" ");
export const ago = (d) => {
  const m = Math.floor((Date.now() - new Date(d).getTime()) / 6e4);
  if (m < 1) return "just now"; if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60); if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24); return days < 30 ? `${days}d ago` : fmtDate(d);
};
export const tenure = (from, to = new Date()) => {
  const months = Math.max(0, (new Date(to).getFullYear() - new Date(from).getFullYear()) * 12 + new Date(to).getMonth() - new Date(from).getMonth());
  const y = Math.floor(months / 12), m = months % 12;
  return [y && `${y} yr${y > 1 ? "s" : ""}`, m && `${m} mo`].filter(Boolean).join(" ") || "New";
};
export const toastErr = (e) => toast.error(e?.response ? getError(e) : e?.message || "Something went wrong");
export const csv = (name, rows) => {
  const esc = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const blob = new Blob([rows.map((r) => r.map(esc).join(",")).join("\n")], { type: "text/csv" });
  const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(blob), download: name });
  a.click(); URL.revokeObjectURL(a.href);
};

/* ---------- hooks ---------- */
// Loads data, with loading/error state and a reload() that refreshes quietly (no spinner flash)
export function useAsync(fn, deps = []) {
  const [state, setState] = useState({ data: null, loading: true, error: "" });
  const run = useCallback(async (silent) => {
    if (!silent) setState((s) => ({ ...s, loading: true, error: "" }));
    try { const r = await fn(); setState({ data: r.data, loading: false, error: "" }); }
    catch (e) { setState((s) => ({ ...s, loading: false, error: e?.response ? getError(e) : e.message })); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  useEffect(() => { run(); }, [run]);
  return { ...state, reload: () => run(true), setData: (d) => setState((s) => ({ ...s, data: d })) };
}

// Runs handler whenever a live HR event of these types arrives (leave, payroll, message ...)
export function useHrEvents(types, handler) {
  const ref = useRef(handler);
  ref.current = handler;
  const key = (types || []).join(",");
  useEffect(() => {
    const on = (e) => { if (!types || types.includes(e.detail?.type)) ref.current(e.detail); };
    window.addEventListener("hr:event", on);
    return () => window.removeEventListener("hr:event", on);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
}

/* ---------- building blocks ---------- */
export const inputCls = "w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-orange-600 disabled:bg-slate-50";

export const Field = ({ label, hint, error, children, className = "" }) => (
  <label className={`block ${className}`}>
    <span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>
    {children}
    {hint && !error && <span className="mt-1 block text-xs text-slate-500">{hint}</span>}
    {error && <span className="mt-1 block text-xs text-red-600">{error}</span>}
  </label>
);

const BTN = {
  primary: "bg-orange-600 text-white hover:bg-orange-700", dark: "bg-slate-900 text-white hover:bg-slate-700",
  outline: "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50", danger: "bg-red-600 text-white hover:bg-red-700",
  ghost: "text-slate-600 hover:bg-slate-100", success: "bg-emerald-600 text-white hover:bg-emerald-700",
  soft: "bg-orange-50 text-orange-700 hover:bg-orange-100",
};
export const Btn = ({ variant = "primary", loading, className = "", children, disabled, ...p }) => (
  <button {...p} disabled={disabled || loading}
    className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition disabled:opacity-60 ${BTN[variant]} ${className}`}>
    {loading && <Loader2 size={15} className="animate-spin" />}{children}
  </button>
);

const TONE = {
  slate: "bg-slate-100 text-slate-700", green: "bg-emerald-100 text-emerald-700", amber: "bg-amber-100 text-amber-700",
  red: "bg-red-100 text-red-700", blue: "bg-sky-100 text-sky-700", orange: "bg-orange-100 text-orange-700", violet: "bg-violet-100 text-violet-700",
};
export const Badge = ({ tone = "slate", children, className = "" }) => (
  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${TONE[tone]} ${className}`}>{children}</span>
);
export const STATUS_TONE = {
  Active: "green", OnLeave: "blue", Suspended: "amber", Terminated: "red", Resigned: "slate",
  Pending: "amber", Approved: "green", Rejected: "red", Cancelled: "slate",
  Draft: "slate", Published: "blue", Paid: "green", Acknowledged: "green", Open: "amber", Responded: "blue", Closed: "slate",
  Present: "green", Late: "amber", Absent: "red", HalfDay: "orange", Leave: "blue", Holiday: "violet", Weekend: "slate", NotIn: "slate",
  Upcoming: "slate", Completed: "green", InProgress: "blue", NotStarted: "slate",
};
export const StatusBadge = ({ status }) => <Badge tone={STATUS_TONE[status] || "slate"}>{status === "OnLeave" ? "On leave" : status === "HalfDay" ? "Half day" : status === "NotIn" ? "Not in yet" : status}</Badge>;

export const Avatar = ({ name = "?", src, size = 40 }) => {
  const initials = name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
  return src
    ? <img src={src} alt="" style={{ width: size, height: size }} className="shrink-0 rounded-full object-cover" />
    : <span style={{ width: size, height: size, fontSize: size / 2.6 }} className="grid shrink-0 place-items-center rounded-full bg-orange-100 font-bold text-orange-700">{initials}</span>;
};

export const Card = ({ title, action, children, className = "" }) => (
  <section className={`rounded-2xl bg-white p-4 shadow-sm sm:p-5 ${className}`}>
    {(title || action) && <div className="mb-3 flex flex-wrap items-center justify-between gap-2">{title && <h3 className="font-bold">{title}</h3>}{action}</div>}
    {children}
  </section>
);
export const Spinner = ({ label = "Loading…" }) => (
  <div className="flex items-center justify-center gap-3 py-16 text-slate-500"><Loader2 className="animate-spin text-orange-600" size={22} /> {label}</div>
);
export const Empty = ({ title, text, icon: Icon, children }) => (
  <div className="rounded-2xl bg-white p-8 text-center shadow-sm sm:p-10">
    {Icon && <span className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-orange-100 text-orange-600"><Icon size={22} /></span>}
    <h3 className="text-lg font-bold">{title}</h3>
    {text && <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">{text}</p>}
    {children && <div className="mt-4">{children}</div>}
  </div>
);
export const ErrorBox = ({ error, onRetry }) => (
  <div className="rounded-2xl bg-red-50 p-6 text-center text-red-700"><p>{error}</p>{onRetry && <Btn variant="outline" className="mt-3" onClick={onRetry}>Try again</Btn>}</div>
);

export const Kpi = ({ label, value, hint, tone = "slate", onClick }) => {
  const T = onClick ? "button" : "div";
  return (
    <T onClick={onClick} className={`rounded-2xl bg-white p-4 text-left shadow-sm ${onClick ? "transition hover:shadow-md" : ""}`}>
      <p className="text-sm text-slate-500">{label}</p>
      <p className={`mt-1 text-2xl font-extrabold tracking-tight ${tone === "red" ? "text-red-600" : tone === "green" ? "text-emerald-600" : ""}`}>{value}</p>
      {hint && <p className="mt-0.5 text-xs text-slate-400">{hint}</p>}
    </T>
  );
};

export const Tabs = ({ tabs, value, onChange }) => (
  <div className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1" role="tablist">
    {tabs.map(([key, label, count]) => (
      <button key={key} role="tab" aria-selected={value === key} onClick={() => onChange(key)}
        className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm font-semibold transition ${value === key ? "bg-orange-600 text-white" : "bg-white text-slate-600 hover:bg-orange-50"}`}>
        {label}{count > 0 && <span className={`ml-1.5 rounded-full px-1.5 text-xs ${value === key ? "bg-white/25" : "bg-orange-100 text-orange-700"}`}>{count}</span>}
      </button>
    ))}
  </div>
);

export function Modal({ open, onClose, title, children, wide = false }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/60 p-0 backdrop-blur-[2px] sm:items-center sm:p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" aria-label={title} className={`flex max-h-[92vh] w-full flex-col rounded-t-3xl bg-white shadow-xl sm:rounded-3xl ${wide ? "sm:max-w-3xl" : "sm:max-w-lg"}`}>
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h2 className="text-lg font-bold">{title}</h2>
          <button onClick={onClose} aria-label="Close" className="grid h-9 w-9 place-items-center rounded-full hover:bg-slate-100"><X size={18} /></button>
        </div>
        <div className="overflow-y-auto p-5">{children}</div>
      </div>
    </div>
  );
}

// Uploads a PDF, Word file or image to Cloudinary and gives back the URL
export function DocUpload({ onUploaded, label = "Choose a file", file }) {
  const ref = useRef(null);
  const [p, setP] = useState(null);
  const pick = async (f) => {
    if (!f) return;
    setP(0);
    try { const r = await uploadToCloudinary(f, { folder: "ejob/hr", accept: "document", onProgress: setP }); onUploaded({ url: r.url, publicId: r.publicId, fileName: f.name }); toast.success("Upload complete"); }
    catch (e) { toast.error(e.message); }
    finally { setP(null); if (ref.current) ref.current.value = ""; }
  };
  return (
    <div>
      <input ref={ref} type="file" accept=".pdf,.doc,.docx,image/*" className="sr-only" onChange={(e) => pick(e.target.files?.[0])} />
      <button type="button" onClick={() => ref.current?.click()} disabled={p !== null}
        className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 px-4 py-4 text-sm text-slate-600 hover:border-orange-400 hover:bg-orange-50">
        {p !== null ? <><Loader2 size={16} className="animate-spin" /> Uploading {p}%</> : file ? <><FileText size={16} className="text-emerald-600" /> {file}</> : <><Upload size={16} /> {label}</>}
      </button>
    </div>
  );
}