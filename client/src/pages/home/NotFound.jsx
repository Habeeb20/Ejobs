import { useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, Briefcase, Building2, Home, Search } from "lucide-react";

const QUICK_LINKS = [
  { to: "/jobs", label: "Browse jobs", icon: Search },
  { to: "/employers", label: "See employers", icon: Building2 },
  { to: "/", label: "Home", icon: Home },
];

function Illustration() {
  return (
    <svg viewBox="0 0 220 180" className="mx-auto h-40 w-auto sm:h-48" fill="none" role="img" aria-label="A job card with a question mark and a magnifying glass">
      <ellipse cx="110" cy="164" rx="70" ry="8" className="fill-orange-200/60" />
      <rect x="38" y="30" width="124" height="112" rx="16" className="fill-white stroke-orange-300" strokeWidth="3" />
      <rect x="54" y="46" width="34" height="34" rx="10" className="fill-orange-100" />
      <path d="M64 63h14M71 56v14" className="stroke-orange-500" strokeWidth="3" strokeLinecap="round" />
      <rect x="98" y="50" width="50" height="8" rx="4" className="fill-slate-200" />
      <rect x="98" y="66" width="34" height="8" rx="4" className="fill-slate-100" />
      <rect x="54" y="94" width="94" height="8" rx="4" className="fill-slate-100" />
      <rect x="54" y="110" width="70" height="8" rx="4" className="fill-slate-100" />
      <circle cx="146" cy="112" r="30" className="fill-orange-50/80 stroke-orange-500" strokeWidth="6" />
      <path d="M168 134l22 22" className="stroke-orange-500" strokeWidth="9" strokeLinecap="round" />
      <path d="M137 104a9 9 0 1 1 13 8c-3 2-4 3-4 7" className="stroke-orange-600" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="146" cy="130" r="3.2" className="fill-orange-600" />
    </svg>
  );
}

export default function NotFound() {
  const { pathname } = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const previous = document.title;
    document.title = "Page not found | EJobs";
    return () => { document.title = previous; };
  }, []);

  return (
    <section className="relative isolate overflow-hidden bg-gradient-to-b from-orange-50 via-white to-white">
      <div aria-hidden="true" className="pointer-events-none absolute -left-24 top-10 h-72 w-72 rounded-full bg-orange-200/40 blur-3xl" />
      <div aria-hidden="true" className="pointer-events-none absolute -right-24 bottom-0 h-72 w-72 rounded-full bg-amber-200/40 blur-3xl" />

      <div className="mx-auto flex min-h-[70vh] max-w-3xl flex-col items-center justify-center px-5 py-16 text-center sm:px-8">
        <Illustration />

        <p className="mt-6 bg-gradient-to-r from-orange-600 to-amber-500 bg-clip-text text-7xl font-black leading-none tracking-tighter text-transparent sm:text-8xl">
          404
        </p>
        <h1 className="mt-4 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
          This page has left the building
        </h1>
        <p className="mt-3 max-w-xl text-base leading-relaxed text-slate-600 sm:text-lg">
          We couldn't find{" "}
          <code className="break-all rounded-md bg-orange-100/70 px-1.5 py-0.5 text-sm font-semibold text-orange-800">{pathname}</code>.
          It may have been moved, expired or never existed. Let's get you back to something that's hiring.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link to="/" className="inline-flex items-center gap-2 rounded-xl bg-orange-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-orange-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-600">
            <Home size={16} /> Go to homepage
          </Link>
          <button type="button" onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-600">
            <ArrowLeft size={16} /> Go back
          </button>
        </div>

        <div className="mt-10 w-full max-w-xl border-t border-orange-100 pt-6">
          <p className="flex items-center justify-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
            <Briefcase size={14} /> Or try one of these
          </p>
          <ul className="mt-3 flex flex-wrap justify-center gap-2">
            {QUICK_LINKS.map(({ to, label, icon: Icon }) => (
              <li key={to}>
                <Link to={to} className="inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-1.5 text-sm font-medium text-orange-700 shadow-sm ring-1 ring-orange-100 transition hover:bg-orange-50">
                  <Icon size={14} /> {label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}