import { useCallback, useEffect, useState } from "react";
import { Plus, Pencil, Trash2, CreditCard, Send, AlertCircle, Eye, MousePointerClick, Megaphone } from "lucide-react";
import { toast } from "sonner";
import { adsApi, getError } from "../../api";
import { Spinner, StatusBadge, naira, fmtDate, PLACEMENT_LABEL, errText } from "./adUi";
import { optimize } from "../../utils/cloudinary";
import useAdCheckout from "./useAdCheckout";
import AdForm from "./AdForm";

// For job seekers, employers and agents (admins use AdsReview)
export default function MyAds() {
  const [ads, setAds] = useState(null);
  const [view, setView] = useState(null); // "new" | an ad being edited

  const load = useCallback(async () => {
    try { setAds((await adsApi.mine()).data.ads); }
    catch (err) { toast.error(errText(err, getError)); setAds([]); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const { checkout, busy } = useAdCheckout(load);

  const remove = async (ad) => {
    if (!window.confirm(`Delete "${ad.title}"?`)) return;
    try { await adsApi.remove(ad._id); toast.success("Ad deleted"); load(); }
    catch (err) { toast.error(errText(err, getError)); }
  };

  if (view) return <AdForm ad={view === "new" ? null : view} isStaff={false} onCancel={() => setView(null)} onDone={() => { setView(null); load(); }} />;
  if (!ads) return <Spinner label="Loading your ads…" />;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white p-4 shadow-sm sm:p-5">
        <div>
          <h2 className="text-lg font-bold">Promote yourself or your business</h2>
          <p className="text-sm text-slate-500">Your ad is shown on the dashboard and the public job board. Every ad is reviewed before it goes live.</p>
        </div>
        <button onClick={() => setView("new")} className="inline-flex items-center gap-2 rounded-xl bg-orange-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-orange-700">
          <Plus size={16} /> Create ad
        </button>
      </div>

      {!ads.length ? (
        <div className="rounded-2xl bg-white p-10 text-center shadow-sm">
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-orange-100 text-orange-600"><Megaphone size={22} /></span>
          <h3 className="mt-3 text-lg font-bold">No ads yet</h3>
          <p className="mt-1 text-slate-500">Create your first ad to get in front of more people.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {ads.map((ad) => {
            const unsent = ["Draft", "Rejected"].includes(ad.status);
            const ctr = ad.impressions ? ((ad.clicks / ad.impressions) * 100).toFixed(1) : "0.0";
            return (
              <li key={ad._id} className="overflow-hidden rounded-2xl bg-white shadow-sm sm:flex">
                <div className="h-40 shrink-0 bg-slate-900 sm:h-auto sm:w-56">
                  {ad.mediaType === "video"
                    ? <video src={ad.mediaUrl} muted playsInline className="h-full w-full object-cover" />
                    : <img src={optimize(ad.mediaUrl, 500)} alt="" className="h-full w-full object-cover" />}
                </div>
                <div className="min-w-0 flex-1 p-4 sm:p-5">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <h3 className="truncate text-lg font-bold">{ad.title}</h3>
                    <StatusBadge ad={ad} />
                  </div>
                  <p className="mt-1 text-sm text-slate-500">{ad.placements.map((p) => PLACEMENT_LABEL[p]).join(" · ")} · {ad.durationDays} days · {naira(ad.amount)}</p>

                  {ad.status === "Rejected" && ad.rejectionReason && (
                    <p className="mt-3 flex items-start gap-2 rounded-xl bg-red-50 p-3 text-sm text-red-700">
                      <AlertCircle size={16} className="mt-0.5 shrink-0" /> <span><strong>Why it was rejected:</strong> {ad.rejectionReason}</span>
                    </p>
                  )}
                  {ad.status === "Pending" && <p className="mt-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-700">Waiting for an admin to review it. You'll be notified.</p>}
                  {(ad.isLive || ad.status === "Expired") && (
                    <dl className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm text-slate-600">
                      <div className="flex items-center gap-1.5"><Eye size={14} /> {ad.impressions} views</div>
                      <div className="flex items-center gap-1.5"><MousePointerClick size={14} /> {ad.clicks} clicks ({ctr}%)</div>
                      <div>{ad.isLive ? `Ends ${fmtDate(ad.endsAt)}` : `Ended ${fmtDate(ad.endsAt)}`}</div>
                    </dl>
                  )}

                  <div className="mt-4 flex flex-wrap gap-2">
                    {unsent && (
                      <button disabled={busy} onClick={() => checkout(ad)}
                        className="inline-flex items-center gap-2 rounded-xl bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-700 disabled:opacity-60">
                        {ad.paymentStatus === "Paid" ? <Send size={16} /> : <CreditCard size={16} />}
                        {ad.paymentStatus === "Paid" ? "Send for review" : `Pay ${naira(ad.amount)} & submit`}
                      </button>
                    )}
                    {unsent && (
                      <button onClick={() => setView(ad)} className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold hover:bg-slate-50"><Pencil size={16} /> Edit</button>
                    )}
                    {["Draft", "Rejected", "Expired"].includes(ad.status) && (
                      <button onClick={() => remove(ad)} className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50"><Trash2 size={16} /> Delete</button>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}