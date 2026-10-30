// // import { useEffect, useState } from "react";
// import { Link, NavLink, useLocation } from "react-router-dom";
// import { ArrowRight, Briefcase, LayoutDashboard, Menu, X } from "lucide-react";
// import { DASHBOARD_PATHS, dashboardPath, useAuth } from "../context/AuthContext";
// import { useState, useEffect } from "react";
// import ejobs from "../assets/eJobs@4x.png"
// // The navbar is NOT rendered on these paths (nested paths like /dashboard/settings are hidden too)
// // (the role dashboards from AuthContext are hidden as well)
// const HIDDEN_ON = ["/dashboard", ...Object.values(DASHBOARD_PATHS)];

// const primaryBtn =
//   "group inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-orange-500/30 transition duration-300 hover:-translate-y-0.5 hover:shadow-orange-500/50 focus:outline-none focus-visible:ring-4 focus-visible:ring-orange-200";

// const BRAND = { first: "E", second: "JOB" };

// const LINKS = [
//   { to: "/", label: "Home" },
//   { to: "/jobs", label: "Find Jobs" },
//   { to: "/companies", label: "Companies" },
//   { to: "/about", label: "About" },
//   { to: "/contact", label: "Contact" },
// ];

// export default function Navbar() {
//   const { pathname } = useLocation();
//   const [open, setOpen] = useState(false);
//   const [scrolled, setScrolled] = useState(false);
//   const { user, loading } = useAuth();

//   // Shrink + add glass/shadow once the page is scrolled
//   useEffect(() => {
//     const onScroll = () => setScrolled(window.scrollY > 8);
//     onScroll();
//     window.addEventListener("scroll", onScroll, { passive: true });
//     return () => window.removeEventListener("scroll", onScroll);
//   }, []);

//   // Close the mobile menu whenever the route changes
//   useEffect(() => {
//     setOpen(false);
//   }, [pathname]);

//   // Lock page scroll and allow Escape to close while the mobile menu is open
//   useEffect(() => {
//     if (!open) return undefined;
//     const onKey = (e) => e.key === "Escape" && setOpen(false);
//     document.body.style.overflow = "hidden";
//     window.addEventListener("keydown", onKey);
//     return () => {
//       document.body.style.overflow = "";
//       window.removeEventListener("keydown", onKey);
//     };
//   }, [open]);

//   const hidden = HIDDEN_ON.some((r) => pathname === r || pathname.startsWith(`${r}/`));
//   if (hidden) return null;

//   // Logged in -> Dashboard (or finish onboarding if the profile step isn't done yet)
//   const accountLink = user
//     ? user.isProfileComplete === false
//       ? { to: "/signup", label: "Complete setup" }
//       : { to: dashboardPath(user.role), label: "Dashboard" }
//     : null;

//   return (
//     <>
//     {/* Spacer: the header is fixed (out of the page flow), so this keeps content from sliding under it.
//         82px = 2px accent line + 80px (h-20) full-size navbar. */}
//     <div aria-hidden="true" className="h-[82px]" />

//     <header
//       className={`fixed inset-x-0 top-0 z-50 border-b transition-all duration-300 ${
//         scrolled
//           ? "border-orange-100 bg-white/80 shadow-lg shadow-orange-500/5 backdrop-blur-xl"
//           : "border-transparent bg-white/60 backdrop-blur-md"
//       }`}
//     >
//       {/* accent line */}
//       <div className="h-0.5 w-full bg-gradient-to-r from-orange-400 via-orange-500 to-amber-400" />

