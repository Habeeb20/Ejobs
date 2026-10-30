


import { useState, useEffect, useMemo, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import {
    LayoutDashboard, Users, ShieldCheck, Settings, Briefcase, FileText,
    Bookmark, UserCircle, PlusSquare, ClipboardList, Building2, Handshake,
    Wallet, BarChart3, Menu, X, LogOut, Bell, Search, Loader2, Gift, Copy, Check,
    ChevronDown, HeartHandshake, CalendarCheck,
    Megaphone,
} from "lucide-react";
import { userApi, getError } from "../../api"; // adjust the path to your api file
import Overview from "../features/Overview";
import PostJob from "../features/PostJob";
import BrowseJobs from "../features/BrowseJobs";
import SavedJobs from "../features/SavedJobs";
import MyApplications from "../features/MyApplications";
import MyJobs from "../features/MyJobs";
import JobApprovals from "../superAdmin/JobApprovals";
import useLiveNotifications from "../features/useLiveNotifications";
import Profile from "../profile/Profile";

// Benefit pages (adjust these paths to where you saved them)
import BenefitDashboard from "../jobseeker/BenefitDashboard";
import RequestBenefit from "../jobseeker/RequestBenefit";
import BenefitRequests from "../admin/BenefitRequests";
import BenefitDetail from "../admin/BenefitDetail";
import BenefitStats from "../admin/BenefitStats";
import BenefitAttendance from "../admin/BenefitAttendance";
import CvTab from "../profile/tabs/cv/cvTab";
import MyAds from "../ads/Myads";
import AdsReview from "../ads/AdsReview";
import { useNavigate } from "react-router-dom";
/* ------------------------------------------------------------------
   1. PAGES. The key is the value used in the URL: /dashboard?tab=<key>
------------------------------------------------------------------- */
const Placeholder = ({ title }) => (
    <div className="flex min-h-[320px] flex-col justify-center rounded-2xl bg-white p-8 shadow-sm sm:p-12">
        <h2 className="mb-2 text-2xl font-bold tracking-tight">{title}</h2>
        <p className="max-w-md text-slate-500">
            Replace this placeholder with your imported component in the PAGES map.
        </p>
    </div>
);
const page = (title) => () => <Placeholder title={title} />;

const PAGES = {
    overview: Overview, // role-specific tiles and lists
    users: page("Manage users"),
    roles: page("Roles & permissions"),
    analytics: page("Analytics"),
    settings: page("Settings"),
    jobs: BrowseJobs, // job seeker: search and apply
    applications: MyApplications, // job seeker: application tracker
    saved: SavedJobs, // job seeker: saved jobs
    resume: CvTab,
    profile: Profile,
    postJob: PostJob, // employer: plan, details, review
    myListings: MyJobs, // employer: jobs, applicants, analytics, renew
    approvals: JobApprovals, // super admin: approve or reject jobs
    myAds: MyAds, // job seeker, employer, agent: pay to be featured
    adsReview: AdsReview,
    allJobs: page("All job listings"),
    candidates: page("Candidates"),
    company: Profile,
    clients: page("My candidates"),
    placements: page("Placements"),
    commissions: page("Commissions"),

    // benefits
    benefits: BenefitDashboard, // job seeker: my benefits + stats
    benefitRequest: RequestBenefit, // job seeker: request form
    benefitRequests: BenefitRequests, // super admin: all requests
    benefitDetail: BenefitDetail, // super admin: one request (?tab=benefitDetail&id=...)
    benefitStats: BenefitStats, // super admin: payment statistics
    benefitAttendance: BenefitAttendance, // staff: venue check-ins and settings
};

/* ------------------------------------------------------------------
   2. SIDEBAR ITEMS PER ROLE
   item()  -> a normal link          (tab id, label, icon, extras)
   group() -> a dropdown with links  (group id, label, icon, children)
   extras: `also` = other tab ids that keep this link highlighted,
           `title` = heading to show instead of the label
------------------------------------------------------------------- */
const item = (id, label, icon, extra = {}) => ({ id, label, icon, ...extra });
const group = (id, label, icon, children) => ({ id, label, icon, children });

const BENEFITS_JOBSEEKER = group("benefitsGroup", "Benefits", HeartHandshake, [
    item("benefits", "My benefits", Wallet),
    item("benefitRequest", "Request a benefit", PlusSquare),
]);

const BENEFITS_SUPERADMIN = group("benefitsGroup", "Benefits", HeartHandshake, [
    item("benefitRequests", "Requests", ClipboardList, { also: ["benefitDetail"], title: "Benefit requests" }),
    item("benefitStats", "Payment stats", BarChart3, { title: "Benefit payments" }),
    item("benefitAttendance", "Venue attendance", CalendarCheck),
]);

const BENEFITS_STAFF = group("benefitsGroup", "Benefits", HeartHandshake, [
    item("benefitAttendance", "Venue attendance", CalendarCheck),
]);

export const MENU_BY_ROLE = {
    superadmin: [
        item("overview", "Overview", LayoutDashboard),
        item("users", "All users", Users),
        item("approvals", "Job approvals", ClipboardList),
        item("adsReview", "Ads", Megaphone),
        BENEFITS_SUPERADMIN,
        item("roles", "Roles & permissions", ShieldCheck),
        item("analytics", "Analytics", BarChart3),
        item("settings", "System settings", Settings),
    ],
    admin: [
        item("overview", "Overview", LayoutDashboard),
        item("users", "Manage users", Users),
        item("allJobs", "Job listings", Briefcase),
        item("adsReview", "Ads", Megaphone),
        BENEFITS_STAFF,
        item("analytics", "Analytics", BarChart3),
        item("settings", "Settings", Settings),
    ],
    jobseeker: [
        item("overview", "Overview", LayoutDashboard),
        item("jobs", "Browse jobs", Search),
        item("applications", "My applications", ClipboardList),
        item("saved", "Saved jobs", Bookmark),
        item("myAds", "My ads", Megaphone),
        BENEFITS_JOBSEEKER,
        item("resume", "My resume", FileText),
        item("profile", "Profile", UserCircle),
    ],
    employer: [
        item("overview", "Overview", LayoutDashboard),
        item("postJob", "Post a job", PlusSquare),
        item("myListings", "My listings", Briefcase),
        item("candidates", "Candidates", Users),
          item("myAds", "My ads", Megaphone),
        item("company", "Company profile", Building2),
    ],
    agent: [
        item("overview", "Overview", LayoutDashboard),
        item("clients", "My candidates", Users),
        item("placements", "Placements", Handshake),
        item("commissions", "Commissions", Wallet),
          item("myAds", "My ads", Megaphone),
        BENEFITS_STAFF,
        item("profile", "Profile", UserCircle),
    ],
};

const ROLE_LABEL = {
    superadmin: "Super admin",
    admin: "Admin",
    jobseeker: "Job seeker",
    employer: "Employer",
    agent: "Agent",
};

const matchesTab = (leaf, tab) => leaf.id === tab || leaf.also?.includes(tab);

/* ------------------------------------------------------------------
   3. COMPONENT  (Tailwind CSS)
   Usage: <Dashboard onLogout={fn} />  mounted at /dashboard
   The selected sidebar item lives in the URL: /dashboard?tab=<id>
------------------------------------------------------------------- */
export default function Dashboard({ onLogout }) {
    const [searchParams, setSearchParams] = useSearchParams();
    const tab = searchParams.get("tab");
    const navigate = useNavigate()
    const [me, setMe] = useState(null);
    const [status, setStatus] = useState("loading"); // loading | ready | error
    const [error, setError] = useState("");
    const [open, setOpen] = useState(false);
    const [openGroups, setOpenGroups] = useState({});
    const [copied, setCopied] = useState(""); // "code" | "link" | ""

    const logout = useCallback(() => {
        localStorage.removeItem("token");
        if (onLogout) onLogout();
        else window.location.assign("/login");
    }, [onLogout]);

    const loadUser = useCallback(async () => {
        setStatus("loading");
        try {
            const { data } = await userApi.getMe();
            setMe(data.user);
            setStatus("ready");
        } catch (err) {
            // Token missing, expired or account suspended: send them back to log in
            if ([401, 403].includes(err?.response?.status)) return logout();
            setError(getError(err));
            setStatus("error");
        }
    }, [logout]);

    useEffect(() => { loadUser(); }, [loadUser]);
    useLiveNotifications(me); // real-time toasts (new applicants, approvals)

    // Close drawer with Escape, lock scroll while open
    useEffect(() => {
        const onKey = (e) => e.key === "Escape" && setOpen(false);
        window.addEventListener("keydown", onKey);
        document.body.style.overflow = open ? "hidden" : "";
        return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
    }, [open]);

    const role = me && MENU_BY_ROLE[me.role] ? me.role : "jobseeker";
    const menu = useMemo(() => MENU_BY_ROLE[role], [role]);
    const leaves = useMemo(() => menu.flatMap((m) => m.children ?? [m]), [menu]);

    const tabIsValid = leaves.some((l) => matchesTab(l, tab));
    const active = leaves.find((l) => matchesTab(l, tab)) ?? leaves[0];
    const pageId = tabIsValid ? tab : active.id;

    // No tab (or one this role can't open): put a valid one in the URL without adding a history entry
    useEffect(() => {
        if (status === "ready" && !tabIsValid) setSearchParams({ tab: leaves[0].id }, { replace: true });
    }, [status, tabIsValid, leaves, setSearchParams]);

    // Open the dropdown that holds the current page
    useEffect(() => {
        const g = menu.find((m) => m.children?.some((c) => c.id === active.id));
        if (g) setOpenGroups((o) => (o[g.id] ? o : { ...o, [g.id]: true }));
    }, [menu, active.id]);

    const goTo = (id) => {
        setSearchParams({ tab: id }); // clears other params such as ?id=
        setOpen(false);
    };

    if (status !== "ready") {
        return (
            <div className="grid min-h-screen place-items-center bg-slate-100 p-6 text-slate-700">
                {status === "loading" ? (
                    <div className="flex items-center gap-3">
                        <Loader2 className="animate-spin text-[#E4510B]" size={22} />
                        <span>Loading your dashboard…</span>
                    </div>
                ) : (
                    <div className="max-w-sm rounded-2xl bg-white p-8 text-center shadow-sm">
                        <h2 className="mb-2 text-xl font-bold">We couldn't load your account</h2>
                        <p className="mb-6 text-slate-500">{error}</p>
                        <div className="flex justify-center gap-3">
                            <button onClick={loadUser} className="rounded-xl bg-[#E4510B] px-4 py-2 font-semibold text-white hover:bg-[#B83A06]">
                                Try again
                            </button>
                            <button onClick={logout} className="rounded-xl px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100">
                                Log out
                            </button>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    const Page = PAGES[pageId] ?? (() => <Placeholder title={active.label} />);

    const fullName = [me.firstName, me.lastName].filter(Boolean).join(" ");
    const displayName = (me.role === "employer" && me.companyName) || fullName || me.email;
    const initials = displayName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();

    const showRewards = ["jobseeker", "employer", "agent"].includes(role);
    const copy = async (text, key) => {
        try {
            await navigator.clipboard.writeText(text);
            setCopied(key);
            setTimeout(() => setCopied(""), 1500);
        } catch { /* clipboard blocked: ignore */ }
    };
    // Change "/register" if your sign-up page lives somewhere else
    const inviteLink = me.referralCode ? `${window.location.origin}/register?ref=${me.referralCode}` : "";

    const iconBtn =
        "grid h-10 w-10 place-items-center rounded-xl transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-600";

    const navBtn = (isActive) =>
        `flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-white ${isActive
            ? "bg-white font-semibold text-[#E4510B] shadow-lg shadow-black/30"
            : "text-orange-100 hover:bg-white/15 hover:text-white"
        }`;

    const renderLeaf = ({ id, label, icon: Icon }) => {
        const isActive = id === active.id;
        return (
            <button
                key={id}
                aria-current={isActive ? "page" : undefined}
                onClick={() => goTo(id)}
                className={navBtn(isActive)}
            >
                <Icon size={18} />
                <span>{label}</span>
            </button>
        );
    };

    return (
        <div className="flex min-h-screen bg-slate-100 text-[15px] text-slate-900">
            {/* Mobile backdrop */}
            {open && (
                <div
                    className="fixed inset-0 z-20 bg-slate-900/60 backdrop-blur-[2px] lg:hidden"
                    onClick={() => setOpen(false)}
                    aria-hidden="true"
                />
            )}

            {/* Sidebar: drawer on mobile, sticky column on desktop */}
            <aside
                aria-label="Main navigation"
                className={`fixed inset-y-0 left-0 z-30 flex w-[min(82vw,18.75rem)] flex-col bg-[linear-gradient(180deg,#E4510B_0%,#B83A06_100%)] px-4 py-5 text-orange-50 transition-transform duration-300 motion-reduce:transition-none lg:sticky lg:top-0 lg:z-auto lg:h-screen lg:w-[264px] lg:shrink-0 lg:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"
                    }`}
            >
                <div className="flex items-center gap-2.5 px-2 text-[22px] font-bold tracking-tight text-white">
                    <span className="grid h-9 w-9 place-items-center rounded-xl bg-white text-[#E4510B]">
                        <Briefcase size={18} />
                    </span>
                    <span onClick={() => navigate("/")}>EJob</span>
                    <button
                        className={`${iconBtn} ml-auto hover:bg-white/15 focus-visible:outline-white lg:hidden`}
                        onClick={() => setOpen(false)}
                        aria-label="Close menu"
                    >
                        <X size={20} />
                    </button>
                </div>

                <p className="mx-2 mb-2.5 mt-7 text-[13px] text-orange-200">
                    {ROLE_LABEL[role]} workspace
                </p>

                <nav className="flex flex-1 flex-col gap-1 overflow-y-auto">
                    {menu.map((entry) => {
                        if (!entry.children) return renderLeaf(entry);

                        const { id, label, icon: Icon, children } = entry;
                        const isOpen = Boolean(openGroups[id]);
                        const holdsActive = children.some((c) => c.id === active.id);
                        const panelId = `submenu-${id}`;

                        return (
                            <div key={id}>
                                <button
                                    aria-expanded={isOpen}
                                    aria-controls={panelId}
                                    onClick={() => setOpenGroups((o) => ({ ...o, [id]: !o[id] }))}
                                    className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-white ${holdsActive && !isOpen
                                        ? "bg-white/15 font-semibold text-white"
                                        : "text-orange-100 hover:bg-white/15 hover:text-white"
                                        }`}
                                >
                                    <Icon size={18} />
                                    <span>{label}</span>
                                    <ChevronDown
                                        size={16}
                                        className={`ml-auto transition-transform motion-reduce:transition-none ${isOpen ? "rotate-180" : ""}`}
                                        aria-hidden="true"
                                    />
                                </button>
                                {isOpen && (
                                    <div id={panelId} className="ml-5 mt-1 flex flex-col gap-1 border-l border-white/25 pl-3">
                                        {children.map(renderLeaf)}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </nav>

                {showRewards && (
                    <div className="mb-3 mt-3 rounded-2xl bg-white/15 p-3.5">
                        <div className="flex items-center gap-2 text-[13px] text-orange-100">
                            <Gift size={16} /> Loyalty points
                        </div>
                        <p className="mt-1 text-2xl font-bold text-white">
                            {(me.loyaltyPoints ?? 0).toLocaleString()}
                        </p>
                        {me.referralCode && (
                            <button
                                onClick={() => copy(me.referralCode, "code")}
                                className="mt-3 flex w-full items-center justify-between rounded-xl bg-white px-3 py-2 text-left text-[#E4510B] focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
                                aria-label="Copy your referral code"
                            >
                                <span>
                                    <small className="block text-[11px] text-slate-500">Your referral code</small>
                                    <strong className="tracking-widest">{me.referralCode}</strong>
                                </span>
                                {copied === "code" ? <Check size={16} /> : <Copy size={16} />}
                            </button>
                        )}
                        {inviteLink && (
                            <button
                                onClick={() => copy(inviteLink, "link")}
                                className="mt-2 w-full rounded-xl border border-white/40 px-3 py-1.5 text-[13px] font-semibold text-white hover:bg-white/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
                            >
                                {copied === "link" ? "Link copied" : "Copy invite link"}
                            </button>
                        )}
                        <p className="mt-2 text-xs text-orange-100">Earn 20 points for every friend who signs up with your code.</p>
                    </div>
                )}

                <div className="flex items-center gap-2.5 border-t border-white/25 px-2 pt-3.5">
                    {me.avatar ? (
                        <img src={me.avatar} alt="" className="h-[38px] w-[38px] rounded-full bg-white object-cover" />
                    ) : (
                        <span className="grid h-[38px] w-[38px] place-items-center rounded-full bg-white text-sm font-bold text-[#E4510B]">
                            {initials}
                        </span>
                    )}
                    <div className="flex min-w-0 flex-1 flex-col">
                        <strong className="truncate text-sm text-white">{displayName}</strong>
                        <small className="text-orange-200">{ROLE_LABEL[role]}</small>
                    </div>
                    <button
                        className={`${iconBtn} hover:bg-white/15 focus-visible:outline-white`}
                        onClick={logout}
                        aria-label="Log out"
                    >
                        <LogOut size={18} />
                    </button>
                </div>
            </aside>

            {/* Main */}
            <div className="flex min-w-0 flex-1 flex-col">
                <header className="sticky top-0 z-10 flex items-center gap-3 bg-slate-100/85 px-4 py-3 backdrop-blur-md lg:px-8 lg:py-4">
                    <button
                        className={`${iconBtn} -ml-2 hover:bg-slate-200 lg:hidden`}
                        onClick={() => setOpen(true)}
                        aria-label="Open menu"
                    >
                        <Menu size={22} />
                    </button>
                    <h1 className="text-xl font-bold tracking-tight lg:text-[26px]">{active.title ?? active.label}</h1>

                    <div className="ml-auto flex items-center gap-2">
                        <button className={`${iconBtn} hover:bg-slate-200`} aria-label="Notifications">
                            <Bell size={20} />
                        </button>
                    </div>
                </header>

                {/* The key remounts the page when the tab or the selected record (?id=) changes */}
                <main key={`${pageId}:${searchParams.get("id") ?? ""}`} className="px-4 pb-8 pt-2 lg:px-8 lg:pb-10">
                    {/* `user` is the logged-in user; `go(tabId)` switches the sidebar page (used by Overview and PostJob) */}
                    <Page user={me} go={goTo} />
                </main>
            </div>
        </div>
    );
}
























// /* ------------------------------------------------------------------
//    1. PAGES. The key is the value used in the URL: /dashboard?tab=<key>
// ------------------------------------------------------------------- */
// const Placeholder = ({ title }) => (
//     <div className="flex min-h-[320px] flex-col justify-center rounded-2xl bg-white p-8 shadow-sm sm:p-12">
//         <h2 className="mb-2 text-2xl font-bold tracking-tight">{title}</h2>
//         <p className="max-w-md text-slate-500">
//             Replace this placeholder with your imported component in the PAGES map.
//         </p>
//     </div>
// );
// const page = (title) => () => <Placeholder title={title} />;

// const PAGES = {
//     overview: Overview, // role-specific tiles and lists
//     users: page("Manage users"),
//     roles: page("Roles & permissions"),
//     analytics: page("Analytics"),
//     settings: page("Settings"),
//     jobs: BrowseJobs, // job seeker: search and apply
//     applications: MyApplications, // job seeker: application tracker
//     saved: SavedJobs, // job seeker: saved jobs
//     resume: page("My resume"),
//     profile: Profile,
//     postJob: PostJob, // employer: plan, details, review
//     myListings: MyJobs, // employer: jobs, applicants, analytics, renew
//     approvals: JobApprovals, // super admin: approve or reject jobs
//     myAds: MyAds, // job seeker, employer, agent: pay to be featured
//     adsReview: AdsReview, // admin, super admin: review paid ads and post free ones
//     allJobs: page("All job listings"),
//     candidates: page("Candidates"),
//     company: Profile,
//     clients: page("My candidates"),
//     placements: page("Placements"),
//     commissions: page("Commissions"),

//     // benefits
//     benefits: BenefitDashboard, // job seeker: my benefits + stats
//     benefitRequest: RequestBenefit, // job seeker: request form
//     benefitRequests: BenefitRequests, // super admin: all requests
//     benefitDetail: BenefitDetail, // super admin: one request (?tab=benefitDetail&id=...)
//     benefitStats: BenefitStats, // super admin: payment statistics
//     benefitAttendance: BenefitAttendance, // staff: venue check-ins and settings
// };

// /* ------------------------------------------------------------------
//    2. SIDEBAR ITEMS PER ROLE
//    item()  -> a normal link          (tab id, label, icon, extras)
//    group() -> a dropdown with links  (group id, label, icon, children)
//    extras: `also` = other tab ids that keep this link highlighted,
//            `title` = heading to show instead of the label
// ------------------------------------------------------------------- */
// const item = (id, label, icon, extra = {}) => ({ id, label, icon, ...extra });
// const group = (id, label, icon, children) => ({ id, label, icon, children });

// const BENEFITS_JOBSEEKER = group("benefitsGroup", "Benefits", HeartHandshake, [
//     item("benefits", "My benefits", Wallet),
//     item("benefitRequest", "Request a benefit", PlusSquare),
// ]);

// const BENEFITS_SUPERADMIN = group("benefitsGroup", "Benefits", HeartHandshake, [
//     item("benefitRequests", "Requests", ClipboardList, { also: ["benefitDetail"], title: "Benefit requests" }),
//     item("benefitStats", "Payment stats", BarChart3, { title: "Benefit payments" }),
//     item("benefitAttendance", "Venue attendance", CalendarCheck),
// ]);

// const BENEFITS_STAFF = group("benefitsGroup", "Benefits", HeartHandshake, [
//     item("benefitAttendance", "Venue attendance", CalendarCheck),
// ]);

// export const MENU_BY_ROLE = {
//     superadmin: [
//         item("overview", "Overview", LayoutDashboard),
//         item("users", "All users", Users),
//         item("approvals", "Job approvals", ClipboardList),
//         item("adsReview", "Ads", Megaphone),
//         BENEFITS_SUPERADMIN,
//         item("roles", "Roles & permissions", ShieldCheck),
//         item("analytics", "Analytics", BarChart3),
//         item("settings", "System settings", Settings),
//     ],
//     admin: [
//         item("overview", "Overview", LayoutDashboard),
//         item("users", "Manage users", Users),
//         item("allJobs", "Job listings", Briefcase),
//         item("adsReview", "Ads", Megaphone),
//         BENEFITS_STAFF,
//         item("analytics", "Analytics", BarChart3),
//         item("settings", "Settings", Settings),
//     ],
//     jobseeker: [
//         item("overview", "Overview", LayoutDashboard),
//         item("jobs", "Browse jobs", Search),
//         item("applications", "My applications", ClipboardList),
//         item("saved", "Saved jobs", Bookmark),
//         item("myAds", "My ads", Megaphone),
//         BENEFITS_JOBSEEKER,
//         item("resume", "My resume", FileText),
//         item("profile", "Profile", UserCircle),
//     ],
//     employer: [
//         item("overview", "Overview", LayoutDashboard),
//         item("postJob", "Post a job", PlusSquare),
//         item("myListings", "My listings", Briefcase),
//         item("myAds", "My ads", Megaphone),
//         item("candidates", "Candidates", Users),
//         item("company", "Company profile", Building2),
//     ],
//     agent: [
//         item("overview", "Overview", LayoutDashboard),
//         item("clients", "My candidates", Users),
//         item("placements", "Placements", Handshake),
//         item("commissions", "Commissions", Wallet),
//         item("myAds", "My ads", Megaphone),
//         BENEFITS_STAFF,
//         item("profile", "Profile", UserCircle),
//     ],
// };

// const ROLE_LABEL = {
//     superadmin: "Super admin",
//     admin: "Admin",
//     jobseeker: "Job seeker",
//     employer: "Employer",
//     agent: "Agent",
// };

// const matchesTab = (leaf, tab) => leaf.id === tab || leaf.also?.includes(tab);

// /* ------------------------------------------------------------------
//    3. COMPONENT  (Tailwind CSS)
//    Usage: <Dashboard onLogout={fn} />  mounted at /dashboard
//    The selected sidebar item lives in the URL: /dashboard?tab=<id>
// ------------------------------------------------------------------- */
// export default function Dashboard({ onLogout }) {
//     const [searchParams, setSearchParams] = useSearchParams();
//     const tab = searchParams.get("tab");

//     const [me, setMe] = useState(null);
//     const [status, setStatus] = useState("loading"); // loading | ready | error
//     const [error, setError] = useState("");
//     const [open, setOpen] = useState(false);
//     const [openGroups, setOpenGroups] = useState({});
//     const [copied, setCopied] = useState(""); // "code" | "link" | ""

//     const logout = useCallback(() => {
//         localStorage.removeItem("token");
//         if (onLogout) onLogout();
//         else window.location.assign("/login");
//     }, [onLogout]);

//     const loadUser = useCallback(async () => {
//         setStatus("loading");
//         try {
//             const { data } = await userApi.getMe();
//             setMe(data.user);
//             setStatus("ready");
//         } catch (err) {
//             // Token missing, expired or account suspended: send them back to log in
//             if ([401, 403].includes(err?.response?.status)) return logout();
//             setError(getError(err));
//             setStatus("error");
//         }
//     }, [logout]);

//     useEffect(() => { loadUser(); }, [loadUser]);
//     useLiveNotifications(me); // real-time toasts (new applicants, approvals)

//     // Close drawer with Escape, lock scroll while open
//     useEffect(() => {
//         const onKey = (e) => e.key === "Escape" && setOpen(false);
//         window.addEventListener("keydown", onKey);
//         document.body.style.overflow = open ? "hidden" : "";
//         return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
//     }, [open]);

//     const role = me && MENU_BY_ROLE[me.role] ? me.role : "jobseeker";
//     const menu = useMemo(() => MENU_BY_ROLE[role], [role]);
//     const leaves = useMemo(() => menu.flatMap((m) => m.children ?? [m]), [menu]);

//     const tabIsValid = leaves.some((l) => matchesTab(l, tab));
//     const active = leaves.find((l) => matchesTab(l, tab)) ?? leaves[0];
//     const pageId = tabIsValid ? tab : active.id;

//     // No tab (or one this role can't open): put a valid one in the URL without adding a history entry
//     useEffect(() => {
//         if (status === "ready" && !tabIsValid) setSearchParams({ tab: leaves[0].id }, { replace: true });
//     }, [status, tabIsValid, leaves, setSearchParams]);

//     // Open the dropdown that holds the current page
//     useEffect(() => {
//         const g = menu.find((m) => m.children?.some((c) => c.id === active.id));
//         if (g) setOpenGroups((o) => (o[g.id] ? o : { ...o, [g.id]: true }));
//     }, [menu, active.id]);

//     const goTo = (id) => {
//         setSearchParams({ tab: id }); // clears other params such as ?id=
//         setOpen(false);
//     };

//     if (status !== "ready") {
//         return (
//             <div className="grid min-h-screen place-items-center bg-slate-100 p-6 text-slate-700">
//                 {status === "loading" ? (
//                     <div className="flex items-center gap-3">
//                         <Loader2 className="animate-spin text-[#E4510B]" size={22} />
//                         <span>Loading your dashboard…</span>
//                     </div>
//                 ) : (
//                     <div className="max-w-sm rounded-2xl bg-white p-8 text-center shadow-sm">
//                         <h2 className="mb-2 text-xl font-bold">We couldn't load your account</h2>
//                         <p className="mb-6 text-slate-500">{error}</p>
//                         <div className="flex justify-center gap-3">
//                             <button onClick={loadUser} className="rounded-xl bg-[#E4510B] px-4 py-2 font-semibold text-white hover:bg-[#B83A06]">
//                                 Try again
//                             </button>
//                             <button onClick={logout} className="rounded-xl px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100">
//                                 Log out
//                             </button>
//                         </div>
//                     </div>
//                 )}
//             </div>
//         );
//     }

//     const Page = PAGES[pageId] ?? (() => <Placeholder title={active.label} />);

//     const fullName = [me.firstName, me.lastName].filter(Boolean).join(" ");
//     const displayName = (me.role === "employer" && me.companyName) || fullName || me.email;
//     const initials = displayName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();

//     const showRewards = ["jobseeker", "employer", "agent"].includes(role);
//     const copy = async (text, key) => {
//         try {
//             await navigator.clipboard.writeText(text);
//             setCopied(key);
//             setTimeout(() => setCopied(""), 1500);
//         } catch { /* clipboard blocked: ignore */ }
//     };
//     // Change "/register" if your sign-up page lives somewhere else
//     const inviteLink = me.referralCode ? `${window.location.origin}/register?ref=${me.referralCode}` : "";

//     const iconBtn =
//         "grid h-10 w-10 place-items-center rounded-xl transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-600";

//     const navBtn = (isActive) =>
//         `flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-white ${isActive
//             ? "bg-white font-semibold text-[#E4510B] shadow-lg shadow-black/30"
//             : "text-orange-100 hover:bg-white/15 hover:text-white"
//         }`;

//     const renderLeaf = ({ id, label, icon: Icon }) => {
//         const isActive = id === active.id;
//         return (
//             <button
//                 key={id}
//                 aria-current={isActive ? "page" : undefined}
//                 onClick={() => goTo(id)}
//                 className={navBtn(isActive)}
//             >
//                 <Icon size={18} />
//                 <span>{label}</span>
//             </button>
//         );
//     };

//     return (
//         <div className="flex min-h-screen bg-slate-100 text-[15px] text-slate-900">
//             {/* Mobile backdrop */}
//             {open && (
//                 <div
//                     className="fixed inset-0 z-20 bg-slate-900/60 backdrop-blur-[2px] lg:hidden"
//                     onClick={() => setOpen(false)}
//                     aria-hidden="true"
//                 />
//             )}

//             {/* Sidebar: drawer on mobile, sticky column on desktop */}
//             <aside
//                 aria-label="Main navigation"
//                 className={`fixed inset-y-0 left-0 z-30 flex w-[min(82vw,18.75rem)] flex-col bg-[linear-gradient(180deg,#E4510B_0%,#B83A06_100%)] px-4 py-5 text-orange-50 transition-transform duration-300 motion-reduce:transition-none lg:sticky lg:top-0 lg:z-auto lg:h-screen lg:w-[264px] lg:shrink-0 lg:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"
//                     }`}
//             >
//                 <div className="flex items-center gap-2.5 px-2 text-[22px] font-bold tracking-tight text-white">
//                     <span className="grid h-9 w-9 place-items-center rounded-xl bg-white text-[#E4510B]">
//                         <Briefcase size={18} />
//                     </span>
//                     <span>EJob</span>
//                     <button
//                         className={`${iconBtn} ml-auto hover:bg-white/15 focus-visible:outline-white lg:hidden`}
//                         onClick={() => setOpen(false)}
//                         aria-label="Close menu"
//                     >
//                         <X size={20} />
//                     </button>
//                 </div>

//                 <p className="mx-2 mb-2.5 mt-7 text-[13px] text-orange-200">
//                     {ROLE_LABEL[role]} workspace
//                 </p>

//                 <nav className="flex flex-1 flex-col gap-1 overflow-y-auto">
//                     {menu.map((entry) => {
//                         if (!entry.children) return renderLeaf(entry);

//                         const { id, label, icon: Icon, children } = entry;
//                         const isOpen = Boolean(openGroups[id]);
//                         const holdsActive = children.some((c) => c.id === active.id);
//                         const panelId = `submenu-${id}`;

//                         return (
//                             <div key={id}>
//                                 <button
//                                     aria-expanded={isOpen}
//                                     aria-controls={panelId}
//                                     onClick={() => setOpenGroups((o) => ({ ...o, [id]: !o[id] }))}
//                                     className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-white ${holdsActive && !isOpen
//                                         ? "bg-white/15 font-semibold text-white"
//                                         : "text-orange-100 hover:bg-white/15 hover:text-white"
//                                         }`}
//                                 >
//                                     <Icon size={18} />
//                                     <span>{label}</span>
//                                     <ChevronDown
//                                         size={16}
//                                         className={`ml-auto transition-transform motion-reduce:transition-none ${isOpen ? "rotate-180" : ""}`}
//                                         aria-hidden="true"
//                                     />
//                                 </button>
//                                 {isOpen && (
//                                     <div id={panelId} className="ml-5 mt-1 flex flex-col gap-1 border-l border-white/25 pl-3">
//                                         {children.map(renderLeaf)}
//                                     </div>
//                                 )}
//                             </div>
//                         );
//                     })}
//                 </nav>

//                 {showRewards && (
//                     <div className="mb-3 mt-3 rounded-2xl bg-white/15 p-3.5">
//                         <div className="flex items-center gap-2 text-[13px] text-orange-100">
//                             <Gift size={16} /> Loyalty points
//                         </div>
//                         <p className="mt-1 text-2xl font-bold text-white">
//                             {(me.loyaltyPoints ?? 0).toLocaleString()}
//                         </p>
//                         {me.referralCode && (
//                             <button
//                                 onClick={() => copy(me.referralCode, "code")}
//                                 className="mt-3 flex w-full items-center justify-between rounded-xl bg-white px-3 py-2 text-left text-[#E4510B] focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
//                                 aria-label="Copy your referral code"
//                             >
//                                 <span>
//                                     <small className="block text-[11px] text-slate-500">Your referral code</small>
//                                     <strong className="tracking-widest">{me.referralCode}</strong>
//                                 </span>
//                                 {copied === "code" ? <Check size={16} /> : <Copy size={16} />}
//                             </button>
//                         )}
//                         {inviteLink && (
//                             <button
//                                 onClick={() => copy(inviteLink, "link")}
//                                 className="mt-2 w-full rounded-xl border border-white/40 px-3 py-1.5 text-[13px] font-semibold text-white hover:bg-white/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
//                             >
//                                 {copied === "link" ? "Link copied" : "Copy invite link"}
//                             </button>
//                         )}
//                         <p className="mt-2 text-xs text-orange-100">Earn 20 points for every friend who signs up with your code.</p>
//                     </div>
//                 )}

//                 <div className="flex items-center gap-2.5 border-t border-white/25 px-2 pt-3.5">
//                     {me.avatar ? (
//                         <img src={me.avatar} alt="" className="h-[38px] w-[38px] rounded-full bg-white object-cover" />
//                     ) : (
//                         <span className="grid h-[38px] w-[38px] place-items-center rounded-full bg-white text-sm font-bold text-[#E4510B]">
//                             {initials}
//                         </span>
//                     )}
//                     <div className="flex min-w-0 flex-1 flex-col">
//                         <strong className="truncate text-sm text-white">{displayName}</strong>
//                         <small className="text-orange-200">{ROLE_LABEL[role]}</small>
//                     </div>
//                     <button
//                         className={`${iconBtn} hover:bg-white/15 focus-visible:outline-white`}
//                         onClick={logout}
//                         aria-label="Log out"
//                     >
//                         <LogOut size={18} />
//                     </button>
//                 </div>
//             </aside>

//             {/* Main */}
//             <div className="flex min-w-0 flex-1 flex-col">
//                 <header className="sticky top-0 z-10 flex items-center gap-3 bg-slate-100/85 px-4 py-3 backdrop-blur-md lg:px-8 lg:py-4">
//                     <button
//                         className={`${iconBtn} -ml-2 hover:bg-slate-200 lg:hidden`}
//                         onClick={() => setOpen(true)}
//                         aria-label="Open menu"
//                     >
//                         <Menu size={22} />
//                     </button>
//                     <h1 className="text-xl font-bold tracking-tight lg:text-[26px]">{active.title ?? active.label}</h1>

//                     <div className="ml-auto flex items-center gap-2">
//                         <button className={`${iconBtn} hover:bg-slate-200`} aria-label="Notifications">
//                             <Bell size={20} />
//                         </button>
//                     </div>
//                 </header>

//                 {/* The key remounts the page when the tab or the selected record (?id=) changes */}
//                 <main key={`${pageId}:${searchParams.get("id") ?? ""}`} className="px-4 pb-8 pt-2 lg:px-8 lg:pb-10">
//                     {/* `user` is the logged-in user; `go(tabId)` switches the sidebar page (used by Overview and PostJob) */}
//                     <Page user={me} go={goTo} />
//                 </main>
//             </div>
//         </div>
//     );
// }