import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertCircle,
  BarChart3,
  Briefcase,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  ShieldCheck,
  Users,
} from "lucide-react";

import { adminApi, getError } from "../../api";

const isEmail = (v) => /^\S+@\S+\.\S+$/.test(v);

const HIGHLIGHTS = [
  { icon: Users, title: "People & companies", text: "Manage job seekers, employers and agents in one place." },
  { icon: BarChart3, title: "Clear insights", text: "Track activity and performance across the platform." },
  { icon: ShieldCheck, title: "Secure access", text: "Role-based permissions keep sensitive data protected." },
];

/* Left side: calm, dark, one soft accent */
const SidePanel = () => (
  <aside className="relative hidden overflow-hidden bg-slate-950 text-white lg:flex lg:flex-col lg:justify-between lg:p-12">
    {/* subtle dot grid + faint accent glow */}
    <div
      className="pointer-events-none absolute inset-0"
      style={{
        backgroundImage: "radial-gradient(rgba(255,255,255,0.07) 1px, transparent 1px)",
        backgroundSize: "24px 24px",
      }}
    />
    <div className="pointer-events-none absolute -bottom-40 -left-40 h-[28rem] w-[28rem] rounded-full bg-primary-500/15 blur-3xl" />

    <div className="relative flex items-center gap-3">
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/15">
        <Briefcase className="h-5 w-5" />
      </span>
      <span className="font-display text-xl font-bold tracking-tight">EJob</span>
      <span className="rounded-md bg-white/10 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-slate-300">
        Admin
      </span>
    </div>

    <div className="relative max-w-md">
      <h1 className="font-display text-4xl font-bold leading-tight tracking-tight">
        Run your platform with confidence.
      </h1>
      <p className="mt-4 text-base leading-relaxed text-slate-400">
        Sign in to review activity, support users and keep hiring moving.
      </p>

      <ul className="mt-10 space-y-6">
        {HIGHLIGHTS.map(({ icon: Icon, title, text }) => (
          <li key={title} className="flex gap-4">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/5 ring-1 ring-white/10">
              <Icon className="h-5 w-5 text-slate-200" />
            </span>
            <div>
              <p className="text-sm font-semibold text-white">{title}</p>
              <p className="mt-0.5 text-sm text-slate-400">{text}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>

    <p className="relative text-xs text-slate-500">© {new Date().getFullYear()} EJob. All rights reserved.</p>
  </aside>
);

export default function AdminLogin() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  const email = form.email.trim();

  const update = (key) => (e) => {
    setForm((f) => ({ ...f, [key]: e.target.value }));
    setFieldErrors((fe) => ({ ...fe, [key]: "" }));
    setError("");
  };

  const validate = () => {
    const errs = {};
    if (!email) errs.email = "Enter your email address";
    else if (!isEmail(email)) errs.email = "Enter a valid email address";
    if (!form.password) errs.password = "Enter your password";
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    setError("");
    try {
      const { data } = await adminApi.login({
        email: email.toLowerCase(),
        password: form.password,
      });
      localStorage.setItem("token", data.token);
      localStorage.setItem("role", data.user.role);
      navigate( "/dashboard", { replace: true });
    } catch (err) {
      setError(getError(err));
    } finally {
      setLoading(false);
    }
  };

  const inputClass = (hasError) =>
    `w-full rounded-lg border bg-white py-3 pl-11 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:ring-4 ${
      hasError
        ? "border-danger focus:border-danger focus:ring-danger/10"
        : "border-slate-300 hover:border-slate-400 focus:border-slate-900 focus:ring-slate-900/10"
    }`;

  return (
    <div className="grid min-h-screen bg-white lg:grid-cols-2">
      <SidePanel />

      <main className="flex items-center justify-center px-6 py-12 sm:px-10">
        <div className="w-full max-w-sm">
          {/* Compact logo when the side panel is hidden */}
          <div className="mb-10 flex items-center gap-2.5 lg:hidden">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-900 text-white">
              <Briefcase className="h-4 w-4" />
            </span>
            <span className="font-display text-lg font-bold tracking-tight text-slate-900">EJob</span>
            <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Admin
            </span>
          </div>

          <h2 className="font-display text-3xl font-bold tracking-tight text-slate-900">Sign in</h2>
          <p className="mt-2 text-sm text-slate-500">Use your email address to access your account.</p>

          {error && (
            <div
              role="alert"
              className="mt-6 flex items-start gap-2.5 rounded-lg border border-danger/30 bg-red-50 px-4 py-3 text-sm text-danger"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={submit} noValidate className="mt-8 space-y-5">
            <div>
              <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-slate-700">
                Email address
              </label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  id="email"
                  name="email"
                  type="email"
                  inputMode="email"
                  autoComplete="username"
                  autoFocus
                  placeholder="you@example.com"
                  value={form.email}
                  onChange={update("email")}
                  aria-invalid={Boolean(fieldErrors.email)}
                  aria-describedby={fieldErrors.email ? "email-error" : undefined}
                  className={inputClass(fieldErrors.email)}
                />
              </div>
              {fieldErrors.email && (
                <p id="email-error" className="mt-1.5 text-xs text-danger">
                  {fieldErrors.email}
                </p>
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
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  value={form.password}
                  onChange={update("password")}
                  aria-invalid={Boolean(fieldErrors.password)}
                  aria-describedby={fieldErrors.password ? "password-error" : undefined}
                  className={`${inputClass(fieldErrors.password)} pr-11`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 transition hover:text-slate-700"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {fieldErrors.password && (
                <p id="password-error" className="mt-1.5 text-xs text-danger">
                  {fieldErrors.password}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 focus:outline-none focus-visible:ring-4 focus-visible:ring-slate-900/20 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Signing in…
                </>
              ) : (
                "Sign in"
              )}
            </button>
          </form>

          <p className="mt-8 flex items-center justify-center gap-1.5 text-xs text-slate-400">
            <Lock className="h-3 w-3" />
            Protected area. Authorized staff only.
          </p>
        </div>
      </main>
    </div>
  );
}