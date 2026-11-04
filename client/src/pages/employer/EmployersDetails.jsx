import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, BadgeCheck, Building2, Ban, Rocket } from "lucide-react";
import { toast } from "sonner";
import { employersApi, getError } from "../../api";
import { Spinner, timeAgo } from "../features/jobUI";

const STATUS_COLOR = {
  Applied: "bg-slate-400", Shortlisted: "bg-sky-500", Scheduled: "bg-violet-500", Interviewed: "bg-indigo-500", Offer: "bg-emerald-500",
  Accepted: "bg-emerald-600", Hired: "bg-green-700", Rejected: "bg-red-500", Sacked: "bg-red-700", Declined: "bg-amber-500",
};
const APP_ORDER = ["Applied", "Shortlisted", "Scheduled", "Interviewed", "Offer", "Accepted", "Hired", "Rejected", "Sacked", "Declined"];
const JOB_PILL = { Online: "bg-emerald-100 text-emerald-700", Offline: "bg-slate-100 text-slate-600", "Awaiting Approval": "bg-amber-100 text-amber-700", Draft: "bg-slate-100 text-slate-500", Rejected: "bg-red-100 text-red-700" };
const date = (d) => (d ? new Date(d).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" }) : "—");

export default function EmployerDetails() {
  const { id } = useParams();
  const [d, setD] = useState(null);

  useEffect(() => {
    setD(null);
    employersApi.details(id).then((r) => setD(r.data)).catch((e) => { toast.error(getError(e)); setD({ error: true }); });
  }, [id]);

  if (!d) return <Spinner label="Loading employer…" />;
  if (d.error) return <div className="rounded-2xl bg-white p-10 text-center shadow-sm">Employer not found. <Link to="/employers" className="text-orange-600">Back</Link></div>;

  const { employer: e, jobStats: j, applicationStats: a, jobs } = d;
  const iv = e.identityVerification || {};
  const checks = [["NIN", iv.nin], ["BVN", iv.bvn], ["Voter's card", iv.votersCard], ["Driver's licence", iv.driverLicense], ["Passport", iv.passport], ["CAC", iv.cac]];

  return (
    <div className="space-y-4">
      <Link to="/employers" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800"><ArrowLeft size={14} /> All employers</Link>

      {/* header */}
      <div className="flex flex-wrap items-center gap-4 rounded-2xl bg-white p-5 shadow-sm">
        {e.avatar ? <img src={e.avatar} alt="" className="h-16 w-16 rounded-2xl object-cover" /> : <div className="grid h-16 w-16 place-items-center rounded-2xl bg-orange-100 text-orange-600"><Building2 size={28} /></div>}
        <div className="min-w-0 flex-1">
          <h1 className="flex flex-wrap items-center gap-2 text-xl font-bold">{e.companyName}
            {e.businessVerified && <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700"><BadgeCheck size={13} /> Verified</span>}
            {e.isBlacklisted && <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700"><Ban size={13} /> Blacklisted</span>}
          </h1>
          <p className="text-sm text-slate-500">{e.employerType}{e.size ? ` · ${e.size} staff` : ""}{e.yearOfEstablishment ? ` · est. ${e.yearOfEstablishment}` : ""}</p>
          <p className="text-sm text-slate-500">Joined {date(e.createdAt)} · last login {timeAgo(e.lastLogin)}</p>
        </div>
      </div>

      {/* headline numbers */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
        <Big label="Jobs posted" value={j.total} />
        <Big label="Online now" value={j.byStatus.Online || 0} />
        <Big label="Boosted" value={j.boosted} />
        <Big label="Applications" value={a.total} />
        <Big label="Hired" value={a.byStatus.Hired || 0} />
        <Big label="Hire rate" value={`${a.hireRate}%`} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* application statistics */}
        <Card title="Application statistics">
          {!a.total ? <p className="text-sm text-slate-400">No applications yet.</p> : (
            <>
              <div className="flex h-3 overflow-hidden rounded-full bg-slate-100">
                {APP_ORDER.filter((s) => a.byStatus[s]).map((s) => <div key={s} className={STATUS_COLOR[s]} style={{ width: `${(a.byStatus[s] / a.total) * 100}%` }} title={`${s}: ${a.byStatus[s]}`} />)}
              </div>
              <ul className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
                {APP_ORDER.map((s) => (
                  <li key={s} className="flex items-center justify-between"><span className="flex items-center gap-2"><i className={`h-2.5 w-2.5 rounded-full ${STATUS_COLOR[s]}`} />{s}</span><b>{a.byStatus[s] || 0}</b></li>
                ))}
              </ul>
              <p className="mt-3 border-t pt-3 text-sm text-slate-500">
                Applied by candidates: <b>{a.bySource.applied || 0}</b> · Invited by employer: <b>{a.bySource.invited || 0}</b> · Priority applicants: <b>{a.priority}</b>
              </p>
            </>
          )}
        </Card>

        {/* job statistics */}
        <Card title="Job statistics">
          <div className="grid grid-cols-2 gap-2 text-sm">
            <Row k="Total views" v={j.views} /><Row k="Likes" v={j.likes} /><Row k="Shares" v={j.shares} /><Row k="Applicants (counter)" v={j.applicants} />
          </div>
          <p className="mt-3 text-xs font-semibold uppercase text-slate-400">By status</p>
          <div className="mt-1 flex flex-wrap gap-1.5">{Object.entries(j.byStatus).map(([k, v]) => <span key={k} className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${JOB_PILL[k] || "bg-slate-100"}`}>{k}: {v}</span>)}</div>
          <p className="mt-3 text-xs font-semibold uppercase text-slate-400">By plan</p>
          <div className="mt-1 flex flex-wrap gap-1.5">{Object.entries(j.byType).map(([k, v]) => <span key={k} className="rounded-full bg-orange-50 px-2.5 py-0.5 text-xs font-semibold text-orange-700">{k}: {v}</span>)}</div>
        </Card>

        <Card title="Company">
          <Row k="Email" v={e.email} /><Row k="Company phone" v={e.companyPhone} /><Row k="Phone" v={e.phoneNumber} /><Row k="WhatsApp" v={e.whatsappNumber} />
          <Row k="Address" v={e.address} /><Row k="LGA" v={e.localGovernment} /><Row k="State" v={e.state} /><Row k="Country" v={e.country} />
          <Row k="Followers" v={e.followerCount} />
          {e.aboutUs && <p className="mt-2 whitespace-pre-line rounded-xl bg-slate-50 p-3 text-sm text-slate-600">{e.aboutUs}</p>}
          {e.certificate && <a href={e.certificate} target="_blank" rel="noreferrer" className="mt-2 inline-block text-sm font-semibold text-orange-600">View certificate</a>}
        </Card>

        <Card title="Account">
          <Row k="Email verified" v={e.isVerified ? "Yes" : "No"} /><Row k="Address verified" v={e.addressVerified ? "Yes" : "No"} /><Row k="Business verified" v={e.businessVerified ? "Yes" : "No"} />
          <Row k="Registered via" v={e.registrationMethod} />
          {e.createdByAdminName && <Row k="Created by admin" v={`${e.createdByAdminName} (${e.createdByAdminEmail})`} />}
          {e.createdByMarketerName && <Row k="Marketer" v={`${e.createdByMarketerName} (${e.createdByMarketerEmail})`} />}
          <Row k="Referral code" v={e.referralCode} /><Row k="Referrals" v={e.referralCount} /><Row k="Loyalty points" v={e.loyaltyPoints} />
          <Row k="Unique no." v={e.uniqueNumber} />
          {e.isBlacklisted && <Row k="Blacklisted" v="Yes" />}
          {e.contactPerson && typeof e.contactPerson === "object" && (
            <div className="mt-2 rounded-xl bg-slate-50 p-3 text-sm"><p className="font-semibold">Contact person</p>
              {Object.entries(e.contactPerson).filter(([k, v]) => !["_id", "__v", "createdAt", "updatedAt"].includes(k) && typeof v !== "object").map(([k, v]) => <Row key={k} k={k} v={String(v)} />)}</div>
          )}
        </Card>

        <Card title="Identity verification" className="lg:col-span-2">
          <p className="mb-2 text-sm text-slate-500">{iv.approved ? "Approved" : "Not approved"}{iv.lastAttemptAt ? ` · last attempt ${date(iv.lastAttemptAt)}` : ""}</p>
          <div className="grid gap-2 sm:grid-cols-3">
            {checks.map(([name, c]) => (
              <div key={name} className="rounded-xl bg-slate-50 p-3 text-sm">
                <p className="flex items-center justify-between font-semibold">{name}
                  <span className={`rounded-full px-2 py-0.5 text-[11px] ${c?.verified ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-500"}`}>{c?.verified ? "Verified" : "Not verified"}</span></p>
                {(c?.last4 || c?.matchedName || c?.matchedBusinessName) && <p className="mt-1 text-xs text-slate-500">{c.last4 ? `••••${c.last4} ` : ""}{c.matchedName || c.matchedBusinessName || ""}</p>}
              </div>
            ))}
          </div>
          {iv.isBlacklisted && <p className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-700">Blacklisted{iv.blacklistCategory ? ` (${iv.blacklistCategory})` : ""}: {iv.blacklistReason || "no reason recorded"}</p>}
        </Card>
      </div>

      {/* jobs table */}
      <Card title={`Jobs (${jobs.length}${j.total > jobs.length ? ` of ${j.total}, latest shown` : ""})`}>
        {!jobs.length ? <p className="text-sm text-slate-400">This employer has not posted any jobs.</p> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="text-xs uppercase text-slate-400"><tr>
                <th className="py-2">Job</th><th>Plan</th><th>Status</th><th>Views</th><th>Likes</th><th>Applied</th><th>Short-listed</th><th>Hired</th><th>Expires</th>
              </tr></thead>
              <tbody>
                {jobs.map((x) => (
                  <tr key={x._id} className="border-t border-slate-100">
                    <td className="py-2 pr-2"><p className="font-semibold">{x.jobTitle}</p><p className="text-xs text-slate-400">{x.city}, {x.state}</p></td>
                    <td>{x.jobType}{x.isBoosted && <span className="ml-1 inline-flex items-center gap-0.5 text-xs text-orange-600"><Rocket size={11} />{x.boost?.plan}</span>}</td>
                    <td><span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${JOB_PILL[x.status] || ""}`}>{x.status}</span></td>
                    <td>{x.totalViews}</td><td>{x.likeCount}</td>
                    <td>{Object.values(x.applications).reduce((s, n) => s + n, 0)}</td>
                    <td>{x.applications.Shortlisted || 0}</td><td>{x.applications.Hired || 0}</td>
                    <td className="whitespace-nowrap">{date(x.expiryDate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

const Card = ({ title, children, className = "" }) => (
  <section className={`rounded-2xl bg-white p-5 shadow-sm ${className}`}><h2 className="mb-3 font-bold">{title}</h2>{children}</section>
);
const Big = ({ label, value }) => (
  <div className="rounded-2xl bg-white p-4 text-center shadow-sm"><p className="text-2xl font-extrabold text-orange-600">{value}</p><p className="text-xs text-slate-500">{label}</p></div>
);
const Row = ({ k, v }) => (
  <div className="flex justify-between gap-3 border-b border-slate-50 py-1 text-sm last:border-0"><span className="capitalize text-slate-500">{k}</span><span className="break-all text-right font-medium">{v === undefined || v === null || v === "" ? "—" : v}</span></div>
);