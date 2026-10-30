import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, ExternalLink } from "lucide-react";
import { adsApi } from "../../api";
import { optimize } from "../../utils/cloudinary";

// One ad slide. Also used as the live preview in the ad form.
export function AdCard({ ad, onClick, preview = false }) {
  const Wrapper = preview ? "div" : "a";
  const props = preview ? {} : {
    href: ad.linkUrl, target: "_blank", rel: "noopener noreferrer sponsored", onClick,
  };
  return (
    <Wrapper {...props} className="group relative block aspect-[16/8] min-h-[190px] w-full overflow-hidden rounded-2xl bg-slate-900 text-white sm:aspect-[16/6]">
      {ad.mediaUrl ? (
        ad.mediaType === "video"
          ? <video src={ad.mediaUrl} autoPlay muted loop playsInline className="absolute inset-0 h-full w-full object-cover" />
          : <img src={optimize(ad.mediaUrl, 1200)} alt="" className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]" />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-orange-800 to-orange-950" />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent" />
      <span className="absolute left-3 top-3 rounded-full bg-white/90 px-2.5 py-0.5 text-[11px] font-semibold text-slate-700">Sponsored</span>
      <div className="absolute inset-x-0 bottom-0 p-4 sm:p-5">
        <h3 className="line-clamp-2 text-lg font-extrabold tracking-tight sm:text-2xl">{ad.title || "Your ad title"}</h3>
        {ad.description && <p className="mt-1 line-clamp-2 max-w-xl text-sm text-white/85">{ad.description}</p>}
        <span className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-orange-700">
          {ad.ctaLabel || "Learn more"} <ExternalLink size={14} />
        </span>
      </div>
    </Wrapper>
  );
}

/**
 * Shows live ads for a placement, rotating every 6 seconds. Renders nothing when there are none.
 *   <AdBanner placement="dashboard" />   inside the dashboard overview
 *   <AdBanner placement="public" />      on the public job board
 */
export default function AdBanner({ placement = "public", className = "" }) {
  const [ads, setAds] = useState([]);
  const [i, setI] = useState(0);
  const paused = useRef(false);

  useEffect(() => {
    adsApi.active({ placement, limit: 5 }).then((r) => setAds(r.data.ads)).catch(() => {}); // ads must never break a page
  }, [placement]);

  useEffect(() => {
    if (ads.length < 2) return;
    const t = setInterval(() => { if (!paused.current) setI((n) => (n + 1) % ads.length); }, 2000);
    return () => clearInterval(t);
  }, [ads.length]);

  if (!ads.length) return null;
  const ad = ads[i % ads.length];
  const go = (d) => setI((n) => (n + d + ads.length) % ads.length);

  return (
    <section aria-label="Sponsored" className={`relative ${className}`}
      onMouseEnter={() => (paused.current = true)} onMouseLeave={() => (paused.current = false)}
      onFocus={() => (paused.current = true)} onBlur={() => (paused.current = false)}>
      <AdCard key={ad._id} ad={ad} onClick={() => adsApi.click(ad._id).catch(() => {})} />
      {ads.length > 1 && (
        <>
          <button onClick={() => go(-1)} aria-label="Previous ad" className="absolute left-2 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-white/85 text-slate-700 shadow hover:bg-white"><ChevronLeft size={18} /></button>
          <button onClick={() => go(1)} aria-label="Next ad" className="absolute right-2 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-white/85 text-slate-700 shadow hover:bg-white"><ChevronRight size={18} /></button>
          <div className="absolute bottom-3 right-4 flex gap-1.5">
            {ads.map((a, n) => (
              <button key={a._id} onClick={() => setI(n)} aria-label={`Show ad ${n + 1}`}
                className={`h-1.5 rounded-full transition-all ${n === i % ads.length ? "w-5 bg-white" : "w-1.5 bg-white/50"}`} />
            ))}
          </div>
        </>
      )}
    </section>
  );
}