


// // import { useEffect, useState } from "react";
// import { Link, NavLink, useLocation } from "react-router-dom";
// import { ArrowRight, Briefcase, ChevronDown, LayoutDashboard, Menu, X } from "lucide-react";
// import { DASHBOARD_PATHS, TOKEN_KEY, dashboardPath, useAuth } from "../context/AuthContext";
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
//   {
//     to: "/jobs",
//     label: "Find Jobs",
//     children: [
//       { to: "/jobs/hospitality", label: "Hospitality Jobs" },
//       { to: "/jobs/manufacturing", label: "Manufacturing Jobs" },
//     ],
//   },
//   { to: "/companies", label: "Companies" },
//   { to: "/aboutus", label: "About" },
//   { to: "/contact", label: "Contact" },
//   { to: "/blacklist", label: "Blacklist" },
//   { to: "/statistics", label: "Statistics" },
// ];

// export default function Navbar() {
//   const { pathname } = useLocation();
//   const [open, setOpen] = useState(false);
//   const [mobileSub, setMobileSub] = useState(null); // `to` of the mobile submenu that is expanded
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
//     setMobileSub(null);
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


//   const hasToken = !!localStorage.getItem(TOKEN_KEY);
//   const loggedIn = !!user || hasToken;

 
//   const accountLink = loggedIn
//     ? user?.isProfileComplete === false
//       ? { to: "/signup", label: "Complete setup" }
//       : { to: user ? dashboardPath(user.role) : "/dashboard", label: "Dashboard" }
//     : null;

//   return (
//     <>
  
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



//         <Link to="/" className="flex items-center" aria-label="E-Cars home">
//   <img
//     src={ejobs}
//     alt="EJobs"
//     className="h-10 w-auto object-contain md:h-12"
//   />
// </Link>

//         {/* Desktop links */}
//         <ul className="hidden items-center gap-1 md:flex">
//           {LINKS.map(({ to, label, children }) => (
//             <li key={to} className="group/menu relative">
//               <NavLink
//                 to={to}
//                 end={to === "/"}
//                 className={({ isActive }) =>
//                   `group relative flex items-center gap-1 rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
//                     isActive ? "text-orange-600" : "text-slate-600 hover:text-orange-600"
//                   }`
//                 }
//               >
//                 {({ isActive }) => (
//                   <>
//                     {label}
//                     {children && (
//                       <ChevronDown className="h-4 w-4 transition-transform duration-300 group-hover/menu:rotate-180 group-focus-within/menu:rotate-180" />
//                     )}
//                     <span
//                       className={`absolute inset-x-4 -bottom-0.5 h-0.5 origin-left rounded-full bg-gradient-to-r from-orange-400 to-orange-600 transition-transform duration-300 ${
//                         isActive ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100"
//                       }`}
//                     />
//                   </>
//                 )}
//               </NavLink>

//               {children && (
//                 <div className="invisible absolute left-0 top-full z-50 pt-2 opacity-0 transition-all duration-200 group-hover/menu:visible group-hover/menu:opacity-100 group-focus-within/menu:visible group-focus-within/menu:opacity-100">
//                   <ul className="min-w-[13rem] overflow-hidden rounded-xl border border-orange-100 bg-white p-1.5 shadow-lg shadow-orange-500/10">
//                     {children.map((c) => (
//                       <li key={c.to}>
//                         <NavLink
//                           to={c.to}
//                           className={({ isActive }) =>
//                             `block rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors ${
//                               isActive
//                                 ? "bg-orange-50 text-orange-600"
//                                 : "text-slate-600 hover:bg-orange-50 hover:text-orange-600"
//                             }`
//                           }
//                         >
//                           {c.label}
//                         </NavLink>
//                       </li>
//                     ))}
//                   </ul>
//                 </div>
//               )}
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
//             {LINKS.map(({ to, label, children }) =>
//               children ? (
//                 <div key={to}>
//                   <div className="flex items-center">
//                     <NavLink
//                       to={to}
//                       end={to === "/"}
//                       className={({ isActive }) =>
//                         `block flex-1 rounded-xl px-4 py-3 text-base font-semibold transition ${
//                           isActive ? "bg-orange-50 text-orange-600" : "text-slate-700 hover:bg-orange-50 hover:text-orange-600"
//                         }`
//                       }
//                     >
//                       {label}
//                     </NavLink>
//                     <button
//                       type="button"
//                       onClick={() => setMobileSub((s) => (s === to ? null : to))}
//                       aria-label={`Toggle ${label} menu`}
//                       aria-expanded={mobileSub === to}
//                       className="flex h-11 w-11 items-center justify-center rounded-xl text-slate-700 transition hover:bg-orange-50 hover:text-orange-600"
//                     >
//                       <ChevronDown
//                         className={`h-5 w-5 transition-transform duration-300 ${mobileSub === to ? "rotate-180" : ""}`}
//                       />
//                     </button>
//                   </div>

