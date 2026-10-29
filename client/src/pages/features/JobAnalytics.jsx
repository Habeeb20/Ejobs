// import { useEffect, useState } from "react";
// import { ArrowLeft, Eye, Users, Heart, Target } from "lucide-react";
// import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, BarChart, Bar, PieChart, Pie, Cell } from "recharts";
// import { toast } from "sonner";
// import { jobsApi, getError } from "../../api";
// import { PlanBadge, Spinner, LockedNotice } from "./jobUi";

// const PIE = ["#E4510B", "#0ea5e9", "#10b981", "#f59e0b", "#8b5cf6", "#ef4444", "#64748b"];

// const Tile = ({ icon: Icon, label, value }) => (
//   <div className="rounded-2xl bg-white p-4 shadow-sm">
//     <span className="grid h-9 w-9 place-items-center rounded-xl bg-orange-100 text-orange-600"><Icon size={18} /></span>
//     <p className="mt-3 text-2xl font-extrabold">{value}</p>
//     <p className="text-sm text-slate-500">{label}</p>
//   </div>
// );
// const Card = ({ title, children }) => (
//   <section className="rounded-2xl bg-white p-4 shadow-sm sm:p-5">
//     <h3 className="mb-3 font-semibold">{title}</h3>
//     <div className="h-60">{children}</div>
//   </section>
// );

// export default function JobAnalytics({ job, onBack }) {
//   const [data, setData] = useState(null);
//   const [locked, setLocked] = useState(false);

//   useEffect(() => {
//     jobsApi.analytics(job._id)
//       .then((r) => setData(r.data))
//       .catch((e) => {
//         if (e.response?.data?.code === "PLAN_UPGRADE_REQUIRED") setLocked(true);
//         else { toast.error(getError(e)); onBack(); }
//       });
//   }, [job._id]); // eslint-disable-line react-hooks/exhaustive-deps

//   return (
//     <div className="space-y-4">
//       <button onClick={onBack} className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900">
//         <ArrowLeft size={16} /> Back to my jobs
//       </button>
//       <div className="flex flex-wrap items-center gap-3">
//         <h2 className="text-xl font-bold">{job.jobTitle}</h2><PlanBadge type={job.jobType} />
//       </div>

//       {locked && <LockedNotice title="Analytics need Standard or Premium" text="Charts for applications, statuses and candidate match quality are available when you post on Standard or Premium." />}
//       {!locked && !data && <Spinner label="Crunching the numbers…" />}

//       {data && (
//         <>
//           <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
//             <Tile icon={Eye} label="Views" value={data.totals.views} />
//             <Tile icon={Users} label="Applicants" value={data.totals.applicants} />
//             <Tile icon={Heart} label="Likes" value={data.totals.likes} />
//             <Tile icon={Target} label="Average match" value={data.totals.avgMatch != null ? `${data.totals.avgMatch}%` : "-"} />
//           </div>

//           <Card title="Applications in the last 14 days">
//             <ResponsiveContainer width="100%" height="100%">
//               <AreaChart data={data.perDay} margin={{ left: -20, right: 8, top: 8 }}>
//                 <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#E4510B" stopOpacity={0.35} /><stop offset="100%" stopColor="#E4510B" stopOpacity={0} /></linearGradient></defs>
//                 <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
//                 <XAxis dataKey="label" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
//                 <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
//                 <Tooltip />
//                 <Area type="monotone" dataKey="applications" stroke="#E4510B" strokeWidth={2} fill="url(#g)" />
//               </AreaChart>
//             </ResponsiveContainer>
//           </Card>

//           <div className="grid gap-4 md:grid-cols-2">
//             <Card title="Candidate match quality">
//               <ResponsiveContainer width="100%" height="100%">
//                 <BarChart data={data.matchBuckets} margin={{ left: -20, right: 8, top: 8 }}>
//                   <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
//                   <XAxis dataKey="label" tick={{ fontSize: 11 }} />
//                   <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
//                   <Tooltip />
//                   <Bar dataKey="count" fill="#E4510B" radius={[6, 6, 0, 0]} />
//                 </BarChart>
//               </ResponsiveContainer>
//             </Card>

