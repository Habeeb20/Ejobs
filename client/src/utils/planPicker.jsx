import { useEffect, useState } from "react";
import { Check, X, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { jobsApi, getError } from "../api";
import { naira, Spinner } from "../pages/features/jobUi";

const duration = (h) => (h < 48 ? `${h} hours` : h >= 720 ? "1 month" : `${h / 24} days`);

export const featureRows = (p) => [
  { label: `Visible for ${duration(p.durationHours)}`, on: true },
  { label: p.maxApplicants ? `Access up to ${p.maxApplicants} applicants` : "Unlimited applicants", on: true },
  { label: p.points ? `Earn ${p.points} loyalty points` : "Loyalty points", on: p.points > 0 },
  { label: "Renew when it expires", on: p.renewable },
  { label: "Applicant analytics charts", on: p.analytics },
  { label: "Candidate match percentage", on: p.matchScore },
  { label: "Real-time and email alerts", on: p.liveAlerts },
  { label: "Target the right job seekers", on: p.targeting },
  { label: "Shown in ads", on: p.ads },
];

export default function PlanPicker({ value, onChange }) {
  const [plans, setPlans] = useState(null);

  useEffect(() => {
    jobsApi.plans()
      .then(({ data }) => setPlans(data.plans))
      .catch((e) => toast.error(getError(e)));
  }, []);

  if (!plans) return <Spinner label="Loading plans…" />;

  return (
    <div role="radiogroup" aria-label="Choose a job plan" className="grid gap-4 md:grid-cols-3">
      {plans.map((p) => {
        const selected = value === p.key;
        const popular = p.key === "Standard";
        return (
          <button
            key={p.key}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(p.key)}
            className={`relative flex flex-col rounded-2xl border-2 bg-white p-5 text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-orange-600 ${
              selected ? "border-orange-600 shadow-lg shadow-orange-600/10" : "border-slate-200 hover:border-orange-300"
            }`}
          >
            {(popular || p.key === "Premium") && (
              <span className="absolute -top-3 right-4 inline-flex items-center gap-1 rounded-full bg-orange-600 px-3 py-1 text-xs font-semibold text-white">
                <Sparkles size={12} /> {popular ? "Popular" : "Best value"}
              </span>
            )}
            <h3 className="text-lg font-bold">{p.name}</h3>
            <p className="mt-1 text-3xl font-extrabold tracking-tight">
              {naira(p.price)}
              {p.price > 0 && <span className="text-sm font-medium text-slate-500"> / job</span>}
            </p>
            <ul className="mt-4 space-y-2.5 text-sm">
              {featureRows(p).map((f) => (
                <li key={f.label} className={`flex items-start gap-2 ${f.on ? "text-slate-800" : "text-slate-400"}`}>
                  {f.on ? <Check size={16} className="mt-0.5 shrink-0 text-emerald-600" /> : <X size={16} className="mt-0.5 shrink-0" />}
                  <span className={f.on ? "" : "line-through"}>{f.label}</span>
                </li>
              ))}
            </ul>
            <span className={`mt-5 rounded-xl py-2 text-center text-sm font-semibold ${selected ? "bg-orange-600 text-white" : "bg-slate-100 text-slate-700"}`}>
              {selected ? "Selected" : `Choose ${p.name}`}
            </span>
          </button>
        );
      })}
    </div>
  );
}