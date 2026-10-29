import { Link } from "react-router-dom";
import { BadgeCheck, Car, Info, Loader2, LocateFixed, Star } from "lucide-react";
import { timeAgo } from "../../features/jobUi";
import { EngagementBar } from "./Engagement";
import { useDrive } from "./geo";
import { fmtKm, fmtMin, formatDate, formatSalary, isExpired, mapsSearchUrl } from "./format";

export function DriveChip({ drive }) {
  if (drive === null) return null;
  if (drive === undefined) {
    return (
      <span className="inline-flex animate-pulse items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-sm text-slate-400">
        <Car className="h-4 w-4" /> Calculating distance…
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-2 rounded-full bg-orange-50 px-3 py-1.5 text-sm font-semibold text-orange-800 ring-1 ring-orange-100">
      <Car className="h-4 w-4" /> {fmtKm(drive.km)} <span className="text-orange-300">•</span> {fmtMin(drive.min)} drive
      {drive.estimated && (
        <span className="font-normal text-orange-700/70" title="Estimated from the straight-line distance">(approx.)</span>
      )}
    </span>
  );
}

export function LocationNotice({ status, request }) {
  if (status === "ready")
    return (
      <p className="mb-4 flex items-center gap-2 text-sm text-emerald-700">
        <LocateFixed className="h-4 w-4" /> Showing distance and drive time from your current location
      </p>
    );
  if (status === "asking")
    return (
      <p className="mb-4 flex items-center gap-2 text-sm text-slate-500">
        <Loader2 className="h-4 w-4 animate-spin" /> Finding your location…
      </p>
    );
  if (status === "unsupported") return null;
  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
      <span>
        {status === "denied"
          ? "Location is blocked. Allow it in your browser settings to see how far each job is."
          : "Allow location to see how far each job is from you."}
      </span>
      <button type="button" onClick={request}
        className="rounded-lg bg-orange-600 px-3 py-1.5 font-semibold text-white hover:bg-orange-700">
        Use my location
      </button>
    </div>
  );
}

const Row = ({ label, children, right }) => (
  <p className={`text-[15px] text-slate-700 ${right ? "sm:text-right" : ""}`}>
    <span className="text-slate-500">{label}</span> {children}
  </p>
);

export default function PublicJobCard({ job, origin }) {
  const drive = useDrive(job, origin);
  const e = job.employer || {};
  const link = `/jobs/${job._id}`;
  const expired = isExpired(job.expiryDate);

  return (
    <article className="relative rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100 transition hover:shadow-lg sm:p-6">
      {/* corner ribbon, verified tick, featured star */}
      <div aria-hidden="true"
        className="absolute left-0 top-0 h-16 w-16 rounded-tl-2xl bg-orange-600 [clip-path:polygon(0_0,100%_0,0_100%)]" />
      {job.isValidated && (
        <span title="Verified job" className="absolute left-2 top-2 grid h-6 w-6 place-items-center rounded-full bg-white shadow">
          <BadgeCheck className="h-4 w-4 text-emerald-600" />
        </span>
      )}
      {job.featuredJob && (
        <span title="Featured job" className="absolute right-4 top-4 grid h-10 w-10 place-items-center rounded-full bg-amber-500 text-white shadow">
          <Star className="h-5 w-5 fill-white" />
        </span>
      )}

      <div className="pl-9 pr-12">
        <Link to={link}>
          <h3 className="text-xl font-extrabold leading-snug text-slate-800 transition hover:text-orange-700 sm:text-2xl">
            {job.jobTitle}
          </h3>
        </Link>
        <div className="mt-1 flex items-center gap-2 text-sm text-slate-500">
          {e.avatar ? (
            <img src={e.avatar} alt="" className="h-6 w-6 rounded-md object-cover" />
          ) : (
            <span className="grid h-6 w-6 place-items-center rounded-md bg-orange-100 text-xs font-bold text-orange-700">
              {(e.companyName || "J")[0]}
            </span>
          )}
          <span className="truncate">{e.companyName || "Company"}</span>
          <span>·</span>
          <span className="shrink-0">{timeAgo(job.createdAt)}</span>
        </div>
      </div>

      <div className="mt-5 grid gap-x-6 gap-y-2.5 sm:grid-cols-2">
        <Row label="">
          <b className="text-slate-800">{job.state}</b> (LGA: {job.localGovernment}, City: {job.city})
        </Row>
        <Row label="Salary:" right><b className="text-slate-800">{formatSalary(job.currency, job.salary)}</b></Row>
        <Row label="Job Type:"><b className="text-slate-800">{job.workType}</b></Row>
        <Row label="Industry:" right><b className="text-slate-800">{job.industry}</b></Row>
      </div>

      {drive !== null && <div className="mt-4"><DriveChip drive={drive} /></div>}

      <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-3 border-t border-slate-100 pt-5">
        <div className="min-w-[11rem] text-sm leading-6 text-slate-600">
          <p>Experience Level: {job.experienceLength || "—"}</p>
          <p>
            Valid Till:{" "}
            {expired ? <span className="font-semibold text-red-600">Expired</span> : formatDate(job.expiryDate)}
          </p>
        </div>

        <Link to={`${link}#apply`}
          className="rounded-full bg-orange-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-orange-700">
          Apply now
        </Link>
        <Link to={`${link}#employer`}
          className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-orange-50 hover:text-orange-700">
          <Info className="h-4 w-4" /> About Employer
        </Link>

        <EngagementBar job={job} />

        <a href={mapsSearchUrl(job)} target="_blank" rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-orange-600 sm:ml-auto">
          <span className="grid h-5 w-5 place-items-center rounded-full bg-white text-xs font-extrabold text-orange-600">G</span>
          Verify Company
        </a>
      </div>
    </article>
  );
}