//                   {mobileSub === to && (
//                     <div className="ml-4 mt-1 space-y-1 border-l-2 border-orange-100 pl-3">
//                       {children.map((c) => (
//                         <NavLink
//                           key={c.to}
//                           to={c.to}
//                           className={({ isActive }) =>
//                             `block rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
//                               isActive ? "bg-orange-50 text-orange-600" : "text-slate-600 hover:bg-orange-50 hover:text-orange-600"
//                             }`
//                           }
//                         >
//                           {c.label}
//                         </NavLink>
//                       ))}
//                     </div>
//                   )}
//                 </div>
//               ) : (
//                 <NavLink
//                   key={to}
//                   to={to}
//                   end={to === "/"}
//                   className={({ isActive }) =>
//                     `block rounded-xl px-4 py-3 text-base font-semibold transition ${
//                       isActive ? "bg-orange-50 text-orange-600" : "text-slate-700 hover:bg-orange-50 hover:text-orange-600"
//                     }`
//                   }
//                 >
//                   {label}
//                 </NavLink>
//               )
//             )}

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





import { useEffect, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { ArrowRight, ChevronDown, LayoutDashboard, Menu, X } from "lucide-react";
import { DASHBOARD_PATHS, TOKEN_KEY, dashboardPath, useAuth } from "../context/AuthContext";
import ejobs from "../assets/eJobs@4x.png";

// The navbar is NOT rendered on these paths (nested paths like /dashboard/settings are hidden too)
// (the role dashboards from AuthContext are hidden as well)
const HIDDEN_ON = ["/dashboard", ...Object.values(DASHBOARD_PATHS)];

const primaryBtn =
  "group inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-orange-500/30 transition duration-300 hover:-translate-y-0.5 hover:shadow-orange-500/50 focus:outline-none focus-visible:ring-4 focus-visible:ring-orange-200";

const LINKS = [
  { to: "/", label: "Home" },
  {
    to: "/jobs",
    label: "Find Jobs",
    children: [
      { to: "/jobs/hospitality", label: "Hospitality Jobs" },
      { to: "/jobs/manufacturing", label: "Manufacturing Jobs" },
    ],
  },
  { to: "/companies", label: "Companies" },
  { to: "/aboutus", label: "About" },
  { to: "/contact", label: "Contact" },
  { to: "/blacklist", label: "Blacklist" },
  { to: "/statistics", label: "Statistics" },
];

export default function Navbar() {
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const [mobileSub, setMobileSub] = useState(null); // `to` of the mobile submenu that is expanded
  const [scrolled, setScrolled] = useState(false);
  const { user, loading } = useAuth();

  // Add glass/shadow once the page is scrolled (colors only, the height never changes)
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close the mobile menu whenever the route changes
  useEffect(() => {
    setOpen(false);
    setMobileSub(null);
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

  const hasToken = !!localStorage.getItem(TOKEN_KEY);
  const loggedIn = !!user || hasToken;

  const accountLink = loggedIn
    ? user?.isProfileComplete === false
      ? { to: "/signup", label: "Complete setup" }
      : { to: user ? dashboardPath(user.role) : "/dashboard", label: "Dashboard" }
    : null;

  return (
    <>
      {/*
        The header is fixed, so it takes no space in the page. This spacer reserves EXACTLY the
        header's height (2px accent line + h-16 / md:h-20 nav) so page content starts right under
        it with no gap. If you change the nav height below, change these two values to match.
      */}
      <div aria-hidden="true" className="h-[66px] md:h-[82px]" />

      <header
        className={`fixed inset-x-0 top-0 z-50 transition-[background-color,box-shadow] duration-300 ${
          scrolled
            ? "bg-white/90 shadow-lg shadow-orange-500/10 backdrop-blur-xl"
            : "bg-white/70 shadow-sm shadow-orange-500/5 backdrop-blur-md"
        }`}
      >
        {/* accent line (2px) */}
        <div className="h-0.5 w-full bg-gradient-to-r from-orange-400 via-orange-500 to-amber-400" />

        {/* Fixed height: 64px on mobile, 80px on desktop. Never changes on scroll. */}
        <nav
          aria-label="Main"
          className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 md:h-20 lg:px-8"
        >
          <Link to="/" className="flex items-center" aria-label="EJobs home">
            <img src={ejobs} alt="EJobs" className="h-10 w-auto object-contain md:h-12" />
          </Link>

          {/* Desktop links */}
          <ul className="hidden items-center gap-1 md:flex">
            {LINKS.map(({ to, label, children }) => (
              <li key={to} className="group/menu relative">
                <NavLink
                  to={to}
                  end={to === "/"}
                  className={({ isActive }) =>
                    `group relative flex items-center gap-1 rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
                      isActive ? "text-orange-600" : "text-slate-600 hover:text-orange-600"
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      {label}
                      {children && (
                        <ChevronDown className="h-4 w-4 transition-transform duration-300 group-hover/menu:rotate-180 group-focus-within/menu:rotate-180" />
                      )}
                      <span
                        className={`absolute inset-x-4 -bottom-0.5 h-0.5 origin-left rounded-full bg-gradient-to-r from-orange-400 to-orange-600 transition-transform duration-300 ${
                          isActive ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100"
                        }`}
                      />
                    </>
                  )}
                </NavLink>

                {children && (
                  <div className="invisible absolute left-0 top-full z-50 pt-2 opacity-0 transition-all duration-200 group-hover/menu:visible group-hover/menu:opacity-100 group-focus-within/menu:visible group-focus-within/menu:opacity-100">
                    <ul className="min-w-[13rem] overflow-hidden rounded-xl border border-orange-100 bg-white p-1.5 shadow-lg shadow-orange-500/10">
                      {children.map((c) => (
                        <li key={c.to}>
                          <NavLink
                            to={c.to}
                            className={({ isActive }) =>
                              `block rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors ${
                                isActive
                                  ? "bg-orange-50 text-orange-600"
                                  : "text-slate-600 hover:bg-orange-50 hover:text-orange-600"
                              }`
                            }
                          >
                            {c.label}
                          </NavLink>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
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

        {/* Mobile menu (drops down over the page, it does not push content) */}
        <div
          id="mobile-menu"
          aria-hidden={!open}
          className={`grid transition-all duration-300 ease-out md:hidden ${
            open ? "visible grid-rows-[1fr] opacity-100" : "invisible grid-rows-[0fr] opacity-0"
          }`}
        >
          <div className="overflow-hidden">
            <div className="max-h-[calc(100dvh-4.5rem)] space-y-1 overflow-y-auto border-t border-orange-100 bg-white/95 px-4 pb-6 pt-4">
              {LINKS.map(({ to, label, children }) =>
                children ? (
                  <div key={to}>
                    <div className="flex items-center">
                      <NavLink
                        to={to}
                        end={to === "/"}
                        className={({ isActive }) =>
                          `block flex-1 rounded-xl px-4 py-3 text-base font-semibold transition ${
                            isActive
                              ? "bg-orange-50 text-orange-600"
                              : "text-slate-700 hover:bg-orange-50 hover:text-orange-600"
                          }`
                        }
                      >
                        {label}
                      </NavLink>
                      <button
                        type="button"
                        onClick={() => setMobileSub((s) => (s === to ? null : to))}
                        aria-label={`Toggle ${label} menu`}
                        aria-expanded={mobileSub === to}
                        className="flex h-11 w-11 items-center justify-center rounded-xl text-slate-700 transition hover:bg-orange-50 hover:text-orange-600"
                      >
                        <ChevronDown
                          className={`h-5 w-5 transition-transform duration-300 ${
                            mobileSub === to ? "rotate-180" : ""
                          }`}
                        />
                      </button>
                    </div>

                    {mobileSub === to && (
                      <div className="ml-4 mt-1 space-y-1 border-l-2 border-orange-100 pl-3">
                        {children.map((c) => (
                          <NavLink
                            key={c.to}
                            to={c.to}
                            className={({ isActive }) =>
                              `block rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
                                isActive
                                  ? "bg-orange-50 text-orange-600"
                                  : "text-slate-600 hover:bg-orange-50 hover:text-orange-600"
                              }`
                            }
                          >
                            {c.label}
                          </NavLink>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <NavLink
                    key={to}
                    to={to}
                    end={to === "/"}
                    className={({ isActive }) =>
                      `block rounded-xl px-4 py-3 text-base font-semibold transition ${
                        isActive
                          ? "bg-orange-50 text-orange-600"
                          : "text-slate-700 hover:bg-orange-50 hover:text-orange-600"
                      }`
                    }
                  >
                    {label}
                  </NavLink>
                )
              )}

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