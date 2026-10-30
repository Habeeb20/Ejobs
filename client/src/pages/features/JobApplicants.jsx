


import { useEffect, useState } from "react";
import {
  ArrowLeft, BadgeCheck, ChevronDown, Loader2, Lock, Mail, Phone, ScrollText, Sparkles, User,
} from "lucide-react";
import { toast } from "sonner";
import { jobsApi, getError } from "../../api";
import { PlanBadge, Spinner } from "./jobUi";
import { fmtMonth, fmtPeriod } from "../profile/cvFormat";
import { formatDate, formatSalary } from "../home/jobKit/format";

import { downloadUrl } from "../profile/tabs/cv/cvModel";
import { CvModal } from "../profile/tabs/cv/CvViewer";

const SETTABLE = ["Shortlisted", "Interviewed", "Scheduled", "Offer", "Rejected"];

function StatusControl({ app, onChanged }) {
  const [value, setValue] = useState(app.status);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const dirty = value !== app.status;

  const save = async () => {
    setBusy(true);
    try {
      await jobsApi.setStatus(app._id, value, reason.trim());
      toast.success(`Marked as ${value}`);
      onChanged(app._id, value);
      setReason("");
    } catch (err) { toast.error(getError(err)); setValue(app.status); }
    finally { setBusy(false); }
  };

  return (
    <div className="mt-3 flex flex-wrap items-center gap-2">
      <select value={value} onChange={(e) => setValue(e.target.value)} aria-label="Applicant status"
        className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm">
        {[...new Set([app.status, ...SETTABLE])].map((s) => <option key={s}>{s}</option>)}
      </select>
      {dirty && value === "Rejected" && (
        <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason (optional)"
          className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-1.5 text-sm" />
      )}
      {dirty && (
        <button disabled={busy} onClick={save} className="rounded-lg bg-orange-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-orange-700 disabled:opacity-60">Save</button>
      )}
    </div>
  );
}

const LABELS = { role: "Role fit", education: "Education", location: "Location", workType: "Work type", salary: "Salary", experience: "Experience" };
const colorFor = (s) => (s >= 80 ? "#10b981" : s >= 60 ? "#f97316" : s >= 40 ? "#f59e0b" : "#ef4444");

function MatchRing({ score }) {
  return (
    <div className="grid h-14 w-14 shrink-0 place-items-center rounded-full"
      style={{ background: `conic-gradient(${colorFor(score)} ${score * 3.6}deg, #e2e8f0 0deg)` }}
      aria-label={`${score}% match`}>
      <span className="grid h-11 w-11 place-items-center rounded-full bg-white text-sm font-bold">{score}%</span>
    </div>
  );
}

/* ---------- full profile panel ---------- */
const grid = "grid gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-3";
const link = "font-semibold text-orange-700 hover:underline";

const Info = ({ label, children }) =>
  children ? (
    <div className="min-w-0">
      <dt className="text-xs uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="break-words text-sm font-medium text-slate-800">{children}</dd>
    </div>
  ) : null;

const Block = ({ title, children }) => (
  <section>
    <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-orange-700">{title}</h4>
    {children}
  </section>
);

