import { useEffect, useState } from "react";
import { X, Zap, Check } from "lucide-react";
import { toast } from "sonner";
import { getError } from "../../api";
import { engageApi } from "./engageApi";
import usePaystackPay from "./usePaystackPay";
import { Spinner, naira } from "./jobUi";

// Also use this on the jobseeker's job cards and job details:
//   <BoostBadge plan={job.boost?.plan} extraDays={job.boost?.extraDays} />
export const BoostBadge = ({ plan, extraDays }) =>
  plan ? (
    <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-orange-500 to-amber-500 px-2.5 py-0.5 text-xs font-bold text-white">
      <Zap size={12} /> Boosted{extraDays ? ` · +${extraDays} days` : ""}
    </span>
  ) : null;

const PERKS = {
  Spotlight: ["Boosted badge on your job", "3 extra days on the job's time"],
  Reach: [
    "Boosted badge on your job",
    "7 extra days on the job's time",
    "Every applicant unlocked, even on a limited plan",
    "First in the approval queue",
    "Suggested candidates that match your requirements",
    "A place in the sponsored job slots",
  ],
};

export default function BoostModal({ job, onClose, onDone }) {
  const [plans, setPlans] = useState(null);
  const { pay, busy } = usePaystackPay();
  const current = job.boost?.plan;

  useEffect(() => {
    engageApi.boostPlans().then((r) => setPlans(r.data.plans)).catch((e) => { toast.error(getError(e)); onClose(); });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const currentPrice = plans?.find((p) => p.key === current)?.price || 0;

  const buy = (plan) =>
    pay({
      start: () => engageApi.boostPay(job._id, plan.key),
      confirm: (ref) => engageApi.boostConfirm(job._id, ref),
      onDone: () => { toast.success(`${plan.name} boost is active`); onDone(); },
    });

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/50 p-4" role="dialog" aria-modal="true" aria-label="Boost job">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-5 shadow-xl sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold">Boost "{job.jobTitle}"</h2>
            <p className="text-sm text-slate-500">Boosted jobs get a badge and are listed above Standard and Basic jobs.</p>
          </div>
          <button onClick={onClose} aria-label="Close" className="rounded-lg p-1 text-slate-500 hover:bg-slate-100"><X size={18} /></button>
        </div>

        {!plans ? <Spinner label="Loading plans…" /> : (
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {plans.map((plan) => {
              const owned = current && currentPrice >= plan.price;
              const price = plan.price - (owned ? 0 : currentPrice);
              return (
                <section key={plan.key} className="flex flex-col rounded-xl border border-slate-200 p-4">
                  <h3 className="font-bold">{plan.name}</h3>
                  <p className="mt-1 text-2xl font-extrabold">{naira(price)}</p>
                  {current && !owned && <p className="text-xs text-slate-500">Upgrade price: you already paid for {current}</p>}
                  <ul className="mt-3 flex-1 space-y-1.5 text-sm text-slate-700">
                    {PERKS[plan.key].map((t) => (
                      <li key={t} className="flex items-start gap-2"><Check size={15} className="mt-0.5 shrink-0 text-emerald-600" /> {t}</li>
                    ))}
                  </ul>
                  <button disabled={busy || owned} onClick={() => buy(plan)}
                    className="mt-4 rounded-xl bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-50">
                    {owned ? "Already boosted" : `Pay ${naira(price)}`}
                  </button>
                </section>
              );
            })}
          </div>
        )}

        {job.status === "Awaiting Approval" && (
          <p className="mt-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-700">
            This job is waiting for approval. The extra days are added when it goes live.
          </p>
        )}
      </div>
    </div>
  );
}