import { useEffect, useState } from "react";
import { ArrowLeft, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { adsApi, getError } from "../../api";
import MediaUpload from "../../utils/MediaUpload";
import { AdCard } from "./AdBanner";
import useAdCheckout from "./useAdCheckout";
import { Spinner, naira, PLACEMENT_LABEL, errText } from "./adUi";

const cls = "w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-orange-600";
const Field = ({ label, error, hint, children }) => (
  <label className="block">
    <span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>
    {children}
    {hint && !error && <span className="mt-1 block text-xs text-slate-500">{hint}</span>}
    {error && <span className="mt-1 block text-xs text-red-600">{error}</span>}
  </label>
);

/**
 * Create or edit an ad.
 *   isStaff (admin / super admin): published free, any length, optional start date
 *   everyone else: pick a package, pay with Paystack, then wait for review
 */
export default function AdForm({ ad, isStaff, onDone, onCancel }) {
  const [packages, setPackages] = useState(null);
  const [f, setF] = useState({
    title: ad?.title || "", description: ad?.description || "", linkUrl: ad?.linkUrl || "", ctaLabel: ad?.ctaLabel || "Learn more",
    placements: ad?.placements || ["dashboard", "public"],
    packageKey: ad?.packageKey && ad.packageKey !== "admin" ? ad.packageKey : "week",
    durationDays: ad?.durationDays || 7, startsAt: ad?.startsAt ? ad.startsAt.slice(0, 10) : "",
  });
  const [media, setMedia] = useState(ad?.mediaUrl ? { url: ad.mediaUrl, publicId: ad.mediaPublicId, type: ad.mediaType } : null);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const { checkout } = useAdCheckout();

  const paid = ad?.paymentStatus === "Paid";
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }));

  useEffect(() => {
    if (isStaff) return;
    adsApi.packages().then((r) => setPackages(r.data.packages)).catch((e) => toast.error(getError(e)));
  }, [isStaff]);

  const togglePlacement = (p) =>
    setF((x) => ({ ...x, placements: x.placements.includes(p) ? x.placements.filter((v) => v !== p) : [...x.placements, p] }));

  const validate = () => {
    const err = {};
    if (f.title.trim().length < 3) err.title = "Enter a title (at least 3 characters)";
    if (!media) err.media = "Upload an image or a video";
    if (!/^https?:\/\//i.test(f.linkUrl.trim())) err.linkUrl = "Enter a link starting with http:// or https://";
    if (!f.placements.length) err.placements = "Choose where the ad should appear";
    setErrors(err);
    if (Object.keys(err).length) toast.error("Please fix the highlighted fields");
    return !Object.keys(err).length;
  };

  const save = async (andSubmit) => {
    if (!validate()) return;
    setBusy(true);
    try {
      const payload = {
        title: f.title.trim(), description: f.description.trim(), linkUrl: f.linkUrl.trim(), ctaLabel: f.ctaLabel.trim(),
        placements: f.placements, mediaType: media.type, mediaUrl: media.url, mediaPublicId: media.publicId,
        ...(isStaff ? { durationDays: Number(f.durationDays), startsAt: f.startsAt || undefined } : { packageKey: f.packageKey }),
      };
      const { data } = ad ? await adsApi.update(ad._id, payload) : await adsApi.create(payload);
      if (isStaff) { toast.success(ad ? "Ad updated" : "Ad published"); return onDone(); }
      if (!andSubmit) { toast.success("Saved as a draft"); return onDone(); }
      await checkout(data.ad); // pays (or resubmits) and shows its own toasts
      onDone();
    } catch (err) { toast.error(errText(err, getError)); }
    finally { setBusy(false); }
  };

  if (!isStaff && !packages) return <Spinner label="Loading…" />;
  const pkg = packages?.find((p) => p.key === f.packageKey);
  const submitLabel = isStaff ? (ad ? "Save changes" : "Publish ad") : paid ? "Send for review" : `Pay ${naira(pkg?.price)} & submit`;

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <button onClick={onCancel} className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900">
        <ArrowLeft size={16} /> Back to ads
      </button>

      <div className="grid gap-5 lg:grid-cols-[1fr_380px]">
        <div className="space-y-5">
          <section className="space-y-4 rounded-2xl bg-white p-4 shadow-sm sm:p-6">
            <h2 className="text-lg font-bold">{ad ? "Edit ad" : "New ad"}</h2>
            <Field label="Title" error={errors.title}><input className={cls} maxLength={80} value={f.title} onChange={set("title")} placeholder="Short and catchy" /></Field>
            <Field label="Description (optional)"><textarea rows={3} maxLength={300} className={cls} value={f.description} onChange={set("description")} /></Field>
            <MediaUpload value={media} onChange={setMedia} error={errors.media} />
            <div className="grid gap-4 sm:grid-cols-[1fr_180px]">
              <Field label="Where should the button go?" error={errors.linkUrl}><input className={cls} value={f.linkUrl} onChange={set("linkUrl")} placeholder="https://example.com/offer" /></Field>
              <Field label="Button text"><input className={cls} maxLength={24} value={f.ctaLabel} onChange={set("ctaLabel")} /></Field>
            </div>
            <fieldset>
              <legend className="mb-2 text-sm font-medium text-slate-700">Where to show it</legend>
              <div className="flex flex-wrap gap-2">
                {Object.entries(PLACEMENT_LABEL).map(([k, label]) => {
                  const on = f.placements.includes(k);
                  return (
                    <button key={k} type="button" aria-pressed={on} onClick={() => togglePlacement(k)}
                      className={`rounded-full border px-3.5 py-1.5 text-sm transition ${on ? "border-orange-600 bg-orange-600 text-white" : "border-slate-200 bg-white text-slate-600 hover:border-orange-300"}`}>{label}</button>
                  );
                })}
              </div>
              {errors.placements && <span className="mt-1 block text-xs text-red-600">{errors.placements}</span>}
            </fieldset>
          </section>

          {isStaff ? (
            <section className="grid gap-4 rounded-2xl bg-white p-4 shadow-sm sm:grid-cols-2 sm:p-6">
              <Field label="Runs for (days)" hint="1 to 365"><input type="number" min="1" max="365" className={cls} value={f.durationDays} onChange={set("durationDays")} /></Field>
              <Field label="Starts on (optional)" hint="Leave empty to start now"><input type="date" className={cls} value={f.startsAt} onChange={set("startsAt")} /></Field>
            </section>
          ) : (
            <section className="rounded-2xl bg-white p-4 shadow-sm sm:p-6">
              <h3 className="font-bold">How long should it run?</h3>
              {paid && <p className="mt-2 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700">This ad is already paid for, so the package can't be changed.</p>}
              <div role="radiogroup" className="mt-3 grid gap-3 sm:grid-cols-3">
                {packages.map((p) => {
                  const on = f.packageKey === p.key;
                  return (
                    <button key={p.key} type="button" role="radio" aria-checked={on} disabled={paid} onClick={() => setF((x) => ({ ...x, packageKey: p.key }))}
                      className={`rounded-2xl border-2 p-4 text-left transition disabled:opacity-60 ${on ? "border-orange-600 bg-orange-50" : "border-slate-200 hover:border-orange-300"}`}>
                      <p className="font-bold">{p.name}</p>
                      <p className="mt-1 text-2xl font-extrabold">{naira(p.price)}</p>
                      {on && <span className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-orange-700"><Check size={14} /> Selected</span>}
                    </button>
                  );
                })}
              </div>
              <p className="mt-3 text-xs text-slate-500">The time starts when an admin approves your ad. If it isn't approved, you can fix it and send it again without paying again.</p>
            </section>
          )}
        </div>

        <aside className="space-y-3 lg:sticky lg:top-24 lg:self-start">
          <h3 className="text-sm font-semibold text-slate-600">Live preview</h3>
          <AdCard preview ad={{ title: f.title, description: f.description, ctaLabel: f.ctaLabel, mediaType: media?.type, mediaUrl: media?.url }} />
        </aside>
      </div>

      <div className="flex flex-wrap justify-end gap-2">
        {!isStaff && !paid && (
          <button disabled={busy} onClick={() => save(false)} className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold hover:bg-slate-50 disabled:opacity-60">Save as draft</button>
        )}
        <button disabled={busy} onClick={() => save(true)} className="inline-flex items-center gap-2 rounded-xl bg-orange-600 px-5 py-2.5 font-semibold text-white hover:bg-orange-700 disabled:opacity-60">
          {busy && <Loader2 size={16} className="animate-spin" />} {submitLabel}
        </button>
      </div>
    </div>
  );
}