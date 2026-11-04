import { useEffect, useState } from "react";
import { Zap, Check } from "lucide-react";
import { toast } from "sonner";
import { getError } from "../../api";
import { engageApi } from "./engageApi";
import usePaystackPay from "./usePaystackPay";
import { naira } from "./jobUi";

/** Shown to jobseekers (it sits at the top of MyApplications). */
export default function AccountBoostCard() {
  const [info, setInfo] = useState(null);
  const { pay, busy } = usePaystackPay();

  const load = () =>
    engageApi.accountBoost().then((r) => setInfo(r.data)).catch((e) => toast.error(getError(e)));
  useEffect(() => { load(); }, []);

  if (!info) return null;

  const subscribe = () =>
    pay({
      start: () => engageApi.accountBoostPay(),
      confirm: (ref) => engageApi.accountBoostConfirm(ref),
      onDone: () => { toast.success("Account boost is active"); load(); },
    });

  const until = info.expiresAt && new Date(info.expiresAt).toLocaleDateString("en-NG", { day: "numeric", month: "long", year: "numeric" });

  return (
    <section className="rounded-2xl border border-orange-200 bg-orange-50/60 p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="flex items-center gap-2 font-bold"><Zap size={18} className="text-orange-600" /> Account boost</h2>
          <ul className="mt-2 space-y-1 text-sm text-slate-700">
            <li className="flex items-start gap-2"><Check size={15} className="mt-0.5 shrink-0 text-emerald-600" /> Get an email for every new job that matches your job choices</li>
            <li className="flex items-start gap-2"><Check size={15} className="mt-0.5 shrink-0 text-emerald-600" /> Employers see your applications first</li>
          </ul>
        </div>
        <div className="text-right">
          {info.active && <p className="mb-2 text-sm font-semibold text-emerald-700">Active until {until}</p>}
          <button type="button" disabled={busy} onClick={subscribe}
            className="rounded-xl bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-700 disabled:opacity-60">
            {info.active ? "Extend" : "Subscribe"} · {naira(info.price)} for {info.durationDays} days
          </button>
        </div>
      </div>
    </section>
  );
}