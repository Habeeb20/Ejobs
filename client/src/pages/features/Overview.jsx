import { useEffect, useState } from "react";
import { ArrowUpRight, Gift, PlusSquare, Search } from "lucide-react";
import { toast } from "sonner";
import { overviewApi, getError } from "../../api";
import { Spinner } from "./jobUi";
import FeaturedAds from "../../data/FeaturedAds";

// One overview for every role: the server decides which tiles and lists to send.
export default function Overview({ user, go }) {
  const [data, setData] = useState(null);

  useEffect(() => {
    overviewApi.get().then((r) => setData(r.data)).catch((e) => { toast.error(getError(e)); setData({ tiles: [], lists: [], role: user?.role }); });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (!data) return <Spinner label="Loading your overview…" />;

  const name = user?.firstName || user?.companyName || "there";
  const action = { employer: ["Post a job", "postJob", PlusSquare], jobseeker: ["Browse jobs", "jobs", Search] }[data.role];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-gradient-to-r from-orange-600 to-orange-500 p-5 text-white shadow-sm sm:p-6">
        <div>
          <p className="text-sm text-orange-100">Welcome back</p>
          <h2 className="text-2xl font-extrabold tracking-tight">{name}</h2>
        </div>
        {action && (
          <button onClick={() => go?.(action[1])} className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-orange-700 hover:bg-orange-50">
            {(() => { const Icon = action[2]; return <Icon size={16} />; })()} {action[0]}
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {data.tiles.map((t) => {
          const Tag = t.go ? "button" : "div";
          return (
            <Tag key={t.label} onClick={t.go ? () => go?.(t.go) : undefined}
              className={`rounded-2xl bg-white p-4 text-left shadow-sm ${t.go ? "transition hover:shadow-md" : ""}`}>
              <div className="flex items-center justify-between text-slate-400">
                {t.label === "Loyalty points" ? <Gift size={16} className="text-orange-600" /> : <span />}
                {t.go && <ArrowUpRight size={16} />}
              </div>
              <p className="mt-2 text-2xl font-extrabold tracking-tight">{t.value}</p>
              <p className="text-sm text-slate-500">{t.label}</p>
              {t.hint && <p className="mt-0.5 text-xs text-slate-400">{t.hint}</p>}
            </Tag>
          );
        })}
      </div>

      {!!data.lists.length && (
        <div className="grid gap-4 lg:grid-cols-2">
          {data.lists.map((l) => (
            <section key={l.title} className="rounded-2xl bg-white p-4 shadow-sm sm:p-5">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="font-bold">{l.title}</h3>
                {l.go && <button onClick={() => go?.(l.go)} className="text-sm font-semibold text-orange-700 hover:underline">View all</button>}
              </div>
              {l.items.length ? (
                <ul className="divide-y divide-slate-100">
                  {l.items.map((it, i) => (
                    <li key={i} className="flex items-center justify-between gap-3 py-2.5">
                      <div className="min-w-0"><p className="truncate font-medium">{it.title}</p>{it.subtitle && <p className="truncate text-sm text-slate-500">{it.subtitle}</p>}</div>
                      {it.tag && <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">{it.tag}</span>}
                    </li>
                  ))}
                </ul>
              ) : <p className="py-6 text-center text-sm text-slate-400">{l.empty}</p>}
            </section>
          ))}
        </div>
      )}

      {data.role === "jobseeker" && <FeaturedAds onSelect={() => go?.("jobs")} />}
    </div>
  );
}