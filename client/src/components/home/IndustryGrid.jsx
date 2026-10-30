import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight, Briefcase, Building2, Code2, Cog, GraduationCap, HeartPulse, Landmark,
  Megaphone, Scale, ShoppingBag, Truck, UtensilsCrossed, Wheat, Wrench, Zap,
} from "lucide-react";
import { statsApi } from "../../api";
import { INDUSTRIES } from "../../utils/jobOptions";


const SHOW = 12;

// Picks an icon from keywords in the industry name; falls back to a briefcase
const ICONS = [
  [/health|medic|pharma|hospital|wellness/i, HeartPulse],
  [/tech|software|it\b|computer|telecom|digital|fintech|commerce/i, Code2],
  [/financ|bank|insur|account/i, Landmark],
  [/educat|school|training|research/i, GraduationCap],
  [/retail|sales|shop|fashion/i, ShoppingBag],
  [/transport|logistic|delivery|shipping|maritime|aviation|automotive|travel|tourism/i, Truck],
  [/food|hotel|hospitality|restaurant|beverage|events/i, UtensilsCrossed],
  [/agri|farm/i, Wheat],
  [/construct|engineer|real estate|property|water/i, Building2],
  [/manufactur|factory|production|printing/i, Cog],
  [/energy|oil|gas|power|mining/i, Zap],
  [/market|advert|media|creative|design|recruit/i, Megaphone],
  [/legal|law|government|public|ngo|non-profit|security/i, Scale],
  [/repair|mainten|clean|facility|waste|environment/i, Wrench],
];
const iconFor = (name) => (ICONS.find(([rx]) => rx.test(name)) || [null, Briefcase])[1];

function Skeleton() {
  return (
    <div className="animate-pulse rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
      <div className="h-11 w-11 rounded-xl bg-slate-100" />
      <div className="mt-4 h-4 w-3/4 rounded bg-slate-100" />
      <div className="mt-2 h-3 w-1/3 rounded bg-slate-100" />
    </div>
  );
}

export default function IndustryGrid() {
  const [counts, setCounts] = useState(null); // { "finance": 4, ... } keyed by lowercase name
  const [all, setAll] = useState(false);

  useEffect(() => {
    let live = true;
    statsApi.industries()
      .then(({ data }) => {
        if (!live) return;
        const map = {};
        (data.industries || []).forEach((r) => { map[r.name.trim().toLowerCase()] = { name: r.name, count: r.count }; });
        setCounts(map);
      })
      .catch(() => live && setCounts({})); // still show the list, with zero counts
    return () => { live = false; };
  }, []);

  // Your industry list with live counts, plus any older industry names found in jobs but not in the list.
  // Busiest first, then A to Z.
  const rows = useMemo(() => {
    if (!counts) return null;
    const known = new Set(INDUSTRIES.map((n) => n.toLowerCase()));
    const extra = Object.entries(counts).filter(([k]) => !known.has(k)).map(([, v]) => v.name);
    return [...INDUSTRIES, ...extra]
      .map((name) => ({ name, count: counts[name.toLowerCase()]?.count || 0 }))
      .sort((a, b) => b.count - a.count || (a.name === "Other") - (b.name === "Other") || a.name.localeCompare(b.name));
  }, [counts]);

  const visible = rows ? (all ? rows : rows.slice(0, SHOW)) : [];

  return (
    <section aria-label="Jobs by industry" className="px-4 py-10 sm:px-6 sm:py-14">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 text-center">
          <span className="text-xs font-bold uppercase tracking-widest text-orange-600">Browse by industry</span>
          <h2 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
            Find jobs in your field
          </h2>
        </div>

        <div className="grid grid-cols-2 gap-4 min-[480px]:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {!rows
            ? Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} />)
            : visible.map(({ name, count }) => {
                const Icon = iconFor(name);
                return (
                  <Link
                    key={name}
                    to={`/jobs?industry=${encodeURIComponent(name)}`}
                    className="group flex items-center gap-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100 transition duration-200 hover:-translate-y-1 hover:shadow-lg hover:ring-orange-200 focus:outline-none focus-visible:ring-4 focus-visible:ring-orange-200"
                  >
                 <span className="hidden h-12 w-12 shrink-0 place-items-center rounded-xl bg-orange-50 text-orange-600 transition group-hover:bg-orange-600 group-hover:text-white sm:grid">
  <Icon className="h-6 w-6" aria-hidden="true" />
</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-bold text-slate-900 transition group-hover:text-orange-700">{name}</span>
                      <span className="text-sm text-slate-500">
                        <b className={count ? "text-orange-700" : "text-slate-400"}>{count.toLocaleString("en-NG")}</b>{" "}
                        open job{count === 1 ? "" : "s"}
                      </span>
                    </span>
                    <ArrowRight className="h-4 w-4 shrink-0 text-slate-300 transition group-hover:translate-x-1 group-hover:text-orange-600" />
                  </Link>
                );
              })}
        </div>

        {rows && rows.length > SHOW && (
          <div className="mt-8 text-center">
            <button
              type="button"
              onClick={() => setAll((v) => !v)}
              className="rounded-xl border border-slate-300 bg-white px-6 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-orange-300 hover:text-orange-700"
            >
              {all ? "Show fewer industries" : `Show all ${rows.length} industries`}
            </button>
          </div>
        )}
      </div>
    </section>
  );
}