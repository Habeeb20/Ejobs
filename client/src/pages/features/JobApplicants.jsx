


import { useCallback, useEffect, useState } from "react";
import {
  ArrowLeft, ChevronDown, History, Lock, Mail, MapPinned, Phone, ScrollText, Sparkles, User, Video, Zap, Inbox,
} from "lucide-react";
import { toast } from "sonner";
import { jobsApi, getError } from "../../api";
import { engageApi } from "./engageApi";
import { PlanBadge, Spinner, naira } from "./jobUi";
import { BoostBadge } from "./BoostModal";
import ApplicantProfile, { nameOf } from "./ApplicantProfile";
import MessageFields, { emptyMessage } from "./MessageFields";
import ApplicationHistory from "./ApplicationHistory";
import PhysicalInterviewModal from "./PhysicalInterviewModal";
import WorkHistoryModal from "./WorkHistoryModal";
import { TalentCard } from "./TalentSearch";
import { CvModal } from "../profile/tabs/cv/CvViewer";
import ScheduleInterviewModal from "../interview/ScheduleInterviewModal";
const SETTABLE = ["Shortlisted", "Interviewed", "Scheduled", "Offer", "Hired", "Sacked", "Rejected"];
const NEEDS_REASON = ["Rejected", "Sacked"];
const RESPONDABLE = ["Shortlisted", "Interviewed", "Scheduled", "Offer"];

function StatusControl({ app, onChanged, onSchedule }) {
  const [value, setValue] = useState(app.status);
  const [reason, setReason] = useState("");
  const [mail, setMail] = useState(emptyMessage);
  const [busy, setBusy] = useState(false);
  const dirty = value !== app.status;
  const needsReason = NEEDS_REASON.includes(value);

  if (["Declined", "Sacked"].includes(app.status))
    return <p className="mt-3 text-sm text-slate-500">This application is closed ({app.status}).</p>;

  const save = async () => {
    if (needsReason && reason.trim().length < 3) return toast.error("Give the candidate a reason");
    if (mail.on && !mail.body.trim()) return toast.error("Write the message or turn it off");
    setBusy(true);
    try {
      await engageApi.setStatus(app._id, {
        status: value,
        reason: reason.trim(),
        subject: mail.on ? mail.subject.trim() : "",
        message: mail.on ? mail.body.trim() : "",
      });
      toast.success(`Marked as ${value}`);
      onChanged(app._id, value, reason.trim());
      setReason("");
      setMail(emptyMessage);
    } catch (err) { toast.error(getError(err)); setValue(app.status); }
    finally { setBusy(false); }
  };

  return (
    <div className="mt-3 space-y-2">
      <div className="flex flex-wrap items-center gap-2">
<select value={value} aria-label="Applicant status"
  onChange={(e) => {
    if (e.target.value === "Scheduled" && app.status !== "Scheduled") return onSchedule();
    setValue(e.target.value);
  }}
  className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm">

          {[...new Set([app.status, ...SETTABLE])].map((s) => <option key={s}>{s}</option>)}
        </select>
        {dirty && needsReason && (
          <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason (required, the candidate sees it)"
            className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-1.5 text-sm" />
        )}
        {dirty && (
          <button disabled={busy} onClick={save} className="rounded-lg bg-orange-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-orange-700 disabled:opacity-60">Save</button>
        )}
      </div>
      {dirty && <MessageFields value={mail} onChange={setMail} />}
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

const actionBtn = (active) =>
  `inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-semibold transition ${
    active ? "border-orange-300 bg-orange-100 text-orange-800" : "border-orange-200 bg-orange-50 text-orange-700 hover:bg-orange-100"
  }`;

// What the candidate answered, and where the physical interview stands
function Notes({ a, onPay }) {
  const r = a.stageResponse;
  const pi = a.physicalInterview;
  return (
    <div className="mt-3 space-y-1.5">
      {a.priority && (
        <p className="inline-flex items-center gap-1 rounded-full bg-orange-50 px-2.5 py-0.5 text-xs font-semibold text-orange-700"><Zap size={12} /> Boosted jobseeker</p>
      )}
      {a.source === "invited" && (
        <p className="rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-600">You shortlisted this candidate from talent search.</p>
      )}
      {r?.response === "Accepted" && a.status !== "Declined" && (
        <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">Candidate accepted ({r.stage}).</p>
      )}
      {a.status === "Declined" && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          Candidate rejected ({r?.stage || "this stage"}): {a.reasonForDecline}
        </p>
      )}
      {["Rejected", "Sacked"].includes(a.status) && a.reasonForRejection && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{a.status}: {a.reasonForRejection}</p>
      )}
      {pi?.status === "AwaitingPayment" && (
        <p className="flex flex-wrap items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Physical interview saved, but the {naira(4000)} fee isn't paid yet, so the candidate hasn't been told.
          <button type="button" onClick={onPay} className="font-semibold underline">Pay now</button>
        </p>
      )}
      {pi?.status === "Sent" && (
        <p className="rounded-lg bg-sky-50 px-3 py-2 text-sm text-sky-800">Physical interview invite sent ({naira(4000)} paid). Waiting for the candidate.</p>
      )}
      {pi?.status === "Accepted" && (
        <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">Candidate accepted the physical interview.</p>
      )}
      {pi?.status === "Declined" && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">Candidate declined the physical interview: {pi.responseReason}</p>
      )}
    </div>
  );
}

