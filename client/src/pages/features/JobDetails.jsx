// import { useEffect, useState } from "react";
// import { ArrowLeft, Heart, MapPin, Briefcase, GraduationCap, Wallet, Users, CheckCircle2, Loader2, Video } from "lucide-react";
// import { toast } from "sonner";
// import { jobsApi, getError } from "../../api";
// import { Spinner, timeAgo } from "./jobUi";
// import { AVAILABILITY } from "../../utils/jobOptions";

// const cls = "w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-orange-600";

// function ApplyForm({ job, user, onApplied }) {
//   const resumes = user?.resume?.filter(Boolean) || [];
//   const questions = job.additionalInterviewQuestion || [];
//   const [form, setForm] = useState({ availability: "", resume: resumes[0] || "", coverLetter: "", additionalDocument: "" });
//   const [answers, setAnswers] = useState(questions.map(() => ""));
//   const [busy, setBusy] = useState(false);
//   const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

//   const submit = async (e) => {
//     e.preventDefault();
//     if (!form.availability) return toast.error("Tell the employer when you can start");
//     if (!form.resume.trim()) return toast.error("Add a link to your resume");
//     if (job.requireCoverLetter && !form.coverLetter.trim()) return toast.error("This job needs a cover letter");
//     setBusy(true);
//     try {
//       await jobsApi.apply(job._id, {
//         ...form,
//         additionalQuestionResponse: questions.map((question, i) => ({ question, answer: answers[i].trim() })),
//       });
//       toast.success("Application sent. Good luck!");
//       onApplied();
//     } catch (err) { toast.error(getError(err)); }
//     finally { setBusy(false); }
//   };

//   return (
//     <form onSubmit={submit} className="space-y-4 rounded-2xl bg-white p-4 shadow-sm sm:p-5">
//       <h3 className="text-lg font-bold">Apply for this job</h3>

//       <label className="block"><span className="mb-1 block text-sm font-medium text-slate-700">When can you start?</span>
//         <select value={form.availability} onChange={set("availability")} className={cls}>
//           <option value="">Select…</option>{AVAILABILITY.map((a) => <option key={a}>{a}</option>)}
//         </select></label>

//       <label className="block"><span className="mb-1 block text-sm font-medium text-slate-700">Resume</span>
//         {resumes.length ? (
//           <select value={form.resume} onChange={set("resume")} className={cls}>{resumes.map((r) => <option key={r}>{r}</option>)}</select>
//         ) : (
//           <input value={form.resume} onChange={set("resume")} placeholder="Link to your resume (Google Drive, Dropbox…)" className={cls} />
//         )}</label>

//       <label className="block"><span className="mb-1 block text-sm font-medium text-slate-700">
//         Cover letter {job.requireCoverLetter ? <span className="text-red-600">*</span> : "(optional)"}</span>
//         <textarea rows={5} value={form.coverLetter} onChange={set("coverLetter")} className={cls}
//           placeholder="Tell the employer why you're a good fit" /></label>

//       {job.requiredDocumentUpload && (
//         <label className="block"><span className="mb-1 block text-sm font-medium text-slate-700">Supporting document link (optional)</span>
//           <input value={form.additionalDocument} onChange={set("additionalDocument")} placeholder="Certificate, portfolio…" className={cls} /></label>
//       )}

//       {questions.map((q, i) => (
//         <label key={i} className="block"><span className="mb-1 block text-sm font-medium text-slate-700">{q}</span>
//           <textarea rows={2} value={answers[i]} onChange={(e) => setAnswers(answers.map((a, j) => (j === i ? e.target.value : a)))} className={cls} /></label>
//       ))}

//       <button disabled={busy} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-orange-600 px-5 py-3 font-semibold text-white hover:bg-orange-700 disabled:opacity-60 sm:w-auto">
//         {busy && <Loader2 size={16} className="animate-spin" />} Send application
//       </button>
//     </form>
//   );
// }

// export default function JobDetails({ jobId, user, onBack, onChange }) {
//   const [job, setJob] = useState(null);

//   useEffect(() => {
//     jobsApi.details(jobId).then((r) => setJob(r.data.job)).catch((e) => { toast.error(getError(e)); onBack(); });
//   }, [jobId]); // eslint-disable-line react-hooks/exhaustive-deps

//   const toggleLike = async () => {
//     try {
//       const { data } = await jobsApi.like(job._id);
//       setJob({ ...job, liked: data.liked });
//       onChange?.(job._id, { liked: data.liked });
//       toast.success(data.liked ? "Saved to your jobs" : "Removed from saved jobs");
//     } catch (err) { toast.error(getError(err)); }
//   };

