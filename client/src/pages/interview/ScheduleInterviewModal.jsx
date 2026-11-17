import { useState } from "react";
import { Copy } from "lucide-react";
import { toast } from "sonner";
import api, { getError } from "../../api";

// Usage: <ScheduleInterviewModal application={app} onClose={...} onDone={...} />
// `application` needs at least { _id }. Pass candidateName for a nicer title.
export default function ScheduleInterviewModal({ application, candidateName, onClose, onDone }) {
  const [when, setWhen] = useState("");
  const [duration, setDuration] = useState(60);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [link, setLink] = useState("");

  const submit = async () => {
    if (!when) return toast.error("Pick a date and time");
    setBusy(true);
    try {
      const { data } = await api.post("/interviews", {
        applicationId: application._id,
        scheduledAt: new Date(when).toISOString(), // datetime-local is the browser's local time
        duration,
        note,
      });
      setLink(data.link);
      toast.success("Interview scheduled");
    } catch (err) {
      toast.error(getError(err));
    } finally {
      setBusy(false);
    }
  };

  const copy = async () => {
    await navigator.clipboard.writeText(link);
    toast.success("Interview link copied");
  };

  const field = "mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-200";

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/50 p-4" role="dialog" aria-modal="true">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <h3 className="text-lg font-bold">Schedule interview{candidateName ? ` with ${candidateName}` : ""}</h3>

        {!link ? (
          <>
            <label className="mt-4 block text-sm font-medium">Date and time
              <input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} className={field} />
            </label>
            <label className="mt-3 block text-sm font-medium">Length
              <select value={duration} onChange={(e) => setDuration(Number(e.target.value))} className={field}>
                {[15, 30, 45, 60, 90, 120].map((m) => <option key={m} value={m}>{m} minutes</option>)}
              </select>
            </label>
            <label className="mt-3 block text-sm font-medium">Note for the candidate (optional)
              <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} maxLength={500} className={field} />
            </label>
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={onClose} className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold hover:bg-slate-50">Cancel</button>
              <button onClick={submit} disabled={busy}
                className="rounded-xl bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-700 disabled:opacity-60">
                {busy ? "Scheduling…" : "Schedule interview"}
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="mt-3 text-sm text-slate-600">Send this link to the candidate. They'll also see it in their interviews.</p>
            <div className="mt-3 flex items-center gap-2 rounded-xl bg-slate-100 p-3">
              <span className="min-w-0 flex-1 truncate text-sm">{link}</span>
              <button onClick={copy} aria-label="Copy link" className="grid h-8 w-8 place-items-center rounded-lg bg-white shadow-sm hover:bg-slate-50">
                <Copy size={14} />
              </button>
            </div>
            <div className="mt-5 flex justify-end">
              <button onClick={() => { onDone?.(); onClose(); }}
                className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700">Done</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}