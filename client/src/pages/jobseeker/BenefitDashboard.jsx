// import { useEffect, useState } from "react";
// import { Link } from "react-router-dom";
// import { toast } from "sonner";
// import { AlertTriangle, CalendarCheck, Copy, MapPin, Plus } from "lucide-react";

// import { benefitApi, getError } from "../../api";
// import {
//   BreakdownBars,
//   CATEGORY_LABELS,
//   Card,
//   EmptyState,
//   PageHeader,
//   PaymentChart,
//   PeriodTabs,
//   Spinner,
//   StatCard,
//   StatusBadge,
//   daysUntil,
//   fmtDate,
//   naira,
//   primaryBtn,
// } from "../../components/benefits/shared";

// const REQUEST_PATH = "/jobseeker/benefits/request"; // change to match your router

// function AttendanceCard({ info }) {
//   if (!info) return null;

//   const left = daysUntil(info.nextAttendanceDue);
//   const overdue = info.absenceFlagged || info.blacklisted;

//   return (
//     <Card title="Venue attendance">
//       {!info.tracked ? (
//         <p className="text-sm text-slate-600">
//           Once a benefit is approved you must be at the venue at least once every{" "}
//           <strong>{info.intervalDays} days</strong>. Missing a visit blacklists your account from all employers.
//         </p>
//       ) : (
//         <div className="space-y-4">
//           {overdue && (
//             <div role="alert" className="flex gap-2.5 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
//               <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
//               <span>
//                 You missed a venue visit, so your account is blacklisted from employers. Visit the venue and ask
//                 the admin to lift it.
//               </span>
//             </div>
//           )}

//           <div className="grid gap-4 sm:grid-cols-3">
//             <div>
//               <p className="text-xs text-slate-500">Next visit due</p>
//               <p className="mt-0.5 font-semibold text-slate-900">{fmtDate(info.nextAttendanceDue)}</p>
//               {!overdue && left !== null && (
//                 <p className={`text-xs ${left <= 2 ? "font-medium text-amber-700" : "text-slate-500"}`}>
//                   {left <= 0 ? "Due today" : `In ${left} day${left === 1 ? "" : "s"}`}
//                 </p>
//               )}
//             </div>
//             <div>
//               <p className="text-xs text-slate-500">Last visit</p>
//               <p className="mt-0.5 font-semibold text-slate-900">{fmtDate(info.lastAttendanceAt)}</p>
//             </div>
//             <div>
//               <p className="text-xs text-slate-500">How often</p>
//               <p className="mt-0.5 font-semibold text-slate-900">Every {info.intervalDays} days</p>
//             </div>
//           </div>

//           {(info.venueName || info.venueAddress) && (
//             <p className="flex items-start gap-2 text-sm text-slate-600">
//               <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary-600" />
//               <span>{[info.venueName, info.venueAddress].filter(Boolean).join(", ")}</span>
//             </p>
//           )}

//           {info.history?.length > 0 && (
//             <div>
//               <p className="mb-2 flex items-center gap-1.5 text-sm font-medium text-slate-800">
//                 <CalendarCheck className="h-4 w-4 text-primary-600" /> Recent visits
//               </p>
//               <ul className="flex flex-wrap gap-2">
//                 {info.history.slice(0, 6).map((h) => (
//                   <li key={h._id} className="rounded-md bg-slate-100 px-2.5 py-1 text-xs text-slate-700">
//                     {fmtDate(h.checkedInAt)}
//                   </li>
//                 ))}
//               </ul>
//             </div>
//           )}
//         </div>
//       )}
//     </Card>
//   );
// }

// export default function BenefitDashboard() {
//   const [period, setPeriod] = useState("monthly");
//   const [benefits, setBenefits] = useState(null);
//   const [benefitNumber, setBenefitNumber] = useState(null);
//   const [stats, setStats] = useState(null);
//   const [attendance, setAttendance] = useState(null);
//   const [statsLoading, setStatsLoading] = useState(false);

//   useEffect(() => {
//     Promise.all([benefitApi.mine(), benefitApi.myAttendance()])
//       .then(([mine, att]) => {
//         setBenefits(mine.data.benefits);
//         setBenefitNumber(mine.data.benefitNumber);
//         setAttendance(att.data);
//       })
//       .catch((err) => {
//         toast.error(getError(err));
//         setBenefits([]);
//       });
//   }, []);

