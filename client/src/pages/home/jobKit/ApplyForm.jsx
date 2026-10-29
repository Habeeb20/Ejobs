import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { getError, jobsApi } from "../../../api";
import { AVAILABILITY } from "../../../utils/jobOptions";

const cls =
  "w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-orange-500 focus:ring-4 focus:ring-orange-500/15";
const Label = ({ children }) => <span className="mb-1 block text-sm font-medium text-slate-700">{children}</span>;

export default function ApplyForm({ job, user, onApplied }) {
  const resumes = (user?.resume || []).filter(Boolean);
  const questions = job.additionalInterviewQuestion || [];
  const [form, setForm] = useState({ availability: "", resume: resumes[0] || "", coverLetter: "", additionalDocument: "" });
  const [answers, setAnswers] = useState(questions.map(() => ""));
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.availability) return toast.error("Tell the employer when you can start");
    if (!form.resume.trim()) return toast.error("Add your résumé first");
    if (job.requireCoverLetter && !form.coverLetter.trim()) return toast.error("This job needs a cover letter");
    setBusy(true);
    try {
      await jobsApi.apply(job._id, {
        ...form,
        additionalQuestionResponse: questions.map((question, i) => ({ question, answer: answers[i].trim() })),
      });
      toast.success("Application sent. Good luck!");
      onApplied();
    } catch (err) {
      toast.error(getError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <label className="block">
        <Label>When can you start?</Label>
        <select value={form.availability} onChange={set("availability")} className={cls}>
          <option value="">Select…</option>
          {AVAILABILITY.map((a) => <option key={a}>{a}</option>)}
        </select>
      </label>

      <label className="block">
        <Label>Résumé</Label>
        {resumes.length ? (
          <select value={form.resume} onChange={set("resume")} className={cls}>
            {resumes.map((r, i) => <option key={r} value={r}>{`Résumé ${i + 1}`}</option>)}
          </select>
        ) : (
          <input value={form.resume} onChange={set("resume")} placeholder="Link to your résumé" className={cls} />
        )}
        <span className="mt-1 block text-xs text-slate-500">Upload résumés in your profile to pick them here.</span>
      </label>

      <label className="block">
        <Label>Cover letter {job.requireCoverLetter ? <span className="text-red-600">*</span> : "(optional)"}</Label>
        <textarea rows={5} value={form.coverLetter} onChange={set("coverLetter")} className={cls}
          placeholder="Tell the employer why you're a good fit" />
      </label>

      {job.requiredDocumentUpload && (
        <label className="block">
          <Label>Supporting document link (optional)</Label>
          <input value={form.additionalDocument} onChange={set("additionalDocument")}
            placeholder="Certificate, portfolio…" className={cls} />
        </label>
      )}

      {questions.map((q, i) => (
        <label key={i} className="block">
          <Label>{q}</Label>
          <textarea rows={2} value={answers[i]} className={cls}
            onChange={(e) => setAnswers((a) => a.map((x, j) => (j === i ? e.target.value : x)))} />
        </label>
      ))}

      <button disabled={busy}
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-orange-600 px-5 py-3 font-semibold text-white shadow-lg shadow-orange-600/25 transition hover:bg-orange-700 disabled:opacity-60">
        {busy && <Loader2 className="h-4 w-4 animate-spin" />} Send application
      </button>
    </form>
  );
}