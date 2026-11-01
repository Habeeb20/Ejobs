// import { useState } from "react";
// import { Link, useNavigate } from "react-router-dom";
// import { AlertCircle, Briefcase, Eye, EyeOff, Lock, Mail, Phone, Loader2 } from "lucide-react";
// import { BrandPanel } from "./Onboarding";

// import { authApi, getError } from "../../api";

// const isEmail = (v) => /^\S+@\S+\.\S+$/.test(v);
// const isPhone = (v) => v.replace(/\D/g, "").length >= 10;

// export default function Login() {
//   const navigate = useNavigate();
//   const [form, setForm] = useState({ identifier: "", password: "" });
//   const [showPassword, setShowPassword] = useState(false);
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState("");
//   const [needsVerification, setNeedsVerification] = useState(false);
//   const [fieldErrors, setFieldErrors] = useState({});

//   const identifier = form.identifier.trim();
//   const usingEmail = identifier.includes("@");
//   const IdIcon = usingEmail || !identifier ? Mail : Phone;

//   const update = (key) => (e) => {
//     setForm((f) => ({ ...f, [key]: e.target.value }));
//     setFieldErrors((fe) => ({ ...fe, [key]: "" }));
//   };

//   const validate = () => {
//     const errs = {};
//     if (!identifier) errs.identifier = "Enter your email or phone number";
//     else if (usingEmail ? !isEmail(identifier) : !isPhone(identifier))
//       errs.identifier = usingEmail ? "Enter a valid email address" : "Enter a valid phone number";
//     if (!form.password) errs.password = "Enter your password";
//     setFieldErrors(errs);
//     return Object.keys(errs).length === 0;
//   };

//   const submit = async (e) => {
//     e.preventDefault();
//     if (!validate()) return;
//     setLoading(true);
//     setError("");
//     setNeedsVerification(false);
//     try {
//       const { data } = await authApi.login({
//         identifier: usingEmail ? identifier.toLowerCase() : identifier,
//         password: form.password,
//       });
//       localStorage.setItem("token", data.token);
//       localStorage.setItem("role", data.user.role);
//       navigate(data.redirectTo || "/", { replace: true });
//     } catch (err) {
//       setError(getError(err));
//       setNeedsVerification(Boolean(err?.response?.data?.needsVerification));
//     } finally {
//       setLoading(false);
//     }
//   };

//   const inputClass = (hasError) =>
//     `w-full rounded-xl border bg-white py-3 pl-11 pr-4 text-sm outline-none transition placeholder:text-slate-400 focus:ring-4 ${
//       hasError
//         ? "border-danger focus:border-danger focus:ring-danger/10"
//         : "border-slate-300 focus:border-primary-500 focus:ring-primary-500/15"
//     }`;

//   return (
//     <div className="grid min-h-screen lg:grid-cols-[2fr_3fr]">
//       <BrandPanel />

//       <main className="flex items-center justify-center px-5 py-10 sm:px-10">
//         <div className="relative w-full max-w-md">
//           {/* Compact logo for screens where the brand panel is hidden */}
//           <div className="mb-8 flex items-center gap-2.5 font-display text-xl font-bold text-primary-600 lg:hidden">
//             <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-500 text-white">
//               <Briefcase className="h-4 w-4" />
//             </span>
//             EJob
//           </div>

//           <h2 className="font-display text-3xl font-extrabold tracking-tight text-slate-900">
//             Welcome back
//           </h2>
//           <p className="mt-2 text-sm text-slate-500">
//             Log in with your email or phone number.
//           </p>

//           {error && (
//             <div
//               className="mt-6 flex items-start gap-2 rounded-xl border border-danger/30 bg-red-50 p-3 text-sm text-danger"
//               role="alert"
//             >
//               <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
//               <div>
//                 {error}
//                 {needsVerification && (
//                   <>
//                     {" "}
//                     <Link to="/signup" className="font-semibold underline">
//                       Finish verification
//                     </Link>
//                   </>
//                 )}
//               </div>
//             </div>
//           )}

//           <form onSubmit={submit} noValidate className="mt-6 space-y-5">
//             <div>
//               <label htmlFor="identifier" className="mb-1.5 block text-sm font-medium text-slate-700">
//                 Email or phone number
//               </label>
//               <div className="relative">
//                 <IdIcon className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
//                 <input
//                   id="identifier"
//                   type="text"
//                   inputMode={usingEmail || !identifier ? "email" : "tel"}
//                   autoComplete="username"
//                   autoFocus
//                   placeholder="you@example.com or 0801 234 5678"
//                   value={form.identifier}
//                   onChange={update("identifier")}
//                   className={inputClass(fieldErrors.identifier)}
//                 />
//               </div>
//               {fieldErrors.identifier && (
//                 <p className="mt-1.5 text-xs text-danger">{fieldErrors.identifier}</p>
//               )}
//             </div>