//   useEffect(() => {
//     setStatsLoading(true);
//     benefitApi
//       .myStats(period)
//       .then(({ data }) => setStats(data))
//       .catch((err) => toast.error(getError(err)))
//       .finally(() => setStatsLoading(false));
//   }, [period]);

//   const copyNumber = async () => {
//     try {
//       await navigator.clipboard.writeText(benefitNumber);
//       toast.success("Benefit number copied");
//     } catch {
//       toast.error("Couldn't copy. Select the number and copy it manually.");
//     }
//   };

//   if (benefits === null) return <Spinner />;

//   const by = stats?.summary?.byStatus;
//   const categories = (stats?.categories || []).map((c) => ({
//     label: CATEGORY_LABELS[c.category] || c.category,
//     value: c.amount,
//     note: `${naira(c.amount)} · ${c.count} request${c.count === 1 ? "" : "s"}`,
//   }));
//   const statusRows = by
//     ? Object.entries(by).map(([status, v]) => ({
//         label: status,
//         value: v.count,
//         note: `${v.count} · ${naira(status === "pending" || status === "rejected" ? v.requested : v.approved)}`,
//       }))
//     : [];

//   return (
//     <div className="mx-auto max-w-5xl space-y-6 px-4 py-8 sm:px-6">
//       <PageHeader
//         title="My benefits"
//         text="Request support, follow your requests and see what you've received."
//         action={
//           <Link to={REQUEST_PATH} className={primaryBtn}>
//             <Plus className="h-4 w-4" /> Request a benefit
//           </Link>
//         }
//       />

//       {benefitNumber && (
//         <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-primary-200 bg-primary-50 px-5 py-4">
//           <div>
//             <p className="text-sm text-slate-600">Your benefit number</p>
//             <p className="font-display text-xl font-bold tracking-wider text-slate-900">{benefitNumber}</p>
//           </div>
//           <button
//             type="button"
//             onClick={copyNumber}
//             className="inline-flex items-center gap-2 rounded-lg border border-primary-300 bg-white px-3 py-2 text-sm font-medium text-slate-800 transition hover:bg-primary-100 focus:outline-none focus-visible:ring-4 focus-visible:ring-primary-500/30"
//           >
//             <Copy className="h-4 w-4" /> Copy
//           </button>
//           <p className="w-full text-xs text-slate-600">Give this number to the admin when you visit the venue.</p>
//         </div>
//       )}

//       <AttendanceCard info={attendance} />

//       <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
//         <StatCard label="Total requests" value={stats?.summary?.totalRequests ?? 0} />
//         <StatCard label="Awaiting review" value={by?.pending.count ?? 0} hint={naira(by?.pending.requested)} />
//         <StatCard label="Approved, not yet paid" value={naira(by?.approved.approved)} hint={`${by?.approved.count ?? 0} request(s)`} />
//         <StatCard accent label="Total received" value={naira(stats?.summary?.totalPaid)} hint={`${by?.paid.count ?? 0} payment(s)`} />
//       </div>

//       <Card title="Payments received" action={<PeriodTabs value={period} onChange={setPeriod} />}>
//         {statsLoading && !stats ? <Spinner /> : <PaymentChart series={stats?.payments?.series} />}
//         {stats && (
//           <p className="mt-4 text-sm text-slate-600">
//             In this view: <strong className="text-slate-900">{naira(stats.payments.totals.amount)}</strong> across{" "}
//             {stats.payments.totals.count} payment{stats.payments.totals.count === 1 ? "" : "s"}.
//           </p>
//         )}
//       </Card>

//       <div className="grid gap-6 md:grid-cols-2">
//         <Card title="By status">
//           <BreakdownBars rows={statusRows} />
//         </Card>
//         <Card title="By category">
//           <BreakdownBars rows={categories} />
//         </Card>
//       </div>