//       <nav
//         aria-label="Main"
//         className={`mx-auto flex max-w-7xl items-center justify-between px-4 transition-all duration-300 sm:px-6 lg:px-8 ${
//           scrolled ? "h-16" : "h-20"
//         }`}
//       >
//         {/* Logo */}
//         {/* <Link to="/" className="group flex items-center gap-2.5" aria-label={`${BRAND.first}${BRAND.second} home`}>
//           <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-orange-400 to-orange-600 text-white shadow-lg shadow-orange-500/30 transition-transform duration-300 group-hover:rotate-6 group-hover:scale-105">
//             <Briefcase className="h-5 w-5" />
//           </span>
//           <span className="text-xl font-extrabold tracking-tight text-slate-900">
//             {BRAND.first}
//             <span className="text-orange-500">{BRAND.second}</span>
//           </span>
//         </Link> */}


//         <Link to="/" className="flex items-center" aria-label="E-Cars home">
//   <img
//     src={ejobs}
//     alt="EJobs"
//     className="h-10 w-auto object-contain md:h-12"
//   />
// </Link>

//         {/* Desktop links */}
//         <ul className="hidden items-center gap-1 md:flex">
//           {LINKS.map(({ to, label }) => (
//             <li key={to}>
//               <NavLink
//                 to={to}
//                 end={to === "/"}
//                 className={({ isActive }) =>
//                   `group relative block rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
//                     isActive ? "text-orange-600" : "text-slate-600 hover:text-orange-600"
//                   }`
//                 }
//               >
//                 {({ isActive }) => (
//                   <>
//                     {label}
//                     <span
//                       className={`absolute inset-x-4 -bottom-0.5 h-0.5 origin-left rounded-full bg-gradient-to-r from-orange-400 to-orange-600 transition-transform duration-300 ${
//                         isActive ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100"
//                       }`}
//                     />
//                   </>
//                 )}
//               </NavLink>
//             </li>
//           ))}
//         </ul>

//         {/* Desktop actions */}
//         <div className="hidden items-center gap-3 md:flex">
//           {loading ? (
//             <div className="h-10 w-44 animate-pulse rounded-xl bg-orange-100" />
//           ) : accountLink ? (
//             <Link to={accountLink.to} className={primaryBtn}>
//               <LayoutDashboard className="h-4 w-4" />
//               {accountLink.label}
//               <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
//             </Link>
//           ) : (
//             <>
//               <Link
//                 to="/login"
//                 className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-orange-50 hover:text-orange-600"
//               >
//                 Log in
//               </Link>
//               <Link to="/signup" className={primaryBtn}>
//                 Sign up
//                 <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
//               </Link>
//             </>
//           )}
//         </div>

//         {/* Mobile toggle */}
//         <button
//           type="button"
//           onClick={() => setOpen((o) => !o)}
//           aria-label={open ? "Close menu" : "Open menu"}
//           aria-expanded={open}
//           aria-controls="mobile-menu"
//           className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-700 transition hover:bg-orange-50 hover:text-orange-600 focus:outline-none focus-visible:ring-4 focus-visible:ring-orange-200 md:hidden"
//         >
//           {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
//         </button>
//       </nav>

//       {/* Mobile menu */}
//       <div
//         id="mobile-menu"
//         aria-hidden={!open}
//         className={`grid transition-all duration-300 ease-out md:hidden ${
//           open ? "visible grid-rows-[1fr] opacity-100" : "invisible grid-rows-[0fr] opacity-0"
//         }`}
//       >
//         <div className="overflow-hidden">
//           <div className="max-h-[calc(100dvh-5rem)] space-y-1 overflow-y-auto border-t border-orange-100 bg-white/95 px-4 pb-6 pt-4">
//             {LINKS.map(({ to, label }) => (
//               <NavLink
//                 key={to}
//                 to={to}
//                 end={to === "/"}
//                 className={({ isActive }) =>
//                   `block rounded-xl px-4 py-3 text-base font-semibold transition ${
//                     isActive ? "bg-orange-50 text-orange-600" : "text-slate-700 hover:bg-orange-50 hover:text-orange-600"
//                   }`
//                 }
//               >
//                 {label}
//               </NavLink>
//             ))}