//             <div>
//               <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-slate-700">
//                 Password
//               </label>
//               <div className="relative">
//                 <Lock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
//                 <input
//                   id="password"
//                   type={showPassword ? "text" : "password"}
//                   autoComplete="current-password"
//                   placeholder="Enter your password"
//                   value={form.password}
//                   onChange={update("password")}
//                   className={`${inputClass(fieldErrors.password)} pr-11`}
//                 />
//                 <button
//                   type="button"
//                   onClick={() => setShowPassword((s) => !s)}
//                   aria-label={showPassword ? "Hide password" : "Show password"}
//                   className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 hover:text-slate-600"
//                 >
//                   {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
//                 </button>
//               </div>
//               {fieldErrors.password && (
//                 <p className="mt-1.5 text-xs text-danger">{fieldErrors.password}</p>
//               )}
//             </div>

//             <button
//               type="submit"
//               disabled={loading}
//               className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary-500 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-primary-500/25 transition hover:bg-primary-600 focus:outline-none focus:ring-4 focus:ring-primary-500/30 disabled:cursor-not-allowed disabled:opacity-70"
//             >
//               {loading ? (
//                 <>
//                   <Loader2 className="h-4 w-4 animate-spin" /> Logging in…
//                 </>
//               ) : (
//                 "Log in"
//               )}
//             </button>
//           </form>

//           <p className="mt-6 text-center text-sm text-slate-500">
//             New to EJob?{" "}
//             <Link to="/signup" className="font-semibold text-primary-600 hover:underline">
//               Create an account
//             </Link>
//           </p>
//         </div>
//       </main>
//     </div>
//   );
// }












import { useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { AlertCircle, Briefcase, Eye, EyeOff, Info, Lock, Mail, Phone, Loader2 } from "lucide-react";
import { BrandPanel } from "./Onboarding";

import { authApi, getError } from "../../api";
import { DASHBOARD_PATHS, useAuth } from "../../context/AuthContext";

const isEmail = (v) => /^\S+@\S+\.\S+$/.test(v);
const isPhone = (v) => v.replace(/\D/g, "").length >= 10;

const ROLE_LABELS = {
  jobseeker: "job seeker",
  employer: "employer",
  agent: "agent",
  admin: "admin",
  superadmin: "admin",
};

/* ---------- "send me back where I was going" helpers ---------- */

// The page the user was trying to open before being sent here.
// Read from  /login?redirect=/jobseeker?tab=resume   or from  navigate("/login", { state: { from } })
const getRequestedPath = (location) => {
  const params = new URLSearchParams(location.search);
  const from = location.state?.from;
  const raw =
    params.get("redirect") ||
    (typeof from === "string"
      ? from
      : from
      ? `${from.pathname || ""}${from.search || ""}${from.hash || ""}`
      : "");

  // Only in-app paths are allowed (blocks things like https://evil.com or //evil.com)
  return raw.startsWith("/") && !raw.startsWith("//") && !raw.includes("\\") ? raw : "";
};

// Dashboard areas (/jobseeker, /employer ...) can only be opened by their own role
const rolesAllowedFor = (path) => {
  const pathname = path.split(/[?#]/)[0];
  const matches = Object.entries(DASHBOARD_PATHS).filter(
    ([, base]) => pathname === base || pathname.startsWith(`${base}/`)
  );
  return matches.length ? matches.map(([role]) => role) : null; // null = open to everyone
};

const canAccess = (role, path) => {
  const allowed = rolesAllowedFor(path);
  return !allowed || allowed.includes(role);
};

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { setSession } = useAuth();

  const [form, setForm] = useState({ identifier: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [needsVerification, setNeedsVerification] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});

  const requestedPath = useMemo(() => getRequestedPath(location), [location]);
  const requiredRole = requestedPath ? rolesAllowedFor(requestedPath)?.[0] : null;

  const identifier = form.identifier.trim();
  const usingEmail = identifier.includes("@");
  const IdIcon = usingEmail || !identifier ? Mail : Phone;

  const update = (key) => (e) => {
    setForm((f) => ({ ...f, [key]: e.target.value }));
    setFieldErrors((fe) => ({ ...fe, [key]: "" }));
  };

  const validate = () => {
    const errs = {};
    if (!identifier) errs.identifier = "Enter your email or phone number";
    else if (usingEmail ? !isEmail(identifier) : !isPhone(identifier))
      errs.identifier = usingEmail ? "Enter a valid email address" : "Enter a valid phone number";
    if (!form.password) errs.password = "Enter your password";
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    setError("");
    setNeedsVerification(false);
    try {
      const { data } = await authApi.login({
        identifier: usingEmail ? identifier.toLowerCase() : identifier,
        password: form.password,
      });

      // Saves the token and updates the app-wide user straight away
      setSession(data.token, data.user);
      localStorage.setItem("role", data.user.role);

      // Sent here from another page? Go back there (if this role may open it).
      // Opened /login directly? Use the normal landing page for the role.
      const destination =
        requestedPath && canAccess(data.user.role, requestedPath)
          ? requestedPath
          : data.redirectTo || "/";

      navigate(destination, { replace: true });
    } catch (err) {
      setError(getError(err));
      setNeedsVerification(Boolean(err?.response?.data?.needsVerification));
    } finally {
      setLoading(false);
    }
  };

  const inputClass = (hasError) =>
    `w-full rounded-xl border bg-white py-3 pl-11 pr-4 text-sm outline-none transition placeholder:text-slate-400 focus:ring-4 ${
      hasError
        ? "border-danger focus:border-danger focus:ring-danger/10"
        : "border-slate-300 focus:border-primary-500 focus:ring-primary-500/15"
    }`;

  return (
    <div className="grid min-h-screen lg:grid-cols-[2fr_3fr]">
      <BrandPanel />

      <main className="flex items-center justify-center px-5 py-10 sm:px-10">
        <div className="relative w-full max-w-md">
          {/* Compact logo for screens where the brand panel is hidden */}
          <div className="mb-8 flex items-center gap-2.5 font-display text-xl font-bold text-primary-600 lg:hidden">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-500 text-white">
              <Briefcase className="h-4 w-4" />
            </span>
            EJob
          </div>

          <h2 className="font-display text-3xl font-extrabold tracking-tight text-slate-900">
            Welcome back
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            Log in with your email or phone number.
          </p>

          {/* Shown only when the user was sent here from another page */}
          {requestedPath && (
            <div
              className="mt-6 flex items-start gap-2 rounded-xl border border-primary-500/30 bg-orange-50 p-3 text-sm text-slate-700"
              role="status"
            >
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary-600" />
              <p>
                {requiredRole
                  ? `Log in with a ${ROLE_LABELS[requiredRole] || requiredRole} account to continue.`
                  : "Log in to continue to the page you were opening."}
              </p>
            </div>
          )}

          {error && (
            <div
              className="mt-6 flex items-start gap-2 rounded-xl border border-danger/30 bg-red-50 p-3 text-sm text-danger"
              role="alert"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <div>
                {error}
                {needsVerification && (
                  <>
                    {" "}
                    <Link to="/signup" className="font-semibold underline">
                      Finish verification
                    </Link>
                  </>
                )}
              </div>
            </div>
          )}

          <form onSubmit={submit} noValidate className="mt-6 space-y-5">
            <div>
              <label htmlFor="identifier" className="mb-1.5 block text-sm font-medium text-slate-700">
                Email or phone number
              </label>
              <div className="relative">
                <IdIcon className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  id="identifier"
                  type="text"
                  inputMode={usingEmail || !identifier ? "email" : "tel"}
                  autoComplete="username"
                  autoFocus
                  placeholder="you@example.com or 0801 234 5678"
                  value={form.identifier}
                  onChange={update("identifier")}
                  className={inputClass(fieldErrors.identifier)}
                />
              </div>
              {fieldErrors.identifier && (
                <p className="mt-1.5 text-xs text-danger">{fieldErrors.identifier}</p>
              )}
            </div>

            <div>
              <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-slate-700">
                Password
              </label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  value={form.password}
                  onChange={update("password")}
                  className={`${inputClass(fieldErrors.password)} pr-11`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {fieldErrors.password && (
                <p className="mt-1.5 text-xs text-danger">{fieldErrors.password}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary-500 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-primary-500/25 transition hover:bg-primary-600 focus:outline-none focus:ring-4 focus:ring-primary-500/30 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Logging in…
                </>
              ) : (
                "Log in"
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-500">
            New to EJob?{" "}
            <Link to="/signup" className="font-semibold text-primary-600 hover:underline">
              Create an account
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}