function Suggestions({ job }) {
  const [state, setState] = useState({ loading: true });
  useEffect(() => {
    engageApi.suggestions(job._id)
      .then((r) => setState({ items: r.data.suggestions }))
      .catch((e) => setState({ error: getError(e) }));
  }, [job._id]);

  if (state.loading) return <Spinner label="Finding matching candidates…" />;
  if (state.error) return <p role="alert" className="text-sm text-red-600">{state.error}</p>;
  if (!state.items.length) return <p className="rounded-xl bg-white p-4 text-sm text-slate-500">No matching jobseekers yet. Check back as more people join.</p>;
  return (
    <ul className="space-y-3">
      {state.items.map((s) => (
        <TalentCard key={s._id} seeker={s} matchScore={s.matchScore} jobs={[{ _id: job._id, jobTitle: job.jobTitle }]} />
      ))}
    </ul>
  );
}

export default function JobApplicants({ job, onBack }) {
  const [data, setData] = useState(null);
  const [open, setOpen] = useState(null);           // "why this match" panel
  const [profileId, setProfileId] = useState(null); // application whose profile is expanded
  const [histId, setHistId] = useState(null);       // application whose mail history is open
  const [cvFor, setCvFor] = useState(null);         // application shown in the CV modal
  const [physFor, setPhysFor] = useState(null);     // application for the physical interview modal
  const [workFor, setWorkFor] = useState(null);     // application whose work history is open
  const [showSuggest, setShowSuggest] = useState(false);
  const [versions, setVersions] = useState({});     // appId -> number, bumps the history panel
  const [details, setDetails] = useState({});       // appId -> { loading } | { error } | { data }
const [videoFor, setVideoFor] = useState(null);
  const load = useCallback(
    () => jobsApi.applicants(job._id).then((r) => setData(r.data)).catch((e) => { toast.error(getError(e)); onBack(); }),
    [job._id] // eslint-disable-line react-hooks/exhaustive-deps
  );
  useEffect(() => { load(); }, [load]);

  const bump = (id) => setVersions((v) => ({ ...v, [id]: (v[id] || 0) + 1 }));

  const onChanged = (id, status, reason) => {
    setData((d) => ({
      ...d,
      applicants: d.applicants.map((a) =>
        a._id === id
          ? {
              ...a, status,
              reasonForRejection: NEEDS_REASON.includes(status) ? reason : "",
              stageResponse: { stage: status, response: RESPONDABLE.includes(status) ? "Pending" : "None" },
            }
          : a
      ),
    }));
    bump(id);
  };

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
        <BoostBadge plan={data?.boost || job.boost?.plan} />
      </div>

      {!data ? <Spinner label="Loading applicants…" /> : (
        <>
          <p className="text-sm text-slate-500">
            {data.total} applicant{data.total === 1 ? "" : "s"} ·{" "}
            {data.plan.matchScore ? "boosted jobseekers first, then best match" : "boosted jobseekers first, then oldest"}
          </p>

          {data.boost === "Reach" && (
            <div className="rounded-2xl border border-orange-200 bg-orange-50/60 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="flex items-center gap-2 text-sm font-semibold text-orange-900">
                  <Sparkles size={16} /> Reach boost: every applicant is unlocked
                </p>
                <button type="button" onClick={() => setShowSuggest((v) => !v)} aria-expanded={showSuggest} className={actionBtn(showSuggest)}>
                  Suggested candidates <ChevronDown size={14} className={showSuggest ? "rotate-180" : ""} />
                </button>
              </div>
              {showSuggest && <div className="mt-3"><Suggestions job={job} /></div>}
            </div>
          )}

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
              const histOpen = histId === a._id;
              const closed = ["Declined", "Sacked", "Rejected"].includes(a.status);
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
                    <button type="button" onClick={() => setWorkFor(a)} className={actionBtn(false)}>
                      <History size={14} /> Work history
                    </button>
                    <button type="button" onClick={() => setHistId(histOpen ? null : a._id)} aria-expanded={histOpen} className={actionBtn(histOpen)}>
                      <Inbox size={14} /> Messages
                    </button>
                {!closed && (
  <button type="button" onClick={() => setVideoFor(a)} className={actionBtn(false)}>
    <Video size={14} /> Video interview
  </button>
)}
                    {!closed && !["Sent", "Accepted"].includes(a.physicalInterview?.status) && (
                      <button type="button" onClick={() => setPhysFor(a)} className={actionBtn(false)}>
                        <MapPinned size={14} /> Physical interview
                      </button>
                    )}
                    {p.email && <a href={`mailto:${p.email}`} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-sm hover:bg-slate-50"><Mail size={14} /> Email</a>}
                    {p.phoneNumber && <a href={`tel:${p.phoneNumber}`} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-sm hover:bg-slate-50"><Phone size={14} /> Call</a>}
                    {a.matchBreakdown && (
                      <button onClick={() => setOpen(isOpen ? null : a._id)} className="ml-auto inline-flex items-center gap-1 text-sm font-semibold text-orange-700">
                        Why this match <ChevronDown size={16} className={isOpen ? "rotate-180" : ""} />
                      </button>
                    )}
                  </div>

                  <Notes a={a} onPay={() => setPhysFor(a)} />

                  {profileOpen && <ApplicantProfile entry={details[a._id]} app={a} />}
                  {histOpen && <ApplicationHistory appId={a._id} viewer="employer" refreshKey={versions[a._id] || 0} />}

             <StatusControl app={a} onChanged={onChanged} onSchedule={() => setVideoFor(a)} />

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
                {data.plan.key} jobs can open {data.plan.maxApplicants} applicants. Boost this job with Reach to unlock everyone, or post your next job on a higher plan.
              </p>
            </div>
          )}
          {!data.applicants.length && <p className="rounded-2xl bg-white p-8 text-center text-slate-500 shadow-sm">No applicants yet.</p>}
        </>
      )}

      {videoFor && (
  <ScheduleInterviewModal
    application={videoFor} candidateName={nameOf(videoFor.applicant)}
    onClose={() => setVideoFor(null)}
    onDone={() => { const id = videoFor._id; setVideoFor(null); bump(id); load(); }}
  />
)}

      {cvFor && (
        <CvModal name={nameOf(cvFor.applicant)} entry={details[cvFor._id]} onClose={() => setCvFor(null)} />
      )}
      {physFor && (
        <PhysicalInterviewModal
          app={physFor} name={nameOf(physFor.applicant)}
          onClose={() => setPhysFor(null)}
          onDone={() => { const id = physFor._id; setPhysFor(null); bump(id); load(); }}
        />
      )}
      {workFor && (
        <WorkHistoryModal seekerId={workFor.applicant?._id} name={nameOf(workFor.applicant)} onClose={() => setWorkFor(null)} />
      )}
    </div>
  );
}




















