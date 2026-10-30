import { useCallback, useEffect, useState } from "react";
import { Plus, Check, X, Pause, Play, Pencil, Trash2, Eye, MousePointerClick, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { adsApi, getError } from "../../api";
import { Spinner, StatusBadge, naira, fmtDate, PLACEMENT_LABEL, errText } from "./adUi";
import { optimize } from "../../utils/cloudinary";
import AdForm from "./AdForm";

const TABS = [
  ["Pending", "In review"], ["Approved", "Live"], ["Paused", "Paused"],
  ["Rejected", "Rejected"], ["Expired", "Expired"], ["all", "All"],
];

// For admins and super admins: review paid ads (grant or reject with a reason) and post free ads
export default function AdsReview({ user }) {
  const [tab, setTab] = useState("Pending");
  const [ads, setAds] = useState([]);
  const [counts, setCounts] = useState({});
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState(null); // "new" | an ad being edited
  const [rejecting, setRejecting] = useState(null);
  const [reason, setReason] = useState("");
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async (status, p = 1) => {
    p === 1 && setLoading(true);
    try {
      const { data } = await adsApi.admin.list({ status, page: p });
      setAds((prev) => (p === 1 ? data.ads : [...prev, ...data.ads]));
      setCounts(data.counts); setPage(p); setHasMore(data.hasMore);
    } catch (err) { toast.error(errText(err, getError)); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(tab); }, [tab, load]);

  const run = async (id, fn, ok) => {
    setBusyId(id);
    try { await fn(); toast.success(ok); await load(tab); }
    catch (err) { toast.error(errText(err, getError)); load(tab); }
    finally { setBusyId(null); }
  };
  const approve = (ad) => run(ad._id, () => adsApi.admin.approve(ad._id), `"${ad.title}" is now live`);
  const toggle = (ad) => run(ad._id, () => adsApi.admin.setState(ad._id, ad.status === "Paused" ? "resume" : "pause"), ad.status === "Paused" ? "Ad resumed" : "Ad paused");
  const remove = (ad) => window.confirm(`Delete "${ad.title}"?`) && run(ad._id, () => adsApi.remove(ad._id), "Ad deleted");
  const reject = async (ad) => {
    if (reason.trim().length < 5) return toast.error("Give the advertiser a reason (at least 5 characters)");
    await run(ad._id, () => adsApi.admin.reject(ad._id, reason.trim()), "Ad rejected and the advertiser was told why");
    setRejecting(null); setReason("");
  };

  if (view) return <AdForm ad={view === "new" ? null : view} isStaff onCancel={() => setView(null)} onDone={() => { setView(null); load(tab); }} />;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="-mx-1 flex gap-1 overflow-x-auto px-1">
          {TABS.map(([key, label]) => (
            <button key={key} onClick={() => setTab(key)} aria-pressed={tab === key}
              className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm font-semibold transition ${tab === key ? "bg-orange-600 text-white" : "bg-white text-slate-600 hover:bg-orange-50"}`}>
              {label} <span className={tab === key ? "text-orange-100" : "text-slate-400"}>{counts[key] ?? 0}</span>
            </button>
          ))}
        </div>
        <button onClick={() => setView("new")} className="inline-flex items-center gap-2 rounded-xl bg-orange-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-orange-700">
          <Plus size={16} /> New ad
        </button>
      </div>

      {loading ? <Spinner label="Loading ads…" /> : !ads.length ? (
        <div className="rounded-2xl bg-white p-10 text-center shadow-sm">
          <h3 className="text-lg font-bold">Nothing here</h3>
          <p className="mt-1 text-slate-500">{tab === "Pending" ? "No ads are waiting for review." : "No ads in this list."}</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {ads.map((ad) => {
            const o = ad.owner || {};
            const mine = o._id === user?._id;
            const name = o.companyName || [o.firstName, o.lastName].filter(Boolean).join(" ") || o.email;
            const busy = busyId === ad._id;
            return (
              <li key={ad._id} className="overflow-hidden rounded-2xl bg-white shadow-sm lg:flex">
                <div className="h-44 shrink-0 bg-slate-900 lg:h-auto lg:w-64">
                  {ad.mediaType === "video"
                    ? <video src={ad.mediaUrl} controls muted playsInline className="h-full w-full object-cover" />
                    : <img src={optimize(ad.mediaUrl, 600)} alt="" className="h-full w-full object-cover" />}
                </div>
                <div className="min-w-0 flex-1 p-4 sm:p-5">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="truncate text-lg font-bold">{ad.title}</h3>
                      <p className="text-sm text-slate-500">{name} · <span className="capitalize">{o.role}</span></p>
                    </div>
                    <StatusBadge ad={ad} />
                  </div>
                  {ad.description && <p className="mt-2 line-clamp-2 text-sm text-slate-600">{ad.description}</p>}
                  <p className="mt-2 break-all text-xs text-slate-500">Goes to: <a href={ad.linkUrl} target="_blank" rel="noopener noreferrer" className="text-orange-700 underline">{ad.linkUrl}</a></p>
                  <p className="mt-1 text-xs text-slate-500">
                    {ad.placements.map((p) => PLACEMENT_LABEL[p]).join(" · ")} · {ad.durationDays} days · {ad.paymentStatus === "Free" ? "Free (admin)" : `${naira(ad.amount)} ${ad.paymentStatus}`}
                    {ad.startsAt && ` · ${fmtDate(ad.startsAt)} to ${fmtDate(ad.endsAt)}`}
                  </p>
                  {ad.status === "Rejected" && ad.rejectionReason && <p className="mt-2 rounded-lg bg-red-50 p-2.5 text-sm text-red-700"><strong>Reason:</strong> {ad.rejectionReason}</p>}
                  {["Approved", "Paused", "Expired"].includes(ad.status) && (
                    <p className="mt-2 flex gap-4 text-sm text-slate-600">
                      <span className="flex items-center gap-1.5"><Eye size={14} /> {ad.impressions}</span>
                      <span className="flex items-center gap-1.5"><MousePointerClick size={14} /> {ad.clicks}</span>
                    </p>
                  )}

                  {rejecting === ad._id ? (
                    <div className="mt-4 space-y-2">
                      <textarea autoFocus rows={3} value={reason} onChange={(e) => setReason(e.target.value)}
                        placeholder="Tell the advertiser what to fix. They will see this."
                        className="w-full rounded-xl border border-slate-300 p-3 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-orange-600" />
                      <div className="flex gap-2">
                        <button disabled={busy} onClick={() => reject(ad)} className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60">Reject with reason</button>
                        <button onClick={() => { setRejecting(null); setReason(""); }} className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100">Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {ad.status === "Pending" && (
                        <button disabled={busy} onClick={() => approve(ad)} className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60">
                          {busy ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />} Approve
                        </button>
                      )}
                      {["Pending", "Approved", "Paused"].includes(ad.status) && (
                        <button onClick={() => { setRejecting(ad._id); setReason(""); }} className="inline-flex items-center gap-2 rounded-xl border border-red-200 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50"><X size={16} /> Reject</button>
                      )}
                      {["Approved", "Paused"].includes(ad.status) && (
                        <button disabled={busy} onClick={() => toggle(ad)} className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold hover:bg-slate-50 disabled:opacity-60">
                          {ad.status === "Paused" ? <><Play size={16} /> Resume</> : <><Pause size={16} /> Pause</>}
                        </button>
                      )}
                      {mine && <button onClick={() => setView(ad)} className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold hover:bg-slate-50"><Pencil size={16} /> Edit</button>}
                      <button disabled={busy} onClick={() => remove(ad)} className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-60"><Trash2 size={16} /> Delete</button>
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {hasMore && (
        <div className="text-center">
          <button onClick={() => load(tab, page + 1)} className="rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold hover:bg-slate-50">Load more</button>
        </div>
      )}
    </div>
  );
}