//       <Card title="My requests">
//         {benefits.length === 0 ? (
//           <EmptyState
//             title="No requests yet"
//             text="When you request a benefit it will show up here with its status."
//             action={
//               <Link to={REQUEST_PATH} className={primaryBtn}>
//                 Request a benefit
//               </Link>
//             }
//           />
//         ) : (
//           <ul className="divide-y divide-slate-100">
//             {benefits.map((b) => (
//               <li key={b._id} className="py-4 first:pt-0 last:pb-0">
//                 <div className="flex flex-wrap items-start justify-between gap-2">
//                   <div>
//                     <p className="font-semibold text-slate-900">{b.title}</p>
//                     <p className="text-xs text-slate-500">
//                       {b.requestRef} · {CATEGORY_LABELS[b.category] || b.category} · {fmtDate(b.createdAt)}
//                     </p>
//                   </div>
//                   <StatusBadge status={b.status} />
//                 </div>
//                 <p className="mt-2 text-sm text-slate-600">
//                   Requested {naira(b.amount)}
//                   {b.approvedAmount ? ` · Approved ${naira(b.approvedAmount)}` : ""}
//                   {b.paidAt ? ` · Paid ${fmtDate(b.paidAt)}` : ""}
//                 </p>
//                 {b.status === "rejected" && b.rejectionReason && (
//                   <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
//                     Reason: {b.rejectionReason}
//                   </p>
//                 )}
//               </li>
//             ))}
//           </ul>
//         )}
//       </Card>
//     </div>
//   );
// }








import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { AlertTriangle, CalendarCheck, Copy, MapPin, Plus } from "lucide-react";

import { benefitApi, getError } from "../../api";
import {
  BreakdownBars,
  CATEGORY_LABELS,
  Card,
  EmptyState,
  PageHeader,
  PaymentChart,
  PeriodTabs,
  Spinner,
  StatCard,
  StatusBadge,
  daysUntil,
  fmtDate,
  naira,
  primaryBtn,
} from "../../components/benefits/shared";

const REQUEST_PATH = "/dashboard?tab=benefitRequest";

