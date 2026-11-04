// import { useEffect, useState } from "react";
// import { MapPin, AlertCircle } from "lucide-react";
// import { toast } from "sonner";
// import { jobsApi, getError } from "../../api";
// import { Spinner, timeAgo } from "./jobUi";

// const STYLE = {
//   Applied: "bg-slate-100 text-slate-700", Shortlisted: "bg-sky-100 text-sky-700",
//   Scheduled: "bg-violet-100 text-violet-700", Interviewed: "bg-indigo-100 text-indigo-700",
//   Offer: "bg-emerald-100 text-emerald-700", Accepted: "bg-emerald-100 text-emerald-700",
//   Rejected: "bg-red-100 text-red-700",
// };
// const STEPS = ["Applied", "Shortlisted", "Interviewed", "Offer"];

// export default function MyApplications() {
//   const [apps, setApps] = useState(null);

//   useEffect(() => {
//     jobsApi.myApplications().then((r) => setApps(r.data.applications)).catch((e) => { toast.error(getError(e)); setApps([]); });
//   }, []);

//   if (!apps) return <Spinner label="Loading your applications…" />;
//   if (!apps.length)
//     return (
//       <div className="rounded-2xl bg-white p-10 text-center shadow-sm">
//         <h2 className="text-xl font-bold">No applications yet</h2>
//         <p className="mt-1 text-slate-500">When you apply for a job, you can follow its progress here.</p>
//       </div>
//     );

//   return (
//     <ul className="space-y-3">
//       {apps.map((a) => {
//         const step = STEPS.indexOf(a.status);
//         return (
//           <li key={a._id} className="rounded-2xl bg-white p-4 shadow-sm sm:p-5">
//             <div className="flex flex-wrap items-start justify-between gap-2">
//               <div className="min-w-0">
//                 <h3 className="truncate font-bold">{a.job?.jobTitle || a.position}</h3>
//                 <p className="text-sm text-slate-500">{a.companyId?.companyName}</p>
//                 {a.job && <p className="mt-0.5 flex items-center gap-1 text-sm text-slate-500"><MapPin size={13} /> {a.job.city}, {a.job.state}</p>}
//               </div>
//               <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STYLE[a.status] || STYLE.Applied}`}>{a.status}</span>
//             </div>

//             {step >= 0 && (
//               <div className="mt-4 flex items-center gap-1" aria-label={`Progress: ${a.status}`}>
//                 {STEPS.map((s, i) => (
//                   <div key={s} className="flex-1">
//                     <div className={`h-1.5 rounded-full ${i <= step ? "bg-orange-500" : "bg-slate-200"}`} />
//                     <p className={`mt-1 hidden text-[11px] sm:block ${i <= step ? "font-semibold text-slate-700" : "text-slate-400"}`}>{s}</p>
//                   </div>
//                 ))}
//               </div>
//             )}
//             {a.status === "Rejected" && a.reasonForRejection && (
//               <p className="mt-3 flex items-start gap-2 rounded-xl bg-red-50 p-3 text-sm text-red-700">
//                 <AlertCircle size={16} className="mt-0.5 shrink-0" /> {a.reasonForRejection}
//               </p>
//             )}
//             <p className="mt-3 text-xs text-slate-400">Applied {timeAgo(a.createdAt)}</p>
//           </li>
//         );
//       })}
//     </ul>
//   );
// }



import { useCallback, useEffect, useState } from "react";
import { MapPin, AlertCircle, Check, X, Wallet, CalendarClock, History, Inbox } from "lucide-react";
import { toast } from "sonner";
import { jobsApi, getError } from "../../api";
import { engageApi } from "./engageApi";
import { Spinner, timeAgo, naira } from "./jobUi";
import ApplicationHistory, { STATUS_STYLE } from "./ApplicationHistory";
import WorkHistoryModal from "./WorkHistoryModal";
import AccountBoostCard from "./AccountBoostCard";

const STEPS = ["Applied", "Shortlisted", "Interviewed", "Offer"];
const RESPONDABLE = ["Shortlisted", "Interviewed", "Scheduled", "Offer"];

