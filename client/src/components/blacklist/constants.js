export const ELIGIBLE_ROLES = ["jobseeker", "employer", "admin", "agent"];

export const ROLE_META = {
  jobseeker: { label: "Job seeker", cls: "bg-emerald-50 text-emerald-700 ring-emerald-200" },
  employer: { label: "Employer", cls: "bg-blue-50 text-blue-700 ring-blue-200" },
  admin: { label: "Admin", cls: "bg-violet-50 text-violet-700 ring-violet-200" },
  agent: { label: "Agent", cls: "bg-amber-50 text-amber-700 ring-amber-200" },
  superadmin: { label: "Super admin", cls: "bg-slate-100 text-slate-700 ring-slate-200" },
};

// values must match CATEGORIES in the backend (utils/blacklist.js)
export const CATEGORIES = [
  { value: "fraud", label: "Fraud or scam" },
  { value: "fake_documents", label: "Fake documents or identity" },
  { value: "impersonation", label: "Impersonation" },
  { value: "harassment", label: "Harassment or abuse" },
  { value: "spam", label: "Spam or fake listings" },
  { value: "non_payment", label: "Non-payment" },
  { value: "inappropriate_content", label: "Inappropriate content" },
  { value: "policy_violation", label: "Policy violation" },
  { value: "other", label: "Other" },
];

export const REASON_MIN = 10;
export const REASON_MAX = 1000;

export const categoryLabel = (value) => CATEGORIES.find((c) => c.value === value)?.label || "Other";

export const displayName = (u) =>
  (u?.role === "employer" && u?.companyName) ||
  [u?.firstName, u?.lastName].filter(Boolean).join(" ") ||
  u?.email ||
  "Unknown user";

export const formatDate = (d) =>
  d
    ? new Intl.DateTimeFormat("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(d))
    : "—";

export const inputCls =
  "w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-orange-500 focus:ring-4 focus:ring-orange-500/20 disabled:bg-slate-50";