function AttendanceCard({ info }) {
  if (!info) return null;

  const left = daysUntil(info.nextAttendanceDue);
  const overdue = info.absenceFlagged || info.blacklisted;

  return (
    <Card title="Venue attendance">
      {!info.tracked ? (
        <p className="text-sm text-slate-600">
          Once a benefit is approved you must be at the venue at least once every{" "}
          <strong>{info.intervalDays} days</strong>. Missing a visit blacklists your account from all employers.
        </p>
      ) : (
        <div className="space-y-4">
          {overdue && (
            <div role="alert" className="flex gap-2.5 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                You missed a venue visit, so your account is blacklisted from employers. Visit the venue and ask
                the admin to lift it.
              </span>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <p className="text-xs text-slate-500">Next visit due</p>
              <p className="mt-0.5 font-semibold text-slate-900">{fmtDate(info.nextAttendanceDue)}</p>
              {!overdue && left !== null && (
                <p className={`text-xs ${left <= 2 ? "font-medium text-amber-700" : "text-slate-500"}`}>
                  {left <= 0 ? "Due today" : `In ${left} day${left === 1 ? "" : "s"}`}
                </p>
              )}
            </div>
            <div>
              <p className="text-xs text-slate-500">Last visit</p>
              <p className="mt-0.5 font-semibold text-slate-900">{fmtDate(info.lastAttendanceAt)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">How often</p>
              <p className="mt-0.5 font-semibold text-slate-900">Every {info.intervalDays} days</p>
            </div>
          </div>

          {(info.venueName || info.venueAddress) && (
            <p className="flex items-start gap-2 text-sm text-slate-600">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary-600" />
              <span>{[info.venueName, info.venueAddress].filter(Boolean).join(", ")}</span>
            </p>
          )}

          {info.history?.length > 0 && (
            <div>
              <p className="mb-2 flex items-center gap-1.5 text-sm font-medium text-slate-800">
                <CalendarCheck className="h-4 w-4 text-primary-600" /> Recent visits
              </p>
              <ul className="flex flex-wrap gap-2">
                {info.history.slice(0, 6).map((h) => (
                  <li key={h._id} className="rounded-md bg-slate-100 px-2.5 py-1 text-xs text-slate-700">
                    {fmtDate(h.checkedInAt)}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

export default function BenefitDashboard() {
  const [period, setPeriod] = useState("monthly");
  const [benefits, setBenefits] = useState(null);
  const [benefitNumber, setBenefitNumber] = useState(null);
  const [stats, setStats] = useState(null);
  const [attendance, setAttendance] = useState(null);
  const [statsLoading, setStatsLoading] = useState(false);

  useEffect(() => {
    Promise.all([benefitApi.mine(), benefitApi.myAttendance()])
      .then(([mine, att]) => {
        setBenefits(mine.data.benefits);
        setBenefitNumber(mine.data.benefitNumber);
        setAttendance(att.data);
      })
      .catch((err) => {
        toast.error(getError(err));
        setBenefits([]);
      });
  }, []);

  useEffect(() => {
    setStatsLoading(true);
    benefitApi
      .myStats(period)
      .then(({ data }) => setStats(data))
      .catch((err) => toast.error(getError(err)))
      .finally(() => setStatsLoading(false));
  }, [period]);

  const copyNumber = async () => {
    try {
      await navigator.clipboard.writeText(benefitNumber);
      toast.success("Benefit number copied");
    } catch {
      toast.error("Couldn't copy. Select the number and copy it manually.");
    }
  };

  if (benefits === null) return <Spinner />;

  const by = stats?.summary?.byStatus;
  const categories = (stats?.categories || []).map((c) => ({
    label: CATEGORY_LABELS[c.category] || c.category,
    value: c.amount,
    note: `${naira(c.amount)} · ${c.count} request${c.count === 1 ? "" : "s"}`,
  }));
  const statusRows = by
    ? Object.entries(by).map(([status, v]) => ({
        label: status,
        value: v.count,
        note: `${v.count} · ${naira(status === "pending" || status === "rejected" ? v.requested : v.approved)}`,
      }))
    : [];

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-8 sm:px-6">
      <PageHeader
        title="My benefits"
        text="Request support, follow your requests and see what you've received."
        action={
          <Link to={REQUEST_PATH} className={primaryBtn}>
            <Plus className="h-4 w-4" /> Request a benefit
          </Link>
        }
      />

      {benefitNumber && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-primary-200 bg-primary-50 px-5 py-4">
          <div>
            <p className="text-sm text-slate-600">Your benefit number</p>
            <p className="font-display text-xl font-bold tracking-wider text-slate-900">{benefitNumber}</p>
          </div>
          <button
            type="button"
            onClick={copyNumber}
            className="inline-flex items-center gap-2 rounded-lg border border-primary-300 bg-white px-3 py-2 text-sm font-medium text-slate-800 transition hover:bg-primary-100 focus:outline-none focus-visible:ring-4 focus-visible:ring-primary-500/30"
          >
            <Copy className="h-4 w-4" /> Copy
          </button>
          <p className="w-full text-xs text-slate-600">Give this number to the admin when you visit the venue.</p>
        </div>
      )}

      <AttendanceCard info={attendance} />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total requests" value={stats?.summary?.totalRequests ?? 0} />
        <StatCard label="Awaiting review" value={by?.pending.count ?? 0} hint={naira(by?.pending.requested)} />
        <StatCard label="Approved, not yet paid" value={naira(by?.approved.approved)} hint={`${by?.approved.count ?? 0} request(s)`} />
        <StatCard accent label="Total received" value={naira(stats?.summary?.totalPaid)} hint={`${by?.paid.count ?? 0} payment(s)`} />
      </div>

      <Card title="Payments received" action={<PeriodTabs value={period} onChange={setPeriod} />}>
        {statsLoading && !stats ? <Spinner /> : <PaymentChart series={stats?.payments?.series} />}
        {stats && (
          <p className="mt-4 text-sm text-slate-600">
            In this view: <strong className="text-slate-900">{naira(stats.payments.totals.amount)}</strong> across{" "}
            {stats.payments.totals.count} payment{stats.payments.totals.count === 1 ? "" : "s"}.
          </p>
        )}
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card title="By status">
          <BreakdownBars rows={statusRows} />
        </Card>
        <Card title="By category">
          <BreakdownBars rows={categories} />
        </Card>
      </div>

      <Card title="My requests">
        {benefits.length === 0 ? (
          <EmptyState
            title="No requests yet"
            text="When you request a benefit it will show up here with its status."
            action={
              <Link to={REQUEST_PATH} className={primaryBtn}>
                Request a benefit
              </Link>
            }
          />
        ) : (
          <ul className="divide-y divide-slate-100">
            {benefits.map((b) => (
              <li key={b._id} className="py-4 first:pt-0 last:pb-0">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-slate-900">{b.title}</p>
                    <p className="text-xs text-slate-500">
                      {b.requestRef} · {CATEGORY_LABELS[b.category] || b.category} · {fmtDate(b.createdAt)}
                    </p>
                  </div>
                  <StatusBadge status={b.status} />
                </div>
                <p className="mt-2 text-sm text-slate-600">
                  Requested {naira(b.amount)}
                  {b.approvedAmount ? ` · Approved ${naira(b.approvedAmount)}` : ""}
                  {b.paidAt ? ` · Paid ${fmtDate(b.paidAt)}` : ""}
                </p>
                {b.status === "rejected" && b.rejectionReason && (
                  <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                    Reason: {b.rejectionReason}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}