/** Accept or reject. Rejecting needs a reason, and the employer sees it. */
function RespondBar({ appId, target, acceptLabel, onDone }) {
  const [declining, setDeclining] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  const send = async (response) => {
    if (response === "reject" && reason.trim().length < 3) return toast.error("Please give a reason");
    setBusy(true);
    try {
      await engageApi.respond(appId, { target, response, reason: reason.trim() });
      toast.success(response === "accept" ? "Accepted" : "Rejected");
      onDone();
    } catch (err) {
      toast.error(getError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-3 space-y-2">
      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={busy} onClick={() => send("accept")}
          className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60">
          <Check size={14} /> {acceptLabel}
        </button>
        <button type="button" disabled={busy} onClick={() => setDeclining((v) => !v)} aria-expanded={declining}
          className="inline-flex items-center gap-1.5 rounded-lg border border-red-300 px-3 py-1.5 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60">
          <X size={14} /> Reject
        </button>
      </div>
      {declining && (
        <div className="space-y-2">
          <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} maxLength={1000}
            placeholder="Why are you rejecting? The employer will see this." aria-label="Reason"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          <button type="button" disabled={busy} onClick={() => send("reject")}
            className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60">
            Send rejection
          </button>
        </div>
      )}
    </div>
  );
}

function PhysicalCard({ app, onDone }) {
  const pi = app.physicalInterview;
  if (!pi?.status) return null;
  const when = new Date(pi.scheduledFor).toLocaleString("en-NG", { dateStyle: "full", timeStyle: "short" });
  return (
    <div className="mt-3 rounded-xl border border-sky-200 bg-sky-50 p-3 text-sm">
      <p className="flex items-center gap-2 font-semibold text-sky-900"><CalendarClock size={16} /> Physical interview invite</p>
      <p className="mt-1 text-slate-700">{when}</p>
      <p className="text-slate-700">{pi.venue}</p>
      {pi.note && <p className="mt-1 whitespace-pre-line text-slate-600">{pi.note}</p>}
      {pi.feePaid && (
        <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
          <Wallet size={12} /> {naira(pi.fee || 4000)} has been paid for you
        </p>
      )}
      {pi.status === "Sent" && <RespondBar appId={app._id} target="physical" acceptLabel="Accept invite" onDone={onDone} />}
      {pi.status === "Accepted" && <p className="mt-2 font-semibold text-emerald-700">You accepted this invite.</p>}
      {pi.status === "Declined" && <p className="mt-2 font-semibold text-red-700">You rejected this invite: {pi.responseReason}</p>}
    </div>
  );
}

export default function MyApplications() {
  const [apps, setApps] = useState(null);
  const [histId, setHistId] = useState(null);
  const [versions, setVersions] = useState({});
  const [showWork, setShowWork] = useState(false);

  const load = useCallback(
    () => jobsApi.myApplications().then((r) => setApps(r.data.applications)).catch((e) => { toast.error(getError(e)); setApps([]); }),
    []
  );
  useEffect(() => { load(); }, [load]);

  const refresh = (id) => { setVersions((v) => ({ ...v, [id]: (v[id] || 0) + 1 })); load(); };

  if (!apps) return <Spinner label="Loading your applications…" />;

  return (
    <div className="space-y-4">
      <AccountBoostCard />

      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-bold">My applications</h2>
        <button type="button" onClick={() => setShowWork(true)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-orange-200 bg-orange-50 px-3 py-1.5 text-sm font-semibold text-orange-700 hover:bg-orange-100">
          <History size={14} /> My work history
        </button>
      </div>

      {!apps.length ? (
        <div className="rounded-2xl bg-white p-10 text-center shadow-sm">
          <h2 className="text-xl font-bold">No applications yet</h2>
          <p className="mt-1 text-slate-500">When you apply for a job, you can follow its progress here.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {apps.map((a) => {
            const step = STEPS.indexOf(a.status);
            const pending = RESPONDABLE.includes(a.status) && a.stageResponse?.response === "Pending";
            const histOpen = histId === a._id;
            return (
              <li key={a._id} className="rounded-2xl bg-white p-4 shadow-sm sm:p-5">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="truncate font-bold">{a.job?.jobTitle || a.position}</h3>
                    <p className="text-sm text-slate-500">{a.companyId?.companyName}</p>
                    {a.job && <p className="mt-0.5 flex items-center gap-1 text-sm text-slate-500"><MapPin size={13} /> {a.job.city}, {a.job.state}</p>}
                  </div>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLE[a.status] || STATUS_STYLE.Applied}`}>{a.status}</span>
                </div>

                {step >= 0 && (
                  <div className="mt-4 flex items-center gap-1" aria-label={`Progress: ${a.status}`}>
                    {STEPS.map((s, i) => (
                      <div key={s} className="flex-1">
                        <div className={`h-1.5 rounded-full ${i <= step ? "bg-orange-500" : "bg-slate-200"}`} />
                        <p className={`mt-1 hidden text-[11px] sm:block ${i <= step ? "font-semibold text-slate-700" : "text-slate-400"}`}>{s}</p>
                      </div>
                    ))}
                  </div>
                )}

                {["Rejected", "Sacked"].includes(a.status) && a.reasonForRejection && (
                  <p className="mt-3 flex items-start gap-2 rounded-xl bg-red-50 p-3 text-sm text-red-700">
                    <AlertCircle size={16} className="mt-0.5 shrink-0" /> {a.reasonForRejection}
                  </p>
                )}
                {a.status === "Declined" && a.reasonForDecline && (
                  <p className="mt-3 rounded-xl bg-slate-100 p-3 text-sm text-slate-700">You rejected this stage: {a.reasonForDecline}</p>
                )}
                {a.stageResponse?.response === "Accepted" && a.status !== "Declined" && (
                  <p className="mt-3 text-sm font-semibold text-emerald-700">You accepted: {a.stageResponse.stage}</p>
                )}

                {pending && (
                  <div className="mt-3 rounded-xl border border-orange-200 bg-orange-50/60 p-3">
                    <p className="text-sm font-semibold text-orange-900">
                      The employer moved you to {a.status}. Do you accept?
                    </p>
                    <RespondBar appId={a._id} target="stage" acceptLabel={a.status === "Offer" ? "Accept offer" : "Accept"} onDone={() => refresh(a._id)} />
                  </div>
                )}

                <PhysicalCard app={a} onDone={() => refresh(a._id)} />

                <div className="mt-3 flex items-center justify-between gap-2">
                  <p className="text-xs text-slate-400">Applied {timeAgo(a.createdAt)}</p>
                  <button type="button" onClick={() => setHistId(histOpen ? null : a._id)} aria-expanded={histOpen}
                    className="inline-flex items-center gap-1.5 text-sm font-semibold text-orange-700">
                    <Inbox size={14} /> Messages and history
                  </button>
                </div>
                {histOpen && <ApplicationHistory appId={a._id} viewer="seeker" refreshKey={versions[a._id] || 0} />}
              </li>
            );
          })}
        </ul>
      )}

      {showWork && <WorkHistoryModal mine onClose={() => setShowWork(false)} />}
    </div>
  );
}