//             <div className="pt-4">
//               {loading ? (
//                 <div className="h-12 w-full animate-pulse rounded-xl bg-orange-100" />
//               ) : accountLink ? (
//                 <Link to={accountLink.to} className={`${primaryBtn} w-full py-3`}>
//                   <LayoutDashboard className="h-4 w-4" />
//                   {accountLink.label}
//                 </Link>
//               ) : (
//                 <div className="grid grid-cols-2 gap-3">
//                   <Link
//                     to="/login"
//                     className="rounded-xl border border-orange-200 px-4 py-3 text-center text-sm font-semibold text-orange-600 transition hover:bg-orange-50"
//                   >
//                     Log in
//                   </Link>
//                   <Link to="/signup" className={`${primaryBtn} py-3`}>
//                     Sign up
//                   </Link>
//                 </div>
//               )}
//             </div>
//           </div>
//         </div>
//       </div>
//     </header>
//     </>
//   );
// }






// import { useEffect, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { ArrowRight, Briefcase, LayoutDashboard, Menu, X } from "lucide-react";
import { DASHBOARD_PATHS, TOKEN_KEY, dashboardPath, useAuth } from "../context/AuthContext";
import { useState, useEffect } from "react";
import ejobs from "../assets/eJobs@4x.png"
// The navbar is NOT rendered on these paths (nested paths like /dashboard/settings are hidden too)
// (the role dashboards from AuthContext are hidden as well)
const HIDDEN_ON = ["/dashboard", ...Object.values(DASHBOARD_PATHS)];

const primaryBtn =
  "group inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-orange-500/30 transition duration-300 hover:-translate-y-0.5 hover:shadow-orange-500/50 focus:outline-none focus-visible:ring-4 focus-visible:ring-orange-200";

const BRAND = { first: "E", second: "JOB" };

const LINKS = [
  { to: "/", label: "Home" },
  { to: "/jobs", label: "Find Jobs" },
  { to: "/companies", label: "Companies" },
  { to: "/about", label: "About" },
  { to: "/contact", label: "Contact" },
];

