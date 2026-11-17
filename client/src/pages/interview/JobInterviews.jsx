import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Copy, Video, X } from "lucide-react";
import { toast } from "sonner";
import api, { getError } from "../../api";
const Spinner = ({ label }) => <p role="status" className="p-10 text-center text-slate-500">{label}</p>;

const fmt = (d) =>
  new Date(d).toLocaleString(undefined, { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });

export default function JobInterviews({ job, onBack }) {
  const [items, setItems] = useState(null);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get(`/interviews/job/${job._id}`);
      setItems(data.interviews);
    } catch (err) {
      toast.error(getError(err));
      setItems([]);
    }
  }, [job._id]);
  useEffect(() => { load(); }, [load]);

  const copy = async (id) => {
    await navigator.clipboard.writeText(`${window.location.origin}/interview/${id}`);
    toast.success("Interview link copied");
  };

  const cancel = async (id) => {
    if (!window.confirm("Cancel this interview?")) return;
    try {
      await api.delete(`/interviews/${id}`);
      toast.success("Interview cancelled");
      load();
    } catch (err) {
      toast.error(getError(err));
    }
  };

  if (!items) return <Spinner label="Loading interviews…" />;

  return (
    <div>
      <button onClick={onBack} className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900">
        <ArrowLeft size={16} /> Back to my jobs
      </button>
      <h2 className="text-xl font-bold">Interviews for {job.jobTitle}</h2>
      <p className="mt-1 text-sm text-slate-500">The room opens 15 minutes before the start time.</p>

      {!items.length ? (
        <div className="mt-4 rounded-2xl bg-white p-10 text-center shadow-sm">
          <p className="text-slate-500">No interviews scheduled. Open Applicants and choose Schedule interview on a candidate.</p>
        </div>
      ) : (
        <ul className="mt-4 space-y-3">
          {items.map((i) => {
            const cancelled = i.status === "Cancelled";
            return (
              <li key={i._id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white p-4 shadow-sm">
                <div className="min-w-0">
                  <p className="truncate font-semibold">{[i.applicant?.firstName, i.applicant?.lastName].filter(Boolean).join(" ") || "Candidate"}</p>
                  <p className="text-sm text-slate-500">
                    {fmt(i.scheduledAt)} · {i.duration} min{cancelled && " · Cancelled"}
                  </p>
                </div>
                {!cancelled && (
                  <div className="flex flex-wrap gap-2">
                    <button onClick={() => copy(i._id)}
                      className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold hover:bg-slate-50">
                      <Copy size={16} /> Copy link
                    </button>
                    <Link to={`/interview/${i._id}`}
                      className="inline-flex items-center gap-2 rounded-xl bg-orange-600 px-3 py-2 text-sm font-semibold text-white hover:bg-orange-700">
                      <Video size={16} /> Join
                    </Link>
                    <button onClick={() => cancel(i._id)} aria-label="Cancel interview"
                      className="grid h-9 w-9 place-items-center rounded-xl border border-slate-200 text-slate-500 hover:bg-red-50 hover:text-red-600">
                      <X size={16} />
                    </button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}