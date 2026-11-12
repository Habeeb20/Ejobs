// import { useEffect, useState } from "react";
// import { Link } from "react-router-dom";
// import { Building2, BadgeCheck, MapPin, Search, Briefcase, Users } from "lucide-react";
// import { toast } from "sonner";
// import { employersApi, getError } from "../../api";
// import { Spinner } from "../features/jobUi";

// export default function EmployerList() {
//   const [q, setQ] = useState("");
//   const [search, setSearch] = useState("");
//   const [verified, setVerified] = useState("");
//   const [sort, setSort] = useState("newest");
//   const [page, setPage] = useState(1);
//   const [data, setData] = useState(null);

//   // debounce typing
//   useEffect(() => { const t = setTimeout(() => { setSearch(q); setPage(1); }, 350); return () => clearTimeout(t); }, [q]);

//   useEffect(() => {
//     setData(null);
//     employersApi.list({ search, verified: verified || undefined, sort, page, limit: 12 })
//       .then((r) => setData(r.data))
//       .catch((e) => { toast.error(getError(e)); setData({ employers: [], total: 0, pages: 1 }); });
//   }, [search, verified, sort, page]);

//   const sel = "rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm";
//   return (
//     <div>
//       <div className="flex flex-wrap items-center  gap-2">
//         <div className="relative min-w-[12rem] flex-1">
//           <Search size={15} className="absolute left-3 top-3 text-slate-400" />
//           <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search company or state…" className={`${sel} w-full pl-9`} />
//         </div>
//         <select value={verified} onChange={(e) => { setVerified(e.target.value); setPage(1); }} className={sel}>
//           <option value="">All employers</option><option value="true">Verified</option><option value="false">Not verified</option>
//         </select>
//         <select value={sort} onChange={(e) => setSort(e.target.value)} className={sel}>
//           <option value="newest">Newest</option><option value="oldest">Oldest</option><option value="name">Name A–Z</option><option value="followers">Most followed</option>
//         </select>
//       </div>

//       {!data ? <Spinner label="Loading employers…" /> : (
//         <>
//           <p className="mt-3 text-sm text-slate-500">{data.total} employers</p>
//           {!data.employers.length ? (
//             <div className="mt-3 rounded-2xl bg-white p-10 text-center text-slate-500 shadow-sm">No employers match your search.</div>
//           ) : (
//             <ul className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
//               {data.employers.map((e) => (
//                 <li key={e._id}>
//                   <Link to={`/employers/${e._id}`} className="block h-full rounded-2xl bg-white p-4 shadow-sm transition hover:shadow-md">
//                     <div className="flex items-start gap-3">
//                       {e.avatar ? <img src={e.avatar} alt="" className="h-12 w-12 rounded-xl object-cover" /> :
//                         <div className="grid h-12 w-12 place-items-center rounded-xl bg-orange-100 text-orange-600"><Building2 size={22} /></div>}
//                       <div className="min-w-0 flex-1">
//                         <p className="flex items-center gap-1 font-bold"><span className="truncate">{e.companyName || "Unnamed company"}</span>
//                           {e.businessVerified && <BadgeCheck size={16} className="shrink-0 text-emerald-600" />}
//                           </p>
//                         <p className="truncate text-xs text-slate-500">{e.employerType}{e.size ? ` · ${e.size}` : ""}</p>
//                         <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-slate-500"><MapPin size={12} />{[e.localGovernment, e.state].filter(Boolean).join(", ")}</p>
//                       </div>
//                     </div>
//                     <div className="mt-4 grid grid-cols-3 gap-2 text-center">
//                       <Stat icon={<Briefcase size={12} />} label="Jobs" value={e.jobsPosted} sub={`${e.jobsOnline} online`} />
//                       <Stat icon={<Users size={12} />} label="Applications" value={e.applications} />
//                       <Stat label="Hired" value={e.hired} />
//                     </div>
//                   </Link>
//                 </li>
//               ))}
//             </ul>
//           )}
//           {data.pages > 1 && (
//             <div className="mt-4 flex items-center justify-center gap-3 text-sm">
//               <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="rounded-lg bg-white px-3 py-1.5 shadow-sm disabled:opacity-40">Previous</button>
//               <span className="text-slate-500">Page {data.page} of {data.pages}</span>
//               <button disabled={page >= data.pages} onClick={() => setPage(page + 1)} className="rounded-lg bg-white px-3 py-1.5 shadow-sm disabled:opacity-40">Next</button>
//             </div>
//           )}
//         </>
//       )}
//     </div>
//   );
// }

// function Stat({ icon, label, value, sub }) {
//   return (
//     <div className="rounded-xl bg-slate-50  py-2">
//       <p className="text-lg font-bold">{value}</p>
//       <p className="flex items-center justify-center gap-1 text-[11px] text-slate-500">{icon}{label}</p>
//       {sub && <p className="text-[10px] text-slate-400">{sub}</p>}
//     </div>
//   );
// }




import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Building2, BadgeCheck, MapPin, Search, Briefcase, Users, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { employersApi, getError } from "../../api";
import { Spinner } from "../features/jobUi";