//   if (!job) return <Spinner label="Loading job…" />;
//   const e = job.employer || {};

//   return (
//     <div className="space-y-4">
//       <button onClick={onBack} className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900">
//         <ArrowLeft size={16} /> Back to jobs
//       </button>

//       <section className="rounded-2xl bg-white p-4 shadow-sm sm:p-6">
//         <div className="flex items-start gap-3">
//           {e.avatar ? <img src={e.avatar} alt="" className="h-14 w-14 rounded-xl object-cover" />
//             : <span className="grid h-14 w-14 place-items-center rounded-xl bg-orange-100 text-xl font-bold text-orange-700">{(e.companyName || "J")[0]}</span>}
//           <div className="min-w-0 flex-1">
//             <h2 className="text-xl font-bold sm:text-2xl">{job.jobTitle}</h2>
//             <p className="text-slate-500">{e.companyName} · posted {timeAgo(job.createdAt)}</p>
//           </div>
//           <button onClick={toggleLike} aria-label={job.liked ? "Remove from saved" : "Save job"} aria-pressed={job.liked}
//             className="grid h-10 w-10 place-items-center rounded-full border border-slate-200 hover:bg-slate-50">
//             <Heart size={18} className={job.liked ? "fill-orange-600 text-orange-600" : "text-slate-400"} />
//           </button>
//         </div>

//         <dl className="mt-5 grid grid-cols-2 gap-4 text-sm lg:grid-cols-4">
//           {[
//             [MapPin, "Location", `${job.city}, ${job.localGovernment}, ${job.state}`],
//             [Briefcase, "Work type", `${job.workType}${job.jobLevel ? ` · ${job.jobLevel}` : ""}`],
//             [Wallet, "Salary", `${job.currency} ${job.salary}`],
//             [GraduationCap, "Qualification", `${job.minimumQualification} · ${job.experienceLength}`],
//           ].map(([Icon, label, value]) => (
//             <div key={label}><dt className="flex items-center gap-1.5 text-slate-500"><Icon size={14} /> {label}</dt><dd className="mt-0.5 font-semibold">{value}</dd></div>
//           ))}
//         </dl>
//         <p className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-500">
//           <span className="flex items-center gap-1"><Users size={14} /> {job.numberOfOpenings} opening{job.numberOfOpenings === "1" ? "" : "s"}</span>
//           {job.virtualInterview && <span className="flex items-center gap-1"><Video size={14} /> Virtual interview</span>}
//         </p>
//       </section>

//       <section className="rounded-2xl bg-white p-4 shadow-sm sm:p-6">
//         <h3 className="font-bold">About the role</h3>
//         <p className="mt-2 whitespace-pre-line text-slate-700">{job.jobSummary}</p>
//         {!!job.jobDescription?.length && (
//           <ul className="mt-4 list-disc space-y-1.5 pl-5 text-slate-700">{job.jobDescription.map((d, i) => <li key={i}>{d}</li>)}</ul>
//         )}
//         {!!job.jobSkills?.length && (
//           <div className="mt-4 flex flex-wrap gap-2">
//             {job.jobSkills.map((s) => <span key={s} className="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-700">{s}</span>)}
//           </div>
//         )}
//       </section>

//       {e.aboutUs && (
//         <section className="rounded-2xl bg-white p-4 shadow-sm sm:p-6">
//           <h3 className="font-bold">About {e.companyName}</h3>
//           <p className="mt-2 whitespace-pre-line text-slate-700">{e.aboutUs}</p>
//         </section>
//       )}

//       {job.applied ? (
//         <div className="flex items-center gap-2 rounded-2xl bg-emerald-50 p-4 font-semibold text-emerald-700">
//           <CheckCircle2 size={20} /> You've applied for this job.
//         </div>
//       ) : (
//         <ApplyForm job={job} user={user} onApplied={() => { setJob({ ...job, applied: true }); onChange?.(job._id, { applied: true }); }} />
//       )}
//     </div>
//   );
// }








import { useEffect, useState } from "react";
import { ArrowLeft, Heart, Share2, MapPin, Briefcase, GraduationCap, Wallet, Users, CheckCircle2, Loader2, Video } from "lucide-react";
import { toast } from "sonner";
import { jobsApi, getError } from "../../api";
import { Spinner, timeAgo } from "./jobUi";
import { AVAILABILITY } from "../../utils/jobOptions";

