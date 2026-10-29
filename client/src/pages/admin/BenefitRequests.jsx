// import { useEffect, useState } from "react";
// import { Link } from "react-router-dom";
// import { toast } from "sonner";
// import { Search } from "lucide-react";

// import { benefitApi, getError } from "../../api";
// import {
//   CATEGORY_LABELS,
//   EmptyState,
//   PageHeader,
//   Spinner,
//   StatusBadge,
//   fmtDate,
//   fullName,
//   ghostBtn,
//   inputCls,
//   naira,
// } from "../../components/benefits/shared";

// const DETAIL_PATH = (id) => `/admin/benefits/${id}`; // change to match your router

// const TABS = [
//   { id: "", label: "All" },
//   { id: "pending", label: "Pending" },
//   { id: "approved", label: "Approved" },
//   { id: "paid", label: "Paid" },
//   { id: "rejected", label: "Rejected" },
// ];

// export default function BenefitRequests() {
//   const [status, setStatus] = useState("pending");
//   const [search, setSearch] = useState("");
//   const [query, setQuery] = useState("");
//   const [page, setPage] = useState(1);
//   const [data, setData] = useState(null);
//   const [loading, setLoading] = useState(true);

//   // Wait for a pause in typing before searching
//   useEffect(() => {
//     const t = setTimeout(() => {
//       setQuery(search.trim());
//       setPage(1);
//     }, 350);
//     return () => clearTimeout(t);
//   }, [search]);

//   useEffect(() => {
//     setLoading(true);
//     benefitApi.admin
//       .list({ status: status || undefined, search: query || undefined, page })
//       .then(({ data }) => setData(data))
//       .catch((err) => toast.error(getError(err)))
//       .finally(() => setLoading(false));
//   }, [status, query, page]);

//   const counts = data?.counts || {};
//   const totalAll = Object.values(counts).reduce((s, n) => s + n, 0);

//   return (
//     <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
//       <PageHeader title="Benefit requests" text="Review what job seekers have asked for and decide." />

//       <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
//         <div role="tablist" aria-label="Filter by status" className="flex flex-wrap gap-1 rounded-xl bg-slate-100 p-1">
//           {TABS.map((t) => (
//             <button
//               key={t.id || "all"}
//               role="tab"
//               type="button"
//               aria-selected={status === t.id}
//               onClick={() => {
//                 setStatus(t.id);
//                 setPage(1);
//               }}
//               className={`rounded-lg px-3 py-1.5 text-sm font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 ${
//                 status === t.id ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
//               }`}
//             >
//               {t.label}
//               <span className="ml-1.5 text-xs text-slate-500">{t.id ? counts[t.id] ?? 0 : totalAll}</span>
//             </button>
//           ))}
//         </div>

//         <div className="relative w-full sm:w-72">
//           <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
//           <input
//             type="search"
//             value={search}
//             onChange={(e) => setSearch(e.target.value)}
//             placeholder="Name, email, phone or benefit number"
//             aria-label="Search requests"
//             className={`${inputCls} pl-10`}
//           />
//         </div>
//       </div>

//       {loading && !data ? (
//         <Spinner />
//       ) : data?.benefits.length === 0 ? (
//         <EmptyState
//           title="No requests found"
//           text={query ? "Try a different name or number." : "Nothing in this status right now."}
//         />
//       ) : (
//         <>
//           <div className={`overflow-x-auto rounded-2xl border border-slate-200 bg-white ${loading ? "opacity-60" : ""}`}>
//             <table className="w-full min-w-[720px] text-left text-sm">
//               <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
//                 <tr>
//                   <th scope="col" className="px-4 py-3 font-medium">Applicant</th>
//                   <th scope="col" className="px-4 py-3 font-medium">Request</th>
//                   <th scope="col" className="px-4 py-3 font-medium">Amount</th>
//                   <th scope="col" className="px-4 py-3 font-medium">Status</th>
//                   <th scope="col" className="px-4 py-3 font-medium">Submitted</th>
//                   <th scope="col" className="px-4 py-3"><span className="sr-only">Open</span></th>
//                 </tr>
//               </thead>
//               <tbody className="divide-y divide-slate-100">
//                 {data.benefits.map((b) => (
//                   <tr key={b._id} className="hover:bg-primary-50/40">
//                     <td className="px-4 py-3">
//                       <p className="font-medium text-slate-900">{fullName(b.user)}</p>
//                       <p className="text-xs text-slate-500">{b.benefitNumber}</p>
//                       {b.user?.isBlacklisted && (
//                         <span className="mt-1 inline-block rounded bg-red-50 px-1.5 py-0.5 text-[11px] font-medium text-red-700">
//                           Blacklisted
//                         </span>
//                       )}
//                     </td>
//                     <td className="px-4 py-3">
//                       <p className="text-slate-900">{b.title}</p>
//                       <p className="text-xs text-slate-500">{CATEGORY_LABELS[b.category] || b.category}</p>
//                     </td>
//                     <td className="px-4 py-3">
//                       <p className="text-slate-900">{naira(b.amount)}</p>
//                       {b.approvedAmount ? <p className="text-xs text-slate-500">Approved {naira(b.approvedAmount)}</p> : null}
//                     </td>
//                     <td className="px-4 py-3"><StatusBadge status={b.status} /></td>
//                     <td className="px-4 py-3 text-slate-600">{fmtDate(b.createdAt)}</td>
//                     <td className="px-4 py-3 text-right">
//                       <Link
//                         to={DETAIL_PATH(b._id)}
//                         className="font-medium text-primary-700 underline-offset-4 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
//                       >
//                         Review
//                       </Link>
//                     </td>
//                   </tr>
//                 ))}
//               </tbody>
//             </table>
//           </div>

