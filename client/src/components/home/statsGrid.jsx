// import { useEffect, useRef, useState } from "react";
// import { Briefcase, FileText, HandshakeIcon, Building2, UserCheck, Users } from "lucide-react";
// import { statsApi } from "../../api";

// // Counts up from 0 to the target once, and skips the animation for people who prefer reduced motion
// function useCountUp(target, run) {
//   const [value, setValue] = useState(0);
//   useEffect(() => {
//     if (!run) return undefined;
//     if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches || target === 0) {
//       setValue(target);
//       return undefined;
//     }
//     let raf;
//     const start = performance.now();
//     const duration = 1200;
//     const tick = (now) => {
//       const p = Math.min(1, (now - start) / duration);
//       setValue(Math.round(target * (1 - Math.pow(1 - p, 3)))); // ease-out
//       if (p < 1) raf = requestAnimationFrame(tick);
//     };
//     raf = requestAnimationFrame(tick);
//     return () => cancelAnimationFrame(raf);
//   }, [target, run]);
//   return value;
// }

// const ITEMS = [
//   { key: "totalUsers", label: "Total users", icon: Users, tone: "bg-orange-50 text-orange-600" },
//   { key: "jobseekers", label: "Job seekers", icon: UserCheck, tone: "bg-emerald-50 text-emerald-600" },
//   { key: "employers", label: "Employers", icon: Building2, tone: "bg-blue-50 text-blue-600" },
//   { key: "applications", label: "Applications", icon: FileText, tone: "bg-violet-50 text-violet-600" },
//   { key: "employed", label: "Employed", icon: HandshakeIcon, tone: "bg-rose-50 text-rose-600" },
//   { key: "jobsLast24h", label: "Jobs posted (24h)", icon: Briefcase, tone: "bg-amber-50 text-amber-600" },
// ];

// function StatCard({ item, value, ready }) {
//   const shown = useCountUp(value, ready);
//   const Icon = item.icon;
//   return (
//     <div className="group rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100 transition duration-200 hover:-translate-y-1 hover:shadow-lg hover:ring-orange-200">
//       <span className={`grid h-11 w-4 place-items-center rounded-xl ${item.tone}`}>
//         <Icon className="h-5 w-5" aria-hidden="true" />
//       </span>
//       <p className="mt-4 text-3xl font-extrabold tracking-tight text-slate-900 tabular-nums">
//         {ready ? shown.toLocaleString("en-NG") : "–"}
//       </p>
//       <p className="mt-1 text-sm font-medium text-slate-500">{item.label}</p>
//     </div>
//   );
// }

// function SkeletonCard() {
//   return (
//     <div className="animate-pulse rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
//       <div className="h-11 w-11 rounded-xl bg-slate-100" />
//       <div className="mt-4 h-8 w-24 rounded bg-slate-100" />
//       <div className="mt-2 h-4 w-28 rounded bg-slate-100" />
//     </div>
//   );
// }

// export default function StatsGrid() {
//   const [stats, setStats] = useState(null);
//   const [failed, setFailed] = useState(false);
//   const reqId = useRef(0);

//   useEffect(() => {
//     const id = ++reqId.current;
//     statsApi
//       .overview()
//       .then(({ data }) => id === reqId.current && setStats(data.stats))
//       .catch(() => id === reqId.current && setFailed(true));
//     return () => { reqId.current++; };
//   }, []);

//   if (failed) return null; // a stats strip isn't worth an error message on a landing page

//   return (
//     <section aria-label="Platform statistics" className="px-4 py-10 sm:px-6 sm:py-14">
//       <div className="mx-auto max-w-7xl">
//         <div className="mb-6 text-center">
//           <span className="text-xs font-bold uppercase tracking-widest text-orange-600">Our impact</span>
//           <h2 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
//             Trusted by people looking for work and people hiring
//           </h2>
//         </div>
//         <div className="grid grid-cols-3 gap-4 md:grid-cols-3 lg:grid-cols-6">
//           {stats
//             ? ITEMS.map((item) => <StatCard key={item.key} item={item} value={stats[item.key] ?? 0} ready />)
//             : ITEMS.map((item) => <SkeletonCard key={item.key} />)}
//         </div>
//       </div>
//     </section>
//   );
// }