export default function Navbar() {
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { user, loading } = useAuth();

  // Shrink + add glass/shadow once the page is scrolled
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close the mobile menu whenever the route changes
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Lock page scroll and allow Escape to close while the mobile menu is open
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const hidden = HIDDEN_ON.some((r) => pathname === r || pathname.startsWith(`${r}/`));
  if (hidden) return null;

  // Still logged in = we have the user, or a saved token that hasn't been rejected by the server.
  // (An invalid token is cleared by AuthContext on a 401, which flips this back to logged out.)
  const hasToken = !!localStorage.getItem(TOKEN_KEY);
  const loggedIn = !!user || hasToken;

  // Logged in -> Dashboard (or finish onboarding if the profile step isn't done yet)
  const accountLink = loggedIn
    ? user?.isProfileComplete === false
      ? { to: "/signup", label: "Complete setup" }
      : { to: user ? dashboardPath(user.role) : "/dashboard", label: "Dashboard" }
    : null;

  return (
    <>
    {/* Spacer: the header is fixed (out of the page flow), so this keeps content from sliding under it.
        82px = 2px accent line + 80px (h-20) full-size navbar. */}
    <div aria-hidden="true" className="h-[82px]" />

    <header
      className={`fixed inset-x-0 top-0 z-50 border-b transition-all duration-300 ${
        scrolled
          ? "border-orange-100 bg-white/80 shadow-lg shadow-orange-500/5 backdrop-blur-xl"
          : "border-transparent bg-white/60 backdrop-blur-md"
      }`}
    >
      {/* accent line */}
      <div className="h-0.5 w-full bg-gradient-to-r from-orange-400 via-orange-500 to-amber-400" />

      <nav
        aria-label="Main"
        className={`mx-auto flex max-w-7xl items-center justify-between px-4 transition-all duration-300 sm:px-6 lg:px-8 ${
          scrolled ? "h-16" : "h-20"
        }`}
      >
        {/* Logo */}
        {/* <Link to="/" className="group flex items-center gap-2.5" aria-label={`${BRAND.first}${BRAND.second} home`}>
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-orange-400 to-orange-600 text-white shadow-lg shadow-orange-500/30 transition-transform duration-300 group-hover:rotate-6 group-hover:scale-105">
            <Briefcase className="h-5 w-5" />
          </span>
          <span className="text-xl font-extrabold tracking-tight text-slate-900">
            {BRAND.first}
            <span className="text-orange-500">{BRAND.second}</span>
          </span>
        </Link> */}


        <Link to="/" className="flex items-center" aria-label="E-Cars home">
  <img
    src={ejobs}
    alt="EJobs"
    className="h-10 w-auto object-contain md:h-12"
  />
</Link>

        {/* Desktop links */}
        <ul className="hidden items-center gap-1 md:flex">
          {LINKS.map(({ to, label }) => (
            <li key={to}>
              <NavLink
                to={to}
                end={to === "/"}
                className={({ isActive }) =>
                  `group relative block rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
                    isActive ? "text-orange-600" : "text-slate-600 hover:text-orange-600"
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    {label}
                    <span
                      className={`absolute inset-x-4 -bottom-0.5 h-0.5 origin-left rounded-full bg-gradient-to-r from-orange-400 to-orange-600 transition-transform duration-300 ${
                        isActive ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100"
                      }`}
                    />
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>

        {/* Desktop actions */}
        <div className="hidden items-center gap-3 md:flex">
          {loading ? (
            <div className="h-10 w-44 animate-pulse rounded-xl bg-orange-100" />
          ) : accountLink ? (
            <Link to={accountLink.to} className={primaryBtn}>
              <LayoutDashboard className="h-4 w-4" />
              {accountLink.label}
              <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
            </Link>
          ) : (
            <>
              <Link
                to="/login"
                className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-orange-50 hover:text-orange-600"
              >
                Log in
              </Link>
              <Link to="/signup" className={primaryBtn}>
                Sign up
                <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
              </Link>
            </>
          )}
        </div>

        {/* Mobile toggle */}
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          aria-controls="mobile-menu"
          className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-700 transition hover:bg-orange-50 hover:text-orange-600 focus:outline-none focus-visible:ring-4 focus-visible:ring-orange-200 md:hidden"
        >
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </nav>

      {/* Mobile menu */}
      <div
        id="mobile-menu"
        aria-hidden={!open}
        className={`grid transition-all duration-300 ease-out md:hidden ${
          open ? "visible grid-rows-[1fr] opacity-100" : "invisible grid-rows-[0fr] opacity-0"
        }`}
      >
        <div className="overflow-hidden">
          <div className="max-h-[calc(100dvh-5rem)] space-y-1 overflow-y-auto border-t border-orange-100 bg-white/95 px-4 pb-6 pt-4">
            {LINKS.map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                end={to === "/"}
                className={({ isActive }) =>
                  `block rounded-xl px-4 py-3 text-base font-semibold transition ${
                    isActive ? "bg-orange-50 text-orange-600" : "text-slate-700 hover:bg-orange-50 hover:text-orange-600"
                  }`
                }
              >
                {label}
              </NavLink>
            ))}

            <div className="pt-4">
              {loading ? (
                <div className="h-12 w-full animate-pulse rounded-xl bg-orange-100" />
              ) : accountLink ? (
                <Link to={accountLink.to} className={`${primaryBtn} w-full py-3`}>
                  <LayoutDashboard className="h-4 w-4" />
                  {accountLink.label}
                </Link>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <Link
                    to="/login"
                    className="rounded-xl border border-orange-200 px-4 py-3 text-center text-sm font-semibold text-orange-600 transition hover:bg-orange-50"
                  >
                    Log in
                  </Link>
                  <Link to="/signup" className={`${primaryBtn} py-3`}>
                    Sign up
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
    </>
  );
}