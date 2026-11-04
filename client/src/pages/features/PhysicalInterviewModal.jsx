import { useState } from "react";
import { X, Wallet } from "lucide-react";
import { toast } from "sonner";
import { engageApi } from "./engageApi";
import usePaystackPay from "./usePaystackPay";
import { naira } from "./jobUi";

const FEE = 4000; // keep in step with PHYSICAL_INTERVIEW_FEE in backend/config/boost.js

// <input type="datetime-local"> wants "YYYY-MM-DDTHH:mm" in local time
const toLocalInput = (d) => {
  const x = new Date(d);
  return new Date(x.getTime() - x.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};

/**
 * Employer invites a candidate to a physical interview.
 * The employer pays the fee through Paystack; the candidate only gets the invite
 * (email + dashboard, with "fee paid") once the payment is confirmed.
 * `app.physicalInterview.status === "AwaitingPayment"` reopens a saved invite for payment.
 */
export default function PhysicalInterviewModal({ app, name, onClose, onDone }) {
  const saved = app.physicalInterview?.status === "AwaitingPayment" ? app.physicalInterview : null;
  const [form, setForm] = useState({
    date: saved?.scheduledFor ? toLocalInput(saved.scheduledFor) : "",
    venue: saved?.venue || "",
    note: saved?.note || "",
  });
  const { pay, busy } = usePaystackPay();
  const set = (patch) => setForm((f) => ({ ...f, ...patch }));

  const submit = (e) => {
    e.preventDefault();
    if (!form.date || !form.venue.trim()) return toast.error("Enter the date, time and venue");
    if (new Date(form.date) <= new Date()) return toast.error("Pick a date and time in the future");
    pay({
      start: () => engageApi.physicalInvite(app._id, { date: new Date(form.date).toISOString(), venue: form.venue.trim(), note: form.note.trim() }),
      confirm: (ref) => engageApi.physicalConfirm(app._id, ref),
      onDone: () => { toast.success(`Invite sent to ${name}`); onDone(); },
    });
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/50 p-4" role="dialog" aria-modal="true" aria-label="Physical interview invite">
      <form onSubmit={submit} className="w-full max-w-lg space-y-4 rounded-2xl bg-white p-5 shadow-xl sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-lg font-bold">Invite {name} to a physical interview</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-lg p-1 text-slate-500 hover:bg-slate-100"><X size={18} /></button>
        </div>

        <div className="flex items-start gap-3 rounded-xl bg-orange-50 p-3 text-sm text-orange-900">
          <Wallet size={18} className="mt-0.5 shrink-0" />
          <p>
            You will pay <strong>{naira(FEE)}</strong> for the jobseeker through Paystack. The invite is sent to them
            after the payment, and they will see that the {naira(FEE)} has been paid for them.
          </p>
        </div>

        <label className="block text-sm font-medium text-slate-700">
          Date and time
          <input type="datetime-local" value={form.date} onChange={(e) => set({ date: e.target.value })} required
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        </label>
        <label className="block text-sm font-medium text-slate-700">
          Venue
          <input value={form.venue} onChange={(e) => set({ venue: e.target.value })} maxLength={300} required
            placeholder="Address of the interview" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        </label>
        <label className="block text-sm font-medium text-slate-700">
          Note for the candidate (optional)
          <textarea value={form.note} onChange={(e) => set({ note: e.target.value })} rows={3} maxLength={1000}
            placeholder="Who to ask for, what to bring…" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        </label>

        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold hover:bg-slate-50">Cancel</button>
          <button type="submit" disabled={busy}
            className="rounded-xl bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-700 disabled:opacity-60">
            {busy ? "Opening payment…" : `Pay ${naira(FEE)} and send invite`}
          </button>
        </div>
      </form>
    </div>
  );
}