const SHARE = [
  ["whatsapp", "WhatsApp", (u, t) => `https://wa.me/?text=${encodeURIComponent(`${t} ${u}`)}`],
  ["facebook", "Facebook", (u) => `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(u)}`],
  ["twitter", "X (Twitter)", (u, t) => `https://twitter.com/intent/tweet?text=${encodeURIComponent(t)}&url=${encodeURIComponent(u)}`],
  ["linkedin", "LinkedIn", (u) => `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(u)}`],
  ["copy", "Copy link"],
];

const cls = "w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-orange-600";

function ApplyForm({ job, user, onApplied }) {
  const resumes = user?.resume?.filter(Boolean) || [];
  const questions = job.additionalInterviewQuestion || [];
  const [form, setForm] = useState({ availability: "", resume: resumes[0] || "", coverLetter: "", additionalDocument: "" });
  const [answers, setAnswers] = useState(questions.map(() => ""));
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    if (!form.availability) return toast.error("Tell the employer when you can start");
    if (!form.resume.trim()) return toast.error("Add a link to your resume");
    if (job.requireCoverLetter && !form.coverLetter.trim()) return toast.error("This job needs a cover letter");
    setBusy(true);
    try {
      await jobsApi.apply(job._id, {
        ...form,
        additionalQuestionResponse: questions.map((question, i) => ({ question, answer: answers[i].trim() })),
      });
      toast.success("Application sent. Good luck!");
      onApplied();
    } catch (err) { toast.error(getError(err)); }
    finally { setBusy(false); }
  };

  return (
    <form onSubmit={submit} className="space-y-4 rounded-2xl bg-white p-4 shadow-sm sm:p-5">
      <h3 className="text-lg font-bold">Apply for this job</h3>

      <label className="block"><span className="mb-1 block text-sm font-medium text-slate-700">When can you start?</span>
        <select value={form.availability} onChange={set("availability")} className={cls}>
          <option value="">Select…</option>{AVAILABILITY.map((a) => <option key={a}>{a}</option>)}
        </select></label>

      <label className="block"><span className="mb-1 block text-sm font-medium text-slate-700">Resume</span>
        {resumes.length ? (
          <select value={form.resume} onChange={set("resume")} className={cls}>{resumes.map((r) => <option key={r}>{r}</option>)}</select>
        ) : (
          <input value={form.resume} onChange={set("resume")} placeholder="Link to your resume (Google Drive, Dropbox…)" className={cls} />
        )}</label>

      <label className="block"><span className="mb-1 block text-sm font-medium text-slate-700">
        Cover letter {job.requireCoverLetter ? <span className="text-red-600">*</span> : "(optional)"}</span>
        <textarea rows={5} value={form.coverLetter} onChange={set("coverLetter")} className={cls}
          placeholder="Tell the employer why you're a good fit" /></label>

      {job.requiredDocumentUpload && (
        <label className="block"><span className="mb-1 block text-sm font-medium text-slate-700">Supporting document link (optional)</span>
          <input value={form.additionalDocument} onChange={set("additionalDocument")} placeholder="Certificate, portfolio…" className={cls} /></label>
      )}

      {questions.map((q, i) => (
        <label key={i} className="block"><span className="mb-1 block text-sm font-medium text-slate-700">{q}</span>
          <textarea rows={2} value={answers[i]} onChange={(e) => setAnswers(answers.map((a, j) => (j === i ? e.target.value : a)))} className={cls} /></label>
      ))}

      <button disabled={busy} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-orange-600 px-5 py-3 font-semibold text-white hover:bg-orange-700 disabled:opacity-60 sm:w-auto">
        {busy && <Loader2 size={16} className="animate-spin" />} Send application
      </button>
    </form>
  );
}