export default function EmployerList() {
  const [q, setQ] = useState("");
  const [search, setSearch] = useState("");
  const [verified, setVerified] = useState("");
  const [sort, setSort] = useState("newest");
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);

  // debounce typing
  useEffect(() => { const t = setTimeout(() => { setSearch(q); setPage(1); }, 350); return () => clearTimeout(t); }, [q]);

  useEffect(() => {
    setData(null);
    employersApi.list({ search, verified: verified || undefined, sort, page, limit: 12 })
      .then((r) => setData(r.data))
      .catch((e) => { toast.error(getError(e)); setData({ employers: [], total: 0, pages: 1 }); });
  }, [search, verified, sort, page]);

  const sel = "rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm";
  return (
    <div>
      <header className="relative mb-6 overflow-hidden rounded-3xl bg-gradient-to-br from-orange-50 via-white to-amber-50 px-5 py-8 ring-1 ring-orange-100 sm:px-8 sm:py-10">
        <div aria-hidden="true" className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-orange-200/40 blur-3xl" />
        <div aria-hidden="true" className="pointer-events-none absolute -bottom-20 -left-10 h-48 w-48 rounded-full bg-amber-200/40 blur-3xl" />

        <div className="relative max-w-2xl">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-wider text-orange-700 shadow-sm ring-1 ring-orange-100">
            <Sparkles size={13} /> Companies on EJobs
          </span>
          <h1 className="mt-4 text-3xl font-extrabold leading-tight tracking-tight text-slate-900 sm:text-4xl lg:text-5xl">
            Meet the employers{" "}
            <span className="bg-gradient-to-r from-orange-600 to-amber-500 bg-clip-text text-transparent">
              hiring right now
            </span>
          </h1>
          <p className="mt-3 text-base leading-relaxed text-slate-600 sm:text-lg">
            Browse verified companies, see how many jobs they have open, and follow the ones you'd love to work for.
          </p>
        </div>
      </header>

      <div className="flex flex-wrap items-center  gap-2">
        <div className="relative min-w-[12rem] flex-1">
          <Search size={15} className="absolute left-3 top-3 text-slate-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search company or state…" className={`${sel} w-full pl-9`} />
        </div>
        <select value={verified} onChange={(e) => { setVerified(e.target.value); setPage(1); }} className={sel}>
          <option value="">All employers</option><option value="true">Verified</option><option value="false">Not verified</option>
        </select>
        <select value={sort} onChange={(e) => setSort(e.target.value)} className={sel}>
          <option value="newest">Newest</option><option value="oldest">Oldest</option><option value="name">Name A–Z</option><option value="followers">Most followed</option>
        </select>
      </div>

      {!data ? <Spinner label="Loading employers…" /> : (
        <>
          <p className="mt-3 text-sm text-slate-500">{data.total} employers</p>
          {!data.employers.length ? (
            <div className="mt-3 rounded-2xl bg-white p-10 text-center text-slate-500 shadow-sm">No employers match your search.</div>
          ) : (
            <ul className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {data.employers.map((e) => (
                <li key={e._id}>
                  <Link to={`/employers/${e._id}`} className="block h-full rounded-2xl bg-white p-4 shadow-sm transition hover:shadow-md">
                    <div className="flex items-start gap-3">
                      {e.avatar ? <img src={e.avatar} alt="" className="h-12 w-12 rounded-xl object-cover" /> :
                        <div className="grid h-12 w-12 place-items-center rounded-xl bg-orange-100 text-orange-600"><Building2 size={22} /></div>}
                      <div className="min-w-0 flex-1">
                        <p className="flex items-center gap-1 font-bold"><span className="truncate">{e.companyName || "Unnamed company"}</span>
                          {e.businessVerified && <BadgeCheck size={16} className="shrink-0 text-emerald-600" />}
                          </p>
                        <p className="truncate text-xs text-slate-500">{e.employerType}{e.size ? ` · ${e.size}` : ""}</p>
                        <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-slate-500"><MapPin size={12} />{[e.localGovernment, e.state].filter(Boolean).join(", ")}</p>
                      </div>
                    </div>
                    <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                      <Stat icon={<Briefcase size={12} />} label="Jobs" value={e.jobsPosted} sub={`${e.jobsOnline} online`} />
                      <Stat icon={<Users size={12} />} label="Applications" value={e.applications} />
                      <Stat label="Hired" value={e.hired} />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          {data.pages > 1 && (
            <div className="mt-4 flex items-center justify-center gap-3 text-sm">
              <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="rounded-lg bg-white px-3 py-1.5 shadow-sm disabled:opacity-40">Previous</button>
              <span className="text-slate-500">Page {data.page} of {data.pages}</span>
              <button disabled={page >= data.pages} onClick={() => setPage(page + 1)} className="rounded-lg bg-white px-3 py-1.5 shadow-sm disabled:opacity-40">Next</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function Stat({ icon, label, value, sub }) {
  return (
    <div className="rounded-xl bg-slate-50  py-2">
      <p className="text-lg font-bold">{value}</p>
      <p className="flex items-center justify-center gap-1 text-[11px] text-slate-500">{icon}{label}</p>
      {sub && <p className="text-[10px] text-slate-400">{sub}</p>}
    </div>
  );
}