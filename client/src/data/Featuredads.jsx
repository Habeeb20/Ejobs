import { useEffect, useState } from "react";
import { MapPin, Megaphone } from "lucide-react";
import { jobsApi } from "../api";

// Premium jobs only: the API never returns Basic or Standard jobs here.
export default function FeaturedAds({ onSelect }) {
  const [ads, setAds] = useState([]);

  useEffect(() => {
    jobsApi.ads().then(({ data }) => setAds(data.ads)).catch(() => {}); // ads must never break the page
  }, []);

  if (!ads.length) return null;
  return (
    <section aria-label="Sponsored jobs">
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700">
        <Megaphone size={16} className="text-orange-600" /> Sponsored jobs
      </div>
      <div className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
        {ads.map((j) => (
          <button
            key={j._id}
            onClick={() => onSelect?.(j)}
            className="w-64 shrink-0 snap-start rounded-2xl border border-orange-200 bg-gradient-to-br from-orange-50 to-white p-4 text-left shadow-sm transition hover:shadow-md"
          >
            <span className="rounded-full bg-orange-600 px-2 py-0.5 text-[11px] font-semibold text-white">Sponsored</span>
            <h3 className="mt-2 line-clamp-1 font-bold">{j.jobTitle}</h3>
            <p className="line-clamp-1 text-sm text-slate-500">{j.employer?.companyName}</p>
            <p className="mt-2 flex items-center gap-1 text-sm text-slate-600"><MapPin size={14} /> {j.city}, {j.state}</p>
            <p className="mt-1 text-sm font-semibold text-slate-800">{j.currency} {j.salary}</p>
          </button>
        ))}
      </div>
    </section>
  );
}