export default function JobDetails({ jobId, user, onBack, onChange }) {
  const [job, setJob] = useState(null);
  const [shareOpen, setShareOpen] = useState(false);

  useEffect(() => {
    jobsApi.details(jobId).then((r) => setJob(r.data.job)).catch((e) => { toast.error(getError(e)); onBack(); });
  }, [jobId]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleLike = async () => {
    try {
      const { data } = await jobsApi.like(job._id);
      setJob({ ...job, liked: data.liked });
      onChange?.(job._id, { liked: data.liked });
      toast.success(data.liked ? "Saved to your jobs" : "Removed from saved jobs");
    } catch (err) { toast.error(getError(err)); }
  };

  // Records the share on the server (once per person per channel), then opens the channel
  const share = async (channel, build) => {
    setShareOpen(false);
    try {
      const { data } = await jobsApi.share(job._id, channel);
      if (channel === "copy") {
        await navigator.clipboard.writeText(data.shareUrl);
        toast.success("Link copied");
      } else {
        window.open(build(data.shareUrl, data.text), "_blank", "noopener,noreferrer");
      }
    } catch (err) { toast.error(getError(err)); }
  };

  if (!job) return <Spinner label="Loading job…" />;
  const e = job.employer || {};

  return (
    <div className="space-y-4">
      <button onClick={onBack} className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900">
        <ArrowLeft size={16} /> Back to jobs
      </button>

      <section className="rounded-2xl bg-white p-4 shadow-sm sm:p-6">
        <div className="flex items-start gap-3">
          {e.avatar ? <img src={e.avatar} alt="" className="h-14 w-14 rounded-xl object-cover" />
            : <span className="grid h-14 w-14 place-items-center rounded-xl bg-orange-100 text-xl font-bold text-orange-700">{(e.companyName || "J")[0]}</span>}
          <div className="min-w-0 flex-1">
            <h2 className="text-xl font-bold sm:text-2xl">{job.jobTitle}</h2>
            <p className="text-slate-500">{e.companyName} · posted {timeAgo(job.createdAt)}</p>
          </div>
          <div className="relative flex shrink-0 items-center gap-2">
            <button onClick={() => setShareOpen((o) => !o)} aria-label="Share job" aria-expanded={shareOpen}
              className="grid h-10 w-10 place-items-center rounded-full border border-slate-200 hover:bg-slate-50">
              <Share2 size={18} className="text-slate-500" />
            </button>
            {shareOpen && (
              <div className="absolute right-0 top-12 z-10 w-44 rounded-xl border border-slate-200 bg-white p-1 shadow-lg">
                {SHARE.map(([key, label, build]) => (
                  <button key={key} onClick={() => share(key, build)} className="block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-slate-50">{label}</button>
                ))}
              </div>
            )}
            <button onClick={toggleLike} aria-label={job.liked ? "Remove from saved" : "Save job"} aria-pressed={job.liked}
              className="grid h-10 w-10 place-items-center rounded-full border border-slate-200 hover:bg-slate-50">
              <Heart size={18} className={job.liked ? "fill-orange-600 text-orange-600" : "text-slate-400"} />
            </button>
          </div>
        </div>

        <dl className="mt-5 grid grid-cols-2 gap-4 text-sm lg:grid-cols-4">
          {[
            [MapPin, "Location", `${job.city}, ${job.localGovernment}, ${job.state}`],
            [Briefcase, "Work type", `${job.workType}${job.jobLevel ? ` · ${job.jobLevel}` : ""}`],
            [Wallet, "Salary", `${job.currency} ${job.salary}`],
            [GraduationCap, "Qualification", `${job.minimumQualification} · ${job.experienceLength}`],
          ].map(([Icon, label, value]) => (
            <div key={label}><dt className="flex items-center gap-1.5 text-slate-500"><Icon size={14} /> {label}</dt><dd className="mt-0.5 font-semibold">{value}</dd></div>
          ))}
        </dl>
        <p className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-500">
          <span className="flex items-center gap-1"><Users size={14} /> {job.numberOfOpenings} opening{job.numberOfOpenings === "1" ? "" : "s"}</span>
          {job.virtualInterview && <span className="flex items-center gap-1"><Video size={14} /> Virtual interview</span>}
        </p>
      </section>

      <section className="rounded-2xl bg-white p-4 shadow-sm sm:p-6">
        <h3 className="font-bold">About the role</h3>
        <p className="mt-2 whitespace-pre-line text-slate-700">{job.jobSummary}</p>
        {!!job.jobDescription?.length && (
          <ul className="mt-4 list-disc space-y-1.5 pl-5 text-slate-700">{job.jobDescription.map((d, i) => <li key={i}>{d}</li>)}</ul>
        )}
        {!!job.jobSkills?.length && (
          <div className="mt-4 flex flex-wrap gap-2">
            {job.jobSkills.map((s) => <span key={s} className="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-700">{s}</span>)}
          </div>
        )}
      </section>

      {e.aboutUs && (
        <section className="rounded-2xl bg-white p-4 shadow-sm sm:p-6">
          <h3 className="font-bold">About {e.companyName}</h3>
          <p className="mt-2 whitespace-pre-line text-slate-700">{e.aboutUs}</p>
        </section>
      )}

      {job.applied ? (
        <div className="flex items-center gap-2 rounded-2xl bg-emerald-50 p-4 font-semibold text-emerald-700">
          <CheckCircle2 size={20} /> You've applied for this job.
        </div>
      ) : (
        <ApplyForm job={job} user={user} onApplied={() => { setJob({ ...job, applied: true }); onChange?.(job._id, { applied: true }); }} />
      )}
    </div>
  );
}