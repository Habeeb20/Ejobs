import { useEffect, useState } from "react";
import { X, MapPin } from "lucide-react";
import { toast } from "sonner";
import { getError } from "../../api";
import { engageApi } from "./engageApi";
import { Spinner } from "./jobUi";
import { STATUS_STYLE, fmtTime } from "./ApplicationHistory";

/**
 * Employer: <WorkHistoryModal seekerId={id} name="Ada Obi" onClose={...} />
 * Jobseeker (own history): <WorkHistoryModal mine onClose={...} />
 */
export default function WorkHistoryModal({ seekerId, mine = false, name, onClose }) {
  const [data, setData] = useState(null);

  useEffect(() => {
    (mine ? engageApi.myWorkHistory() : engageApi.workHistory(seekerId))
      .then((r) => setData(r.data))
      .catch((e) => { toast.error(getError(e)); onClose(); });
  }, [seekerId, mine]); // eslint-disable-line react-hooks/exhaustive-deps

  const s = data?.summary;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/50 p-4" role="dialog" aria-modal="true" aria-label="Work history">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-5 shadow-xl sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold">{mine ? "My work history" : `${name || "Candidate"}'s work history`}</h2>
            <p className="text-sm text-slate-500">Every job on the platform, with how each application ended and why.</p>
          </div>
          <button onClick={onClose} aria-label="Close" className="rounded-lg p-1 text-slate-500 hover:bg-slate-100"><X size={18} /></button>
        </div>

        {!data ? <Spinner label="Loading work history…" /> : (
          <>
            <dl className="mt-4 grid grid-cols-2 gap-2 text-sm sm:grid-cols-5">
              {[["Applications", s.total], ["Hired", s.hired], ["Rejected", s.rejected], ["Sacked", s.sacked], ["Declined", s.declined]].map(([k, v]) => (
                <div key={k} className="rounded-xl bg-slate-50 p-3">
                  <dt className="text-xs text-slate-500">{k}</dt>
                  <dd className="text-lg font-bold">{v}</dd>
                </div>
              ))}
            </dl>

            {data.items.length === 0 ? (
              <p className="mt-6 text-center text-sm text-slate-500">No applications on the platform yet.</p>
            ) : (
              <ul className="mt-4 space-y-3">
                {data.items.map((it) => (
                  <li key={it._id} className="rounded-xl border border-slate-200 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-bold text-slate-900">{it.jobTitle}</p>
                        <p className="text-sm text-slate-600">{it.company}</p>
                        {it.location && <p className="flex items-center gap-1 text-xs text-slate-500"><MapPin size={12} /> {it.location}</p>}
                      </div>
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLE[it.status] || STATUS_STYLE.Applied}`}>{it.status}</span>
                    </div>
                    <p className="mt-1 text-xs text-slate-400">
                      {it.source === "invited" ? "Shortlisted by the employer" : "Applied"} {fmtTime(it.appliedAt)}
                      {it.hiredAt && ` · Hired ${fmtTime(it.hiredAt)}`}
                    </p>
                    {it.closingReason && (
                      <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                        <strong>{it.status === "Declined" ? "Candidate's reason: " : "Reason: "}</strong>{it.closingReason}
                      </p>
                    )}
                    {it.timeline.length > 0 && (
                      <ol className="mt-3 space-y-2 border-l-2 border-orange-200 pl-4">
                        {it.timeline.map((e) => (
                          <li key={e._id} className="relative">
                            <span className="absolute -left-[22px] top-1.5 h-2 w-2 rounded-full bg-orange-500" />
                            <p className="text-sm text-slate-800">{e.title}</p>
                            {e.note && <p className="text-xs text-slate-500">{e.note}</p>}
                            <p className="text-xs text-slate-400">{fmtTime(e.at)}</p>
                          </li>
                        ))}
                      </ol>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>
    </div>
  );
}