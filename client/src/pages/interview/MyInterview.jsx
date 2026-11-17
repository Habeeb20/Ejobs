import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Video } from "lucide-react";
import { toast } from "sonner";
import api, { getError } from "../../api";
const Spinner = ({ label }) => <p role="status" className="p-10 text-center text-slate-500">{label}</p>;

const fmt = (d) =>
  new Date(d).toLocaleString(undefined, { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });

// Jobseeker page: put it on your applications/dashboard page or give it its own route
export default function MyInterviews() {
  const [items, setItems] = useState(null);

  useEffect(() => {
    api.get("/interviews/mine")
      .then(({ data }) => setItems(data.interviews))
      .catch((err) => { toast.error(getError(err)); setItems([]); });
  }, []);

  if (!items) return <Spinner label="Loading your interviews…" />;

  if (!items.length)
    return (
      <div className="rounded-2xl bg-white p-10 text-center shadow-sm">
        <h2 className="text-xl font-bold">No interviews yet</h2>
        <p className="mt-1 text-slate-500">When an employer schedules one, it will show up here.</p>
      </div>
    );

  return (
    <ul className="space-y-3">
      {items.map((i) => (
        <li key={i._id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white p-4 shadow-sm">
          <div className="min-w-0">
            <p className="truncate font-semibold">{i.job?.jobTitle || "Interview"}</p>
            {i.employer?.companyName && <p className="text-sm text-slate-600">{i.employer.companyName}</p>}
            <p className="text-sm text-slate-500">{fmt(i.scheduledAt)} · {i.duration} min</p>
            {i.note && <p className="mt-1 text-sm text-slate-600">{i.note}</p>}
          </div>
          <Link to={`/interview/${i._id}`}
            className="inline-flex items-center gap-2 rounded-xl bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-700">
            <Video size={16} /> Join interview
          </Link>
        </li>
      ))}
    </ul>
  );
}