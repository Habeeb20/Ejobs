import { useEffect, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import {
    ArrowLeft, BadgeCheck, Briefcase, Building2, CalendarDays, CheckCircle2, Clock, GraduationCap,
    MapPin, Navigation, SearchX, ShieldCheck, Star, Users, Video, Wallet,
} from "lucide-react";
import { jobsApi, userApi } from "../../api";
import { Spinner, timeAgo } from "../features/jobUi";

import ApplyForm from "./jobKit/ApplyForm";
import { DriveChip, LocationNotice } from "./jobKit/PublicJobCard";
import { EngagementBar } from "./jobKit/Engagement";
import { useDrive, useUserLocation } from "./jobKit/geo";
import { directionsUrl, formatDate, formatSalary, isExpired, mapsSearchUrl } from "./jobKit/format";

const Card = ({ id, className = "", children }) => (
    <section id={id} className={`scroll-mt-24 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100 sm:p-7 ${className}`}>
        {children}
    </section>
);

export default function PublicJobDetails() {
    const { id } = useParams();
    const { hash } = useLocation();
    const loggedIn = !!localStorage.getItem("token");
    const [job, setJob] = useState(null);
    const [phase, setPhase] = useState("loading"); // loading | ready | missing | error
    const [me, setMe] = useState(null);
    const { coords, status, request } = useUserLocation();
    const drive = useDrive(job, coords);

    useEffect(() => {
        let live = true;
        setPhase("loading");
        const fetchJob = loggedIn
            ? jobsApi.details(id).catch((e) => {
                // an expired token shouldn't hide a public job
                if ([401, 403].includes(e?.response?.status)) return jobsApi.publicJobs(id);
                throw e;
            })
            : jobsApi.publicJobs(id);

        fetchJob
            .then(({ data }) => { if (live) { setJob(data.job || data); setPhase("ready"); } })
            .catch((err) => { if (live) setPhase(err?.response?.status === 404 ? "missing" : "error"); });

        if (loggedIn) userApi.getMe().then(({ data }) => live && setMe(data.user)).catch(() => { });
        return () => { live = false; };
    }, [id, loggedIn]);

    useEffect(() => {
        if (!job) return;
        const prev = document.title;
        document.title = `${job.jobTitle} – ${job.employer?.companyName || "EJob"}`;
        return () => { document.title = prev; };
    }, [job]);

    // /jobs/:id#apply and #employer scroll to their sections
    useEffect(() => {
        if (phase === "ready" && hash) document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, [phase, hash]);

    const goApply = () => document.getElementById("apply")?.scrollIntoView({ behavior: "smooth", block: "start" });

    let body;
    if (phase === "loading") {
        body = <div className="mt-6"><Spinner label="Loading job…" /></div>;
    } else if (phase !== "ready") {
        body = (
            <div className="mt-6 rounded-2xl bg-white p-10 text-center shadow-sm ring-1 ring-slate-100">
                <SearchX className="mx-auto h-10 w-10 text-slate-300" />
                <h2 className="mt-3 text-lg font-bold">{phase === "missing" ? "This job isn't available" : "We couldn't load this job"}</h2>
                <p className="mt-1 text-slate-500">
                    {phase === "missing" ? "It may have expired or been taken down." : "Please check your connection and try again."}
                </p>
                <Link to="/jobs" className="mt-4 inline-block rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-700">
                    Browse all jobs
                </Link>
            </div>
        );
    } else {
        const e = job.employer || {};
        const expired = isExpired(job.expiryDate);
        const facts = [
            [MapPin, "Location", [job.city, job.localGovernment, job.state].filter(Boolean).join(", ")],
            [Wallet, "Salary", formatSalary(job.currency, job.salary)],
            [Briefcase, "Work type", [job.workType, job.jobLevel].filter(Boolean).join(" · ")],
            [Building2, "Industry", job.industry],
            [GraduationCap, "Qualification", job.minimumQualification],
            [Clock, "Experience", job.experienceLength],
            [Users, "Openings", job.numberOfOpenings],
            [CalendarDays, "Valid till", formatDate(job.expiryDate)],
        ].filter(([, , v]) => v);
        const requirements = [
            "A résumé (choose one from your profile or add a link)",
            job.requireCoverLetter ? "A cover letter is required" : "A cover letter is optional",
            job.requiredDocumentUpload && "You can attach a supporting document",
            job.virtualInterview && "Interviews for this role are held virtually",
        ].filter(Boolean);

        let apply;
        if (job.applied) {
            apply = (
                <div className="flex items-center gap-2 rounded-xl bg-emerald-50 p-4 font-semibold text-emerald-700">
                    <CheckCircle2 className="h-5 w-5" /> You've applied for this job.
                </div>
            );
        } else if (expired) {
            apply = <p className="rounded-xl bg-red-50 p-4 text-sm font-medium text-red-700">This job has expired and is no longer accepting applications.</p>;
        } else if (!loggedIn) {
            apply = (
                <div className="space-y-3">
                    <p className="text-sm text-slate-600">Create a free account or log in to apply. It only takes a few minutes.</p>
                    <Link to="/login" className="block rounded-xl bg-orange-600 px-5 py-3 text-center font-semibold text-white hover:bg-orange-700">Log in to apply</Link>
                    <Link to="/signup" className="block rounded-xl border border-slate-300 px-5 py-3 text-center font-semibold text-slate-700 hover:bg-slate-50">Create an account</Link>
                </div>
            );
        } else if (!me) {
            apply = <Spinner label="Loading your profile…" />;
        } else if (me.role !== "jobseeker") {
            apply = <>
             <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">Only job seeker accounts can apply for jobs.</p>
                <a href="/login" target="_blank" rel="noopener noreferrer"
                                        className="mt-4 inline-flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2.5 text-sm font-bold text-white hover:bg-orange-600">
                                        <span className="grid h-5 w-5 place-items-center rounded-full bg-white text-xs font-extrabold text-orange-600">L</span>
                                        Login to apply
                                    </a>

            </>
           
        } else {
            apply = <ApplyForm job={job} user={me} onApplied={() => setJob((j) => ({ ...j, applied: true }))} />;
        }

        body = (
            <>
                <div className="mt-4 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_24rem]">
                    <div className="space-y-5">
                        {/* header */}
                        <Card className="relative">
                            <div aria-hidden="true" className="absolute left-0 top-0 h-16 w-16 rounded-tl-2xl bg-orange-600 [clip-path:polygon(0_0,100%_0,0_100%)]" />
                            {job.isValidated && (
                                <span title="Verified job" className="absolute left-2 top-2 grid h-6 w-6 place-items-center rounded-full bg-white shadow">
                                    <BadgeCheck className="h-4 w-4 text-emerald-600" />
                                </span>
                            )}
                            {job.featuredJob && (
                                <span className="absolute right-5 top-5 inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">
                                    <Star className="h-3.5 w-3.5 fill-amber-500 text-amber-500" /> Featured
                                </span>
                            )}

                            <div className="flex items-start gap-4 pl-8 pt-1 sm:pl-10">
                                {e.avatar ? (
                                    <img src={e.avatar} alt="" className="h-14 w-14 shrink-0 rounded-xl object-cover" />
                                ) : (
                                    <span className="grid h-14 w-14 shrink-0 place-items-center rounded-xl bg-orange-100 text-xl font-bold text-orange-700">
                                        {(e.companyName || "J")[0]}
                                    </span>
                                )}
                                <div className={`min-w-0 ${job.featuredJob ? "pr-16 sm:pr-24" : ""}`}>
                                    <h1 className="text-2xl font-extrabold leading-tight text-slate-900 sm:text-3xl">{job.jobTitle}</h1>
                                    <p className="mt-1 text-slate-500">{e.companyName} · posted {timeAgo(job.createdAt)}</p>
                                </div>
                            </div>

                            <div className="mt-5 flex flex-wrap items-center gap-2">
                                {[job.workType, job.jobLevel, /^(yes|true)$/i.test(job.openForStudents) && "Open to students"]
                                    .filter(Boolean)
                                    .map((t) => (
                                        <span key={t} className="rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700">{t}</span>
                                    ))}
                                <DriveChip drive={drive} />
                                {coords && (
                                    <a href={directionsUrl(job)} target="_blank" rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1.5 text-sm font-semibold text-orange-700 hover:underline">
                                        <Navigation className="h-4 w-4" /> Get directions
                                    </a>
                                )}
                            </div>

                            <div className="mt-5 border-t border-slate-100 pt-5">
                                <EngagementBar job={job} placement="down" />
                            </div>
                        </Card>

                        <LocationNotice status={status} request={request} />

                        {/* quick facts */}
                        <Card>
                            <h2 className="text-lg font-bold">Job overview</h2>
                            <dl className="mt-4 grid gap-4 sm:grid-cols-2">
                                {facts.map(([Icon, label, value]) => (
                                    <div key={label} className="flex items-start gap-3 rounded-xl bg-slate-50 p-3.5">
                                        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-orange-100 text-orange-700"><Icon className="h-4 w-4" /></span>
                                        <div className="min-w-0">
                                            <dt className="text-xs uppercase tracking-wide text-slate-500">{label}</dt>
                                            <dd className="font-semibold text-slate-800">{value}</dd>
                                        </div>
                                    </div>
                                ))}
                            </dl>
                            {job.virtualInterview && (
                                <p className="mt-4 flex items-center gap-2 text-sm text-slate-600"><Video className="h-4 w-4" /> Virtual interview available</p>
                            )}
                        </Card>

                        {/* about the role */}
                        <Card>
                            <h2 className="text-lg font-bold">About the role</h2>
                            <p className="mt-3 whitespace-pre-line leading-relaxed text-slate-700">{job.jobSummary}</p>

                            {!!job.jobDescription?.length && (
                                <>
                                    <h3 className="mt-6 font-bold">Responsibilities</h3>
                                    <ul className="mt-3 space-y-2">
                                        {job.jobDescription.map((d, i) => (
                                            <li key={i} className="flex gap-2.5 text-slate-700">
                                                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-orange-600" /> {d}
                                            </li>
                                        ))}
                                    </ul>
                                </>
                            )}

                            {!!job.jobSkills?.length && (
                                <>
                                    <h3 className="mt-6 font-bold">Skills</h3>
                                    <div className="mt-3 flex flex-wrap gap-2">
                                        {job.jobSkills.map((s) => (
                                            <span key={s} className="rounded-full bg-orange-50 px-3 py-1 text-sm font-medium text-orange-800 ring-1 ring-orange-100">{s}</span>
                                        ))}
                                    </div>
                                </>
                            )}

                            {!!job.jobTag?.length && (
                                <div className="mt-4 flex flex-wrap gap-2">
                                    {job.jobTag.map((t) => <span key={t} className="text-sm text-slate-500">#{t}</span>)}
                                </div>
                            )}
                        </Card>

                        {/* employer */}
                        <Card id="employer">
                            <h2 className="text-lg font-bold">About {e.companyName || "the employer"}</h2>
                            <div className="mt-4 flex items-start gap-4">
                                {e.avatar ? (
                                    <img src={e.avatar} alt="" className="h-14 w-14 shrink-0 rounded-xl object-cover" />
                                ) : (
                                    <span className="grid h-14 w-14 shrink-0 place-items-center rounded-xl bg-orange-100 text-xl font-bold text-orange-700">
                                        {(e.companyName || "J")[0]}
                                    </span>
                                )}
                                <div className="min-w-0">
                                    <p className="whitespace-pre-line leading-relaxed text-slate-700">
                                        {e.aboutUs || "This employer hasn't added a company description yet."}
                                    </p>
                                    {(e.size || e.yearOfEstablishment) && (
                                        <p className="mt-2 text-sm text-slate-500">
                                            {[e.size && `${e.size} employees`, e.yearOfEstablishment && `Founded ${e.yearOfEstablishment}`].filter(Boolean).join(" · ")}
                                        </p>
                                    )}
                                    <a href={mapsSearchUrl(job)} target="_blank" rel="noopener noreferrer"
                                        className="mt-4 inline-flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2.5 text-sm font-bold text-white hover:bg-orange-600">
                                        <span className="grid h-5 w-5 place-items-center rounded-full bg-white text-xs font-extrabold text-orange-600">G</span>
                                        Verify Company
                                    </a>
                                </div>
                            </div>
                        </Card>
                    </div>

                    {/* apply */}
                    <aside className="space-y-5 lg:sticky lg:top-24">
                        <Card id="apply">
                            <h2 className="text-lg font-bold">{job.applied ? "Application sent" : "Apply for this job"}</h2>
                            <p className="mb-4 mt-1 text-sm text-slate-500">
                                {expired ? "Closed" : `Apply before ${formatDate(job.expiryDate)}`}
                            </p>
                            {apply}
                        </Card>

                        {!job.applied && !expired && (
                            <Card className="!p-5">
                                <h3 className="flex items-center gap-2 font-bold"><ShieldCheck className="h-4 w-4 text-orange-600" /> What you'll need</h3>
                                <ul className="mt-3 space-y-2 text-sm text-slate-600">
                                    {requirements.map((r) => (
                                        <li key={r} className="flex gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" /> {r}</li>
                                    ))}
                                </ul>
                            </Card>
                        )}
                    </aside>
                </div>

                {/* mobile apply bar */}
                {!job.applied && !expired && (
                    <div className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-between gap-3 border-t border-slate-200 bg-white/95 px-4 py-3 backdrop-blur lg:hidden">
                        <div className="min-w-0">
                            <p className="truncate text-sm font-bold">{formatSalary(job.currency, job.salary)}</p>
                            <p className="truncate text-xs text-slate-500">{job.jobTitle}</p>
                        </div>
                        <button type="button" onClick={goApply} className="shrink-0 rounded-full bg-orange-600 px-6 py-2.5 text-sm font-bold text-white">
                            Apply now
                        </button>
                    </div>
                )}
            </>
        );
    }

    return (
        <div className="min-h-screen bg-slate-100 text-slate-800">
     
            <main className="mx-auto max-w-6xl px-4 pb-28 pt-6 sm:px-6 lg:pb-16">
                <Link to="/jobs" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-orange-700">
                    <ArrowLeft className="h-4 w-4" /> All jobs
                </Link>
                {body}
            </main>
        </div>
    );
}