//             <Card title="Applicants by status">
//               {data.byStatus.length ? (
//                 <ResponsiveContainer width="100%" height="100%">
//                   <PieChart>
//                     <Pie data={data.byStatus} dataKey="count" nameKey="status" innerRadius={50} outerRadius={85} paddingAngle={2}>
//                       {data.byStatus.map((_, i) => <Cell key={i} fill={PIE[i % PIE.length]} />)}
//                     </Pie>
//                     <Tooltip />
//                   </PieChart>
//                 </ResponsiveContainer>
//               ) : <p className="grid h-full place-items-center text-sm text-slate-400">No applicants yet</p>}
//             </Card>
//           </div>
//         </>
//       )}
//     </div>
//   );
// }



import { useEffect, useState } from "react";
import { ArrowLeft, Eye, Users, Heart, Target, Share2 } from "lucide-react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, BarChart, Bar, PieChart, Pie, Cell } from "recharts";
import { toast } from "sonner";
import { jobsApi, getError } from "../../api";
import { PlanBadge, Spinner, LockedNotice } from "./jobUi";

const PIE = ["#E4510B", "#0ea5e9", "#10b981", "#f59e0b", "#8b5cf6", "#ef4444", "#64748b"];

const Tile = ({ icon: Icon, label, value }) => (
  <div className="rounded-2xl bg-white p-4 shadow-sm">
    <span className="grid h-9 w-9 place-items-center rounded-xl bg-orange-100 text-orange-600"><Icon size={18} /></span>
    <p className="mt-3 text-2xl font-extrabold">{value}</p>
    <p className="text-sm text-slate-500">{label}</p>
  </div>
);
const Card = ({ title, children }) => (
  <section className="rounded-2xl bg-white p-4 shadow-sm sm:p-5">
    <h3 className="mb-3 font-semibold">{title}</h3>
    <div className="h-60">{children}</div>
  </section>
);

export default function JobAnalytics({ job, onBack }) {
  const [data, setData] = useState(null);
  const [locked, setLocked] = useState(false);

  useEffect(() => {
    jobsApi.analytics(job._id)
      .then((r) => setData(r.data))
      .catch((e) => {
        if (e.response?.data?.code === "PLAN_UPGRADE_REQUIRED") setLocked(true);
        else { toast.error(getError(e)); onBack(); }
      });
  }, [job._id]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="space-y-4">
      <button onClick={onBack} className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900">
        <ArrowLeft size={16} /> Back to my jobs
      </button>
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-xl font-bold">{job.jobTitle}</h2><PlanBadge type={job.jobType} />
      </div>

      {locked && <LockedNotice title="Analytics need Standard or Premium" text="Charts for applications, statuses and candidate match quality are available when you post on Standard or Premium." />}
      {!locked && !data && <Spinner label="Crunching the numbers…" />}

      {data && (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
            <Tile icon={Eye} label="Views" value={data.totals.views} />
            <Tile icon={Users} label="Applicants" value={data.totals.applicants} />
            <Tile icon={Heart} label="Likes" value={data.totals.likes} />
            <Tile icon={Share2} label="Shares" value={data.totals.shares ?? 0} />
            <Tile icon={Target} label="Average match" value={data.totals.avgMatch != null ? `${data.totals.avgMatch}%` : "-"} />
          </div>

          <Card title="Applications in the last 14 days">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.perDay} margin={{ left: -20, right: 8, top: 8 }}>
                <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#E4510B" stopOpacity={0.35} /><stop offset="100%" stopColor="#E4510B" stopOpacity={0} /></linearGradient></defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Area type="monotone" dataKey="applications" stroke="#E4510B" strokeWidth={2} fill="url(#g)" />
              </AreaChart>
            </ResponsiveContainer>
          </Card>

          <div className="grid gap-4 md:grid-cols-2">
            <Card title="Candidate match quality">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.matchBuckets} margin={{ left: -20, right: 8, top: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#E4510B" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Card>

            <Card title="Applicants by status">
              {data.byStatus.length ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={data.byStatus} dataKey="count" nameKey="status" innerRadius={50} outerRadius={85} paddingAngle={2}>
                      {data.byStatus.map((_, i) => <Cell key={i} fill={PIE[i % PIE.length]} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : <p className="grid h-full place-items-center text-sm text-slate-400">No applicants yet</p>}
            </Card>
          </div>
        </>
      )}
    </div>
  );
}