import { Briefcase, Building2, Clock, FileText, HandshakeIcon, Repeat, UserCheck, Users } from "lucide-react";
import useStats from "../../hooks/useStats";
import useCountUp from "../../hooks/useCountUp";

// `short` is the label used on phones, where four cards share one row
const ITEMS = [
  { key: "totalUsers", label: "Total users", short: "Users", icon: Users, tone: "bg-orange-50 text-orange-600" },
  { key: "jobseekers", label: "Job seekers", short: "Seekers", icon: UserCheck, tone: "bg-emerald-50 text-emerald-600" },
  { key: "jobChangers", label: "Job changers", short: "Changers", icon: Repeat, tone: "bg-teal-50 text-teal-600" },
  { key: "employers", label: "Employers", short: "Employers", icon: Building2, tone: "bg-blue-50 text-blue-600" },
  { key: "totalJobs", label: "Total jobs", short: "Jobs", icon: Briefcase, tone: "bg-sky-50 text-sky-600" },
  { key: "jobsLast24h", label: "Jobs posted (24h)", short: "New (24h)", icon: Clock, tone: "bg-amber-50 text-amber-600" },
  { key: "applications", label: "Applications", short: "Applied", icon: FileText, tone: "bg-violet-50 text-violet-600" },
  { key: "employed", label: "Employed", short: "Employed", icon: HandshakeIcon, tone: "bg-rose-50 text-rose-600" },
];

function StatCard({ item, value }) {
  const shown = useCountUp(value, true);
  const Icon = item.icon;
  return (
    <div
      title={item.label}
      className="group flex min-w-0 flex-col items-center rounded-xl bg-white p-2 text-center shadow-sm ring-1 ring-slate-100 transition duration-200 hover:-translate-y-1 hover:shadow-lg hover:ring-orange-200 sm:items-start sm:rounded-2xl sm:p-5 sm:text-left xl:p-4"
    >
      <span className={`grid h-8 w-8 place-items-center rounded-lg sm:h-11 sm:w-11 sm:rounded-xl ${item.tone}`}>
        <Icon className="h-4 w-4 sm:h-5 sm:w-5" aria-hidden="true" />
      </span>
      <p className="mt-2 max-w-full truncate text-base font-extrabold tracking-tight text-slate-900 tabular-nums sm:mt-4 sm:text-2xl">
        {shown.toLocaleString("en-NG")}
      </p>
      <p className="mt-0.5 text-[10px] font-semibold leading-tight text-slate-500 sm:mt-1 sm:text-sm sm:font-medium">
        <span className="sm:hidden">{item.short}</span>
        <span className="hidden sm:inline">{item.label}</span>
      </p>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="flex animate-pulse flex-col items-center rounded-xl bg-white p-2 shadow-sm ring-1 ring-slate-100 sm:items-start sm:rounded-2xl sm:p-5 xl:p-4">
      <div className="h-8 w-8 rounded-lg bg-slate-100 sm:h-11 sm:w-11 sm:rounded-xl" />
      <div className="mt-2 h-5 w-10 rounded bg-slate-100 sm:mt-4 sm:h-8 sm:w-20" />
      <div className="mt-1 h-3 w-12 rounded bg-slate-100 sm:mt-2 sm:h-4 sm:w-24" />
    </div>
  );
}

export default function StatsGrid() {
  const { stats, failed } = useStats();

  if (failed) return null; // a stats strip isn't worth an error message on a landing page

  return (
    <section aria-label="Platform statistics" className="px-3 py-10 sm:px-6 sm:py-14">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 text-center">
          <span className="text-xs font-bold uppercase tracking-widest text-orange-600">Our impact</span>
          <h2 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
            Trusted by people looking for work and people hiring
          </h2>
        </div>

        {/* 8 cards: 4 per row (2 rows) on phones, tablets and small laptops · all 8 in one row from 1280px */}
        <div className="grid grid-cols-4 gap-2 sm:gap-3 lg:gap-4 xl:grid-cols-8">
          {stats
            ? ITEMS.map((item) => <StatCard key={item.key} item={item} value={stats[item.key] ?? 0} />)
            : ITEMS.map((item) => <SkeletonCard key={item.key} />)}
        </div>
      </div>
    </section>
  );
}