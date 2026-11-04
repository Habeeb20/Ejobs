import { useEffect, useState } from "react";
import { Mail, CheckCheck } from "lucide-react";
import { toast } from "sonner";
import { getError } from "../../api";
import { engageApi } from "./engageApi";
import { Spinner } from "./jobUi";

export const STATUS_STYLE = {
  Applied: "bg-slate-100 text-slate-700",
  Shortlisted: "bg-sky-100 text-sky-700",
  Scheduled: "bg-violet-100 text-violet-700",
  Interviewed: "bg-indigo-100 text-indigo-700",
  Offer: "bg-emerald-100 text-emerald-700",
  Accepted: "bg-emerald-100 text-emerald-700",
  Hired: "bg-green-100 text-green-800",
  Rejected: "bg-red-100 text-red-700",
  Declined: "bg-red-100 text-red-700",
  Sacked: "bg-red-200 text-red-800",
};

export const fmtTime = (d) =>
  new Date(d).toLocaleString("en-NG", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });

const ACTOR = { employer: "Employer", seeker: "Candidate", system: "System" };

/** viewer: "employer" | "seeker". Change refreshKey to reload after something happened. */
export default function ApplicationHistory({ appId, viewer = "employer", refreshKey = 0 }) {
  const [data, setData] = useState(null);
  const [tab, setTab] = useState("messages");

  useEffect(() => {
    let live = true;
    setData(null);
    engageApi.history(appId)
      .then((r) => live && setData(r.data))
      .catch((e) => { toast.error(getError(e)); if (live) setData({ messages: [], events: [] }); });
    return () => { live = false; };
  }, [appId, refreshKey]);

  const tabBtn = (key, label) => (
    <button type="button" onClick={() => setTab(key)}
      className={`rounded-lg px-3 py-1 text-sm font-semibold ${tab === key ? "bg-orange-100 text-orange-800" : "text-slate-500 hover:bg-slate-100"}`}>
      {label}
    </button>
  );

  return (
    <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50/60 p-3">
      <div className="flex gap-1">
        {tabBtn("messages", `Messages${data ? ` (${data.messages.length})` : ""}`)}
        {tabBtn("timeline", "Timeline")}
      </div>

      {!data ? <Spinner label="Loading…" /> : tab === "messages" ? (
        data.messages.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">
            {viewer === "employer" ? "You haven't sent this candidate any messages yet." : "No messages from the employer yet."}
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {data.messages.map((m) => (
              <li key={m._id} className="rounded-lg bg-white p-3 ring-1 ring-slate-200">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-slate-900">{m.subject}</p>
                  {m.stage && <span className="rounded-full bg-orange-50 px-2 py-0.5 text-xs font-semibold text-orange-700">{m.stage}</span>}
                </div>
                <p className="mt-1 whitespace-pre-line text-sm text-slate-700">{m.body}</p>
                <p className="mt-2 flex items-center gap-2 text-xs text-slate-400">
                  {fmtTime(m.createdAt)}
                  {m.emailed && <span className="inline-flex items-center gap-1"><Mail size={12} /> Emailed</span>}
                  {viewer === "employer" && m.readAt && <span className="inline-flex items-center gap-1"><CheckCheck size={12} /> Read</span>}
                </p>
              </li>
            ))}
          </ul>
        )
      ) : data.events.length === 0 ? (
        <p className="mt-3 text-sm text-slate-500">Nothing has happened on this application yet.</p>
      ) : (
        <ol className="mt-3 space-y-3 border-l-2 border-orange-200 pl-4">
          {data.events.map((e) => (
            <li key={e._id} className="relative">
              <span className="absolute -left-[22px] top-1.5 h-2.5 w-2.5 rounded-full bg-orange-500" />
              <p className="text-sm font-semibold text-slate-900">{e.title}</p>
              {e.note && <p className="text-sm text-slate-600">{e.note}</p>}
              <p className="text-xs text-slate-400">{ACTOR[e.actor]} · {fmtTime(e.createdAt)}</p>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}