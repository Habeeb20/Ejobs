import { useState } from "react";
import { X } from "lucide-react";
import { toast } from "sonner";
import { getError } from "../../api";
import { engageApi } from "./engageApi";
import MessageFields, { emptyMessage } from "./MessageFields";

const STATUSES = ["Shortlisted", "Interviewed", "Scheduled", "Offer"];

/**
 * Shortlist (or move) a jobseeker for one of the employer's live jobs.
 * jobs: [{ _id, jobTitle }]. Pass a single job to lock the choice.
 */
export default function InviteModal({ seeker, name, jobs, onClose, onDone }) {
  const [jobId, setJobId] = useState(jobs[0]?._id || "");
  const [status, setStatus] = useState("Shortlisted");
  const [mail, setMail] = useState(emptyMessage);
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!jobId) return toast.error("Pick a job");
    if (mail.on && !mail.body.trim()) return toast.error("Write the message or turn it off");
    setBusy(true);
    try {
      await engageApi.invite(seeker._id, {
        jobId, status,
        subject: mail.on ? mail.subject.trim() : "",
        message: mail.on ? mail.body.trim() : "",
      });
      toast.success(`${name} is now ${status.toLowerCase()}`);
      onDone?.();
      onClose();
    } catch (err) {
      toast.error(getError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/50 p-4" role="dialog" aria-modal="true" aria-label="Shortlist candidate">
      <form onSubmit={submit} className="w-full max-w-lg space-y-4 rounded-2xl bg-white p-5 shadow-xl sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-lg font-bold">Shortlist {name}</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-lg p-1 text-slate-500 hover:bg-slate-100"><X size={18} /></button>
        </div>

        <label className="block text-sm font-medium text-slate-700">
          For which job?
          <select value={jobId} onChange={(e) => setJobId(e.target.value)} disabled={jobs.length === 1}
            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">
            {jobs.map((j) => <option key={j._id} value={j._id}>{j.jobTitle}</option>)}
          </select>
        </label>

        <label className="block text-sm font-medium text-slate-700">
          Status
          <select value={status} onChange={(e) => setStatus(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">
            {STATUSES.map((s) => <option key={s}>{s}</option>)}
          </select>
        </label>

        <MessageFields value={mail} onChange={setMail} />

        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold hover:bg-slate-50">Cancel</button>
          <button type="submit" disabled={busy}
            className="rounded-xl bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-700 disabled:opacity-60">
            {busy ? "Saving…" : `Mark as ${status}`}
          </button>
        </div>
      </form>
    </div>
  );
}