function ApplicantProfile({ entry, app }) {
  if (!entry || entry.loading) {
    return (
      <p className="mt-4 flex items-center gap-2 py-3 text-sm text-slate-500">
        <Loader2 size={16} className="animate-spin" /> Loading profile…
      </p>
    );
  }
  if (entry.error) return <p role="alert" className="mt-4 text-sm text-red-600">{entry.error}</p>;

  const { profile: p, education, work, certificates, cv } = entry.data;
  const fullName = [p.firstName, p.middleName, p.lastName].filter(Boolean).join(" ");
  const address = [p.address, p.localGovernment, p.state].filter(Boolean).join(", ");
  const badges = [[p.isCertified, "Certified"], [p.guarantorVerified, "Guarantor verified"], [p.isNINVerified, "NIN verified"]].filter(([on]) => on);
  const answers = (app.additionalQuestionResponse || []).filter((q) => q?.question);

  return (
    <div className="mt-4 space-y-5 rounded-xl border border-orange-100 bg-orange-50/40 p-4">
      {badges.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {badges.map(([, label]) => (
            <span key={label} className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
              <BadgeCheck size={13} /> {label}
            </span>
          ))}
        </div>
      )}

      <Block title="Personal">
        <dl className={grid}>
          <Info label="Full name">{fullName}</Info>
          <Info label="Gender">{p.gender}</Info>
          <Info label="Date of birth">{p.dateOfBirth && formatDate(p.dateOfBirth)}</Info>
          <Info label="Marital status">{p.maritalStatus}</Info>
        </dl>
      </Block>

      <Block title="Contact">
        <dl className={grid}>
          <Info label="Email">{p.email && <a className={link} href={`mailto:${p.email}`}>{p.email}</a>}</Info>
          <Info label="Phone">{p.phoneNumber && <a className={link} href={`tel:${p.phoneNumber}`}>{p.phoneNumber}</a>}</Info>
          <Info label="WhatsApp">{p.whatsappNumber}</Info>
          <div className="sm:col-span-2 lg:col-span-3"><Info label="Address">{address}</Info></div>
        </dl>
      </Block>

      <Block title="Career">
        <dl className={grid}>
          <Info label="Education level">{p.educationLevel}</Info>
          <Info label="Current or recent job">{p.job}</Info>
          <Info label="Preferred job type">{p.jobMode}</Info>
          <Info label="Minimum salary">{p.minimumSalary && formatSalary("NGN", p.minimumSalary)}</Info>
          <Info label="Available for urgent work">{p.availabilityForUrgentWork ? "Yes" : "No"}</Info>
          <Info label="Job choices">
            {p.jobChoice?.length > 0 && (
              <span className="flex flex-wrap gap-1.5">
                {p.jobChoice.map((c) => <span key={c} className="rounded-full bg-white px-2.5 py-0.5 text-xs ring-1 ring-orange-100">{c}</span>)}
              </span>
            )}
          </Info>
        </dl>
      </Block>

      <Block title="This application">
        <dl className={grid}>
          <Info label="Position">{app.position}</Info>
          <Info label="Can start">{app.availability}</Info>
          <Info label="Applied">{formatDate(app.createdAt)}</Info>
          <Info label="Résumé">{app.resume && <a className={link} href={app.resume} target="_blank" rel="noreferrer">Open résumé</a>}</Info>
          <Info label="Supporting document">{app.additionalDocument && <a className={link} href={app.additionalDocument} target="_blank" rel="noreferrer">Open document</a>}</Info>
        </dl>
        {app.coverLetter && (
          <div className="mt-3">
            <p className="text-xs uppercase tracking-wide text-slate-500">Cover letter</p>
            <p className="mt-1 whitespace-pre-line text-sm text-slate-700">{app.coverLetter}</p>
          </div>
        )}
        {answers.length > 0 && (
          <div className="mt-3 space-y-2">
            {answers.map((q, i) => (
              <div key={i}>
                <p className="text-xs uppercase tracking-wide text-slate-500">{q.question}</p>
                <p className="text-sm text-slate-700">{q.answer || "No answer"}</p>
              </div>
            ))}
          </div>
        )}
      </Block>

      {work.length > 0 && (
        <Block title="Work experience">
          <ul className="space-y-3">
            {work.map((w) => (
              <li key={w._id} className="rounded-lg bg-white p-3 ring-1 ring-orange-100">
                <p className="text-sm font-bold text-slate-900">{w.jobTitle} · {w.company}</p>
                <p className="text-xs text-slate-500">{[fmtPeriod(w.startDate, w.endDate, w.isCurrent), w.employmentType, w.location].filter(Boolean).join(" · ")}</p>
                {w.description && (
                  <ul className="mt-1.5 list-disc space-y-0.5 pl-5 text-sm text-slate-700">
                    {w.description.split(/\r?\n/).filter(Boolean).map((l, i) => <li key={i}>{l.replace(/^[\s\-•*·]+/, "")}</li>)}
                  </ul>
                )}
                {w.referenceLetter && <a className={`${link} mt-1 inline-block text-sm`} href={w.referenceLetter} target="_blank" rel="noreferrer">Reference letter</a>}
              </li>
            ))}
          </ul>
        </Block>
      )}

      {education.length > 0 && (
        <Block title="Education">
          <ul className="space-y-3">
            {education.map((e) => (
              <li key={e._id} className="rounded-lg bg-white p-3 ring-1 ring-orange-100">
                <p className="text-sm font-bold text-slate-900">{e.qualification}{e.fieldOfStudy ? `, ${e.fieldOfStudy}` : ""}</p>
                <p className="text-sm text-slate-600">{e.institution}</p>
                <p className="text-xs text-slate-500">{[fmtPeriod(e.startDate, e.endDate, e.isCurrent), e.grade].filter(Boolean).join(" · ")}</p>
                {e.certificateUrl && <a className={`${link} mt-1 inline-block text-sm`} href={e.certificateUrl} target="_blank" rel="noreferrer">View certificate</a>}
              </li>
            ))}
          </ul>
        </Block>
      )}

      {certificates.length > 0 && (
        <Block title="Certificates">
          <ul className="space-y-3">
            {certificates.map((c) => (
              <li key={c._id} className="rounded-lg bg-white p-3 ring-1 ring-orange-100">
                <p className="text-sm font-bold text-slate-900">{c.name}</p>
                <p className="text-sm text-slate-600">{c.issuer}</p>
                <p className="text-xs text-slate-500">{[c.issueDate && `Issued ${fmtMonth(c.issueDate)}`, c.expiryDate && `Expires ${fmtMonth(c.expiryDate)}`].filter(Boolean).join(" · ")}</p>
                <div className="mt-1 flex gap-4 text-sm">
                  {c.file && <a className={link} href={c.file} target="_blank" rel="noreferrer">View file</a>}
                  {c.credentialUrl && <a className={link} href={c.credentialUrl} target="_blank" rel="noreferrer">Verify online</a>}
                </div>
              </li>
            ))}
          </ul>
        </Block>
      )}

      {(cv.pdfUrl || cv.wordUrl) && (
        <Block title="Saved CV files">
          <div className="flex flex-wrap gap-4 text-sm">
            {cv.pdfUrl && <a className={link} href={cv.pdfUrl} target="_blank" rel="noreferrer">PDF</a>}
            {cv.wordUrl && <a className={link} href={downloadUrl(cv.wordUrl)}>Word</a>}
          </div>
        </Block>
      )}
    </div>
  );
}

