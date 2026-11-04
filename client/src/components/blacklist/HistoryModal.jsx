import { useEffect, useState } from "react";
import { Ban, Loader2, RotateCcw } from "lucide-react";
import { blacklistApi, getError } from "../../api";
import { categoryLabel, displayName, formatDate } from "./constants";
import { Modal } from "./ui";

// Timeline of every blacklist / reinstate action for one user
export default function HistoryModal({ user, onClose }) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user) return;
    let alive = true;
    setLoading(true);
    setError("");
    blacklistApi
      .history(user._id)
      .then(({ data }) => alive && setRecords(data.records || []))
      .catch((err) => alive && setError(getError(err)))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [user?._id]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Modal open={Boolean(user)} onClose={onClose} title="Blacklist history" subtitle={user ? displayName(user) : ""}>
      {loading ? (
        <div role="status" className="flex items-center justify-center gap-2 py-10 text-slate-500">
          <Loader2 className="h-5 w-5 animate-spin" /> Loading…
        </div>
      ) : error ? (
        <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {error}
        </p>
      ) : records.length === 0 ? (
        <p className="py-8 text-center text-sm text-slate-500">No history yet.</p>
      ) : (
        <ol className="relative space-y-5 border-l-2 border-slate-100 pl-6">
          {records.map((r) => {
            const blacklisted = r.action === "blacklist";
            return (
              <li key={r._id} className="relative">
                <span
                  className={`absolute -left-[2.1rem] grid h-7 w-7 place-items-center rounded-full ring-4 ring-white ${
                    blacklisted ? "bg-red-100 text-red-600" : "bg-emerald-100 text-emerald-600"
                  }`}
                >
                  {blacklisted ? <Ban className="h-3.5 w-3.5" /> : <RotateCcw className="h-3.5 w-3.5" />}
                </span>
                <p className="text-sm font-bold text-slate-900">
                  {blacklisted ? "Blacklisted" : "Reinstated"}
                  {blacklisted && r.category && (
                    <span className="ml-2 font-medium text-slate-500">· {categoryLabel(r.category)}</span>
                  )}
                </p>
                <p className="mt-1 whitespace-pre-wrap text-sm text-slate-600">{r.reason}</p>
                <p className="mt-1.5 text-xs text-slate-400">
                  {formatDate(r.createdAt)} · by {r.performedByName || "a superadmin"}
                </p>
              </li>
            );
          })}
        </ol>
      )}
    </Modal>
  );
}
