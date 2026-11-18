// src/pages/recruitment/RecruitmentPlans.jsx   dashboard tab: recruitmentPlans
import { useEffect, useState } from "react";
import { Check, ChevronDown, ClipboardList } from "lucide-react";
import recruitmentApi from "./recruitmentApi";
import {
  PageHeader, Spinner, Notice, PolicyBody, btnPrimary, btnGhost, apiError, planPrice,
} from "./ui";

const STEPS = [
  ["Choose a package", "Pick the level of screening and the number of hires you need."],
  ["Tell us about the role", "Share the job description, requirements and your budget, then make the payment."],
  ["We find and vet candidates", "We source, interview and verify candidates against your requirements."],
  ["You interview and hire", "Review verified profiles, interview, and hire. Replacements are covered by the package."],
];

export default function RecruitmentPlans({ go }) {
  const [cat, setCat] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    recruitmentApi.catalog().then(setCat).catch((e) => setError(apiError(e)));
  }, []);

  if (error) return <div className="mx-auto max-w-3xl p-6"><Notice tone="error">{error}</Notice></div>;
  if (!cat) return <Spinner label="Loading packages" />;

  return (
    <div className="mx-auto w-full max-w-7xl py-2">
      <PageHeader
        title="Hire screened, interviewed candidates"
        subtitle="Tell us the role. We source candidates, interview them, verify their background and send you a shortlist of people who fit."
        actions={
          <button type="button" onClick={() => go("recruitment")} className={btnGhost}>
            <ClipboardList className="h-4 w-4" /> My recruitment requests
          </button>
        }
      />

      <ol className="mb-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {STEPS.map(([title, text], i) => (
          <li key={title} className="rounded-xl border border-slate-200 bg-white p-5">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#E4510B] text-sm font-semibold text-white">{i + 1}</span>
            <p className="mt-3 font-semibold text-slate-900">{title}</p>
            <p className="mt-1 text-sm text-slate-600">{text}</p>
          </li>
        ))}
      </ol>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        {cat.plans.map((plan) => {
          const price = planPrice(plan);
          const hires = plan.limits.hireTarget;
          return (
            <article key={plan.key} className="flex flex-col rounded-2xl border border-slate-200 bg-white p-6">
              <h2 className="text-xl font-bold text-slate-900">{plan.name}</h2>
              <p className="mt-1 min-h-[3rem] text-sm text-slate-600">{plan.tagline}</p>

              <div className="mt-5 border-y border-slate-100 py-4">
                {price ? (
                  <p className="text-2xl font-bold text-slate-900">{price}</p>
                ) : (
                  <p className="text-lg font-semibold text-slate-500">Price on request</p>
                )}
                <p className="mt-1 text-xs text-slate-500">{plan.paymentTerms.label}</p>
              </div>

              <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div><dt className="text-slate-500">Turnaround</dt><dd className="font-medium text-slate-900">{plan.durationDays} days</dd></div>
                <div><dt className="text-slate-500">Hires</dt><dd className="font-medium text-slate-900">{hires} {hires > 1 ? "people" : "person"}</dd></div>
                <div><dt className="text-slate-500">Shortlist</dt><dd className="font-medium text-slate-900">Up to {plan.limits.shortlistMax}</dd></div>
                <div><dt className="text-slate-500">Replacements</dt><dd className="font-medium text-slate-900">{plan.replacement.count} in {plan.replacement.windowDays / 30} months</dd></div>
              </dl>

              <ul className="mt-5 flex-1 space-y-2 text-sm text-slate-700">
                {plan.features.map((f) => (
                  <li key={f} className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-[#E4510B]" aria-hidden /><span>{f}</span></li>
                ))}
              </ul>

              {plan.priced ? (
                <button type="button" onClick={() => go("recruitmentOrder", { plan: plan.key })} className={`${btnPrimary} mt-6`}>Choose {plan.name}</button>
              ) : (
                <button disabled className={`${btnPrimary} mt-6`}>Pricing coming soon</button>
              )}
            </article>
          );
        })}
      </div>

      <section className="mt-14">
        <h2 className="text-xl font-bold text-slate-900">Terms and policies</h2>
        <p className="mt-1 text-sm text-slate-600">
          Extra fees: a changed or renewed request adds {cat.changeFeePct}% of the package fee, and having us handle the hiring process adds {cat.engagementFeePct}%.
        </p>
        <div className="mt-4 divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white">
          {cat.policies.map((p) => (
            <details key={p.id} className="group">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 font-medium text-slate-900">
                {p.title}
                <ChevronDown className="h-4 w-4 shrink-0 text-slate-500 transition group-open:rotate-180" aria-hidden />
              </summary>
              <div className="px-5 pb-5"><PolicyBody policy={p} /></div>
            </details>
          ))}
        </div>
      </section>
    </div>
  );
}