//           <div className="mt-4 flex items-center justify-between text-sm text-slate-600">
//             <span>
//               Page {data.page} of {data.pages} · {data.total} request{data.total === 1 ? "" : "s"}
//             </span>
//             <div className="flex gap-2">
//               <button type="button" className={ghostBtn} disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
//                 Previous
//               </button>
//               <button type="button" className={ghostBtn} disabled={page >= data.pages} onClick={() => setPage((p) => p + 1)}>
//                 Next
//               </button>
//             </div>
//           </div>
//         </>
//       )}
//     </div>
//   );
// }






import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { Search } from "lucide-react";

import { benefitApi, getError } from "../../api";
import {
  CATEGORY_LABELS,
  EmptyState,
  PageHeader,
  Spinner,
  StatusBadge,
  fmtDate,
  fullName,
  ghostBtn,
  inputCls,
  naira,
} from "../../components/benefits/shared";

const DETAIL_PATH = (id) => `/dashboard?tab=benefitDetail&id=${id}`;

const TABS = [
  { id: "", label: "All" },
  { id: "pending", label: "Pending" },
  { id: "approved", label: "Approved" },
  { id: "paid", label: "Paid" },
  { id: "rejected", label: "Rejected" },
];

export default function BenefitRequests() {
  const [status, setStatus] = useState("pending");
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Wait for a pause in typing before searching
  useEffect(() => {
    const t = setTimeout(() => {
      setQuery(search.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setLoading(true);
    benefitApi.admin
      .list({ status: status || undefined, search: query || undefined, page })
      .then(({ data }) => setData(data))
      .catch((err) => toast.error(getError(err)))
      .finally(() => setLoading(false));
  }, [status, query, page]);

  const counts = data?.counts || {};
  const totalAll = Object.values(counts).reduce((s, n) => s + n, 0);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <PageHeader title="Benefit requests" text="Review what job seekers have asked for and decide." />

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div role="tablist" aria-label="Filter by status" className="flex flex-wrap gap-1 rounded-xl bg-slate-100 p-1">
          {TABS.map((t) => (
            <button
              key={t.id || "all"}
              role="tab"
              type="button"
              aria-selected={status === t.id}
              onClick={() => {
                setStatus(t.id);
                setPage(1);
              }}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 ${
                status === t.id ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {t.label}
              <span className="ml-1.5 text-xs text-slate-500">{t.id ? counts[t.id] ?? 0 : totalAll}</span>
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Name, email, phone or benefit number"
            aria-label="Search requests"
            className={`${inputCls} pl-10`}
          />
        </div>
      </div>

      {loading && !data ? (
        <Spinner />
      ) : data?.benefits.length === 0 ? (
        <EmptyState
          title="No requests found"
          text={query ? "Try a different name or number." : "Nothing in this status right now."}
        />
      ) : (
        <>
          <div className={`overflow-x-auto rounded-2xl border border-slate-200 bg-white ${loading ? "opacity-60" : ""}`}>
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
                <tr>
                  <th scope="col" className="px-4 py-3 font-medium">Applicant</th>
                  <th scope="col" className="px-4 py-3 font-medium">Request</th>
                  <th scope="col" className="px-4 py-3 font-medium">Amount</th>
                  <th scope="col" className="px-4 py-3 font-medium">Status</th>
                  <th scope="col" className="px-4 py-3 font-medium">Submitted</th>
                  <th scope="col" className="px-4 py-3"><span className="sr-only">Open</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.benefits.map((b) => (
                  <tr key={b._id} className="hover:bg-primary-50/40">
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-900">{fullName(b.user)}</p>
                      <p className="text-xs text-slate-500">{b.benefitNumber}</p>
                      {b.user?.isBlacklisted && (
                        <span className="mt-1 inline-block rounded bg-red-50 px-1.5 py-0.5 text-[11px] font-medium text-red-700">
                          Blacklisted
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-slate-900">{b.title}</p>
                      <p className="text-xs text-slate-500">{CATEGORY_LABELS[b.category] || b.category}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-slate-900">{naira(b.amount)}</p>
                      {b.approvedAmount ? <p className="text-xs text-slate-500">Approved {naira(b.approvedAmount)}</p> : null}
                    </td>
                    <td className="px-4 py-3"><StatusBadge status={b.status} /></td>
                    <td className="px-4 py-3 text-slate-600">{fmtDate(b.createdAt)}</td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        to={DETAIL_PATH(b._id)}
                        className="font-medium text-primary-700 underline-offset-4 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                      >
                        Review
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex items-center justify-between text-sm text-slate-600">
            <span>
              Page {data.page} of {data.pages} · {data.total} request{data.total === 1 ? "" : "s"}
            </span>
            <div className="flex gap-2">
              <button type="button" className={ghostBtn} disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                Previous
              </button>
              <button type="button" className={ghostBtn} disabled={page >= data.pages} onClick={() => setPage((p) => p + 1)}>
                Next
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}