const actionBtn = (active) =>
  `inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-semibold transition ${
    active ? "border-orange-300 bg-orange-100 text-orange-800" : "border-orange-200 bg-orange-50 text-orange-700 hover:bg-orange-100"
  }`;

const nameOf = (p = {}) => [p.firstName, p.lastName].filter(Boolean).join(" ") || "Candidate";

export default function JobApplicants({ job, onBack }) {
  const [data, setData] = useState(null);
  const [open, setOpen] = useState(null);       // "why this match" panel
  const [profileId, setProfileId] = useState(null); // application whose profile is expanded
  const [cvFor, setCvFor] = useState(null);     // application shown in the CV modal
  const [details, setDetails] = useState({});   // appId -> { loading } | { error } | { data }

  useEffect(() => {
    jobsApi.applicants(job._id).then((r) => setData(r.data)).catch((e) => { toast.error(getError(e)); onBack(); });
  }, [job._id]); // eslint-disable-line react-hooks/exhaustive-deps

  const onChanged = (id, status) =>
    setData((d) => ({ ...d, applicants: d.applicants.map((a) => (a._id === id ? { ...a, status } : a)) }));

  // One fetch per applicant, shared by the Profile panel and the CV modal
  const ensureDetails = async (appId) => {
    if (details[appId]?.data || details[appId]?.loading) return;
    setDetails((d) => ({ ...d, [appId]: { loading: true } }));
    try {
      const { data: res } = await jobsApi.applicantProfile(appId);
      setDetails((d) => ({ ...d, [appId]: { data: res } }));
    } catch (err) {
      setDetails((d) => ({ ...d, [appId]: { error: getError(err) } }));
    }
  };

  const toggleProfile = (id) => {
    if (profileId === id) return setProfileId(null);
    setProfileId(id);
    ensureDetails(id);
  };
  const openCv = (a) => {
    setCvFor(a);
    ensureDetails(a._id);
  };

  return (
    <div className="space-y-4">
      <button onClick={onBack} className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900">
        <ArrowLeft size={16} /> Back to my jobs
      </button>

      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-xl font-bold">{job.jobTitle}</h2><PlanBadge type={job.jobType} />
      </div>

      {!data ? <Spinner label="Loading applicants…" /> : (
        <>
          <p className="text-sm text-slate-500">
            {data.total} applicant{data.total === 1 ? "" : "s"} ·{" "}
            {data.plan.matchScore ? "sorted by best match" : "oldest first"}
          </p>

          {!data.plan.matchScore && (
            <div className="flex items-start gap-2 rounded-xl bg-slate-100 p-3 text-sm text-slate-600">
              <Lock size={16} className="mt-0.5 shrink-0" /> Candidate match percentages are available on Standard and Premium jobs.
            </div>
          )}

          <ul className="space-y-3">
            {data.applicants.map((a) => {
              const p = a.applicant || {};
              const name = nameOf(p);
              const isOpen = open === a._id;
              const profileOpen = profileId === a._id;
              return (
                <li key={a._id} className="rounded-2xl bg-white p-4 shadow-sm">
                  <div className="flex items-center gap-3">
                    {p.avatar
                      ? <img src={p.avatar} alt="" className="h-12 w-12 shrink-0 rounded-full object-cover" />
                      : <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-orange-100 font-bold text-orange-700">{name[0]}</span>}
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">{name}</p>
                      <p className="truncate text-sm text-slate-500">{[p.localGovernment, p.state].filter(Boolean).join(", ")} · {p.educationLevel}</p>
                      <p className="text-xs text-slate-400">Applied {new Date(a.createdAt).toLocaleDateString("en-NG", { day: "numeric", month: "short" })} · {a.status}</p>
                    </div>
                    {a.matchScore != null && <MatchRing score={a.matchScore} />}
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <button type="button" onClick={() => toggleProfile(a._id)} aria-expanded={profileOpen} className={actionBtn(profileOpen)}>
                      <User size={14} /> Profile <ChevronDown size={14} className={profileOpen ? "rotate-180" : ""} />
                    </button>
                    <button type="button" onClick={() => openCv(a)} className={actionBtn(false)}>
                      <ScrollText size={14} /> CV
                    </button>
                    {p.email && <a href={`mailto:${p.email}`} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-sm hover:bg-slate-50"><Mail size={14} /> Email</a>}
                    {p.phoneNumber && <a href={`tel:${p.phoneNumber}`} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-sm hover:bg-slate-50"><Phone size={14} /> Call</a>}
                    {a.matchBreakdown && (
                      <button onClick={() => setOpen(isOpen ? null : a._id)} className="ml-auto inline-flex items-center gap-1 text-sm font-semibold text-orange-700">
                        Why this match <ChevronDown size={16} className={isOpen ? "rotate-180" : ""} />
                      </button>
                    )}
                  </div>

                  {profileOpen && <ApplicantProfile entry={details[a._id]} app={a} />}

                  <StatusControl app={a} onChanged={onChanged} />

                  {isOpen && a.matchBreakdown && (
                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      {Object.entries(a.matchBreakdown).map(([k, v]) => (
                        <div key={k}>
                          <div className="flex justify-between text-xs text-slate-600"><span>{LABELS[k] || k}</span><span>{v.earned}/{v.max}</span></div>
                          <div className="mt-1 h-1.5 rounded-full bg-slate-100">
                            <div className="h-full rounded-full bg-orange-500" style={{ width: `${(v.earned / v.max) * 100}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>

          {data.locked > 0 && (
            <div className="flex items-start gap-3 rounded-2xl border border-orange-200 bg-orange-50 p-4 text-sm">
              <Sparkles size={18} className="mt-0.5 shrink-0 text-orange-600" />
              <p>
                <strong>{data.locked} more applicant{data.locked === 1 ? " is" : "s are"} hidden.</strong>{" "}
                {data.plan.key} jobs can open {data.plan.maxApplicants} applicants. Post your next job on a higher plan to see everyone.
              </p>
            </div>
          )}
          {!data.applicants.length && <p className="rounded-2xl bg-white p-8 text-center text-slate-500 shadow-sm">No applicants yet.</p>}
        </>
      )}

      {cvFor && (
        <CvModal name={nameOf(cvFor.applicant)} entry={details[cvFor._id]} onClose={() => setCvFor(null)} />
      )}
    </div>
  );
}