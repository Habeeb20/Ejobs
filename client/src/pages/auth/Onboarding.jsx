import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Briefcase,
  AlertCircle,
  ShieldCheck,
  BadgeCheck,
  MapPin,
  Sparkles,
  Users,
  Zap,
} from "lucide-react";
import Stepper from "../../components/Stepper";
import Loader from "../../components/Loader";
import StepAccount from "./StepAccount";
import StepVerify from "./StepVerify";
import StepProfile from "./StepProfile";
import StepCompany from "./StepCompany";
import { onboardingApi, getError } from "../../api";

const STEP_LABELS = ["Account", "Your details"];

const TRUST_ITEMS = [
  { icon: ShieldCheck, label: "Verified", sub: "every candidate" },
  { icon: Users, label: "3 roles", sub: "one platform" },
  { icon: Zap, label: "Fast", sub: "quick onboarding" },
];

const normalizeEmail = (email) => email.trim().toLowerCase();

export function BrandPanel() {
  return (
    <aside className="relative hidden overflow-hidden bg-gradient-to-br from-primary-600 via-primary-500 to-primary-700 p-12 text-white lg:flex lg:flex-col lg:justify-between">
      {/* Decorative layers */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        {/* Dot grid, fading toward the bottom */}
        <div
          className="absolute inset-0 opacity-25"
          style={{
            backgroundImage:
              "radial-gradient(rgba(255,255,255,0.9) 1px, transparent 1px)",
            backgroundSize: "26px 26px",
            WebkitMaskImage: "linear-gradient(to bottom, black, transparent 75%)",
            maskImage: "linear-gradient(to bottom, black, transparent 75%)",
          }}
        />
        {/* Glow blobs */}
        <div className="absolute -left-24 -top-24 h-72 w-72 rounded-full bg-white/20 blur-3xl" />
        <div className="absolute -bottom-32 -right-24 h-96 w-96 rounded-full bg-primary-400/50 blur-3xl" />
        <div className="absolute bottom-10 left-1/3 h-56 w-56 rounded-full bg-black/20 blur-3xl" />
      </div>

      {/* Logo */}
      <div className="relative z-10 flex items-center gap-2.5 font-display text-2xl font-bold">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-primary-600 shadow-lg shadow-black/20">
          <Briefcase className="h-5 w-5" />
        </span>
        EJob
      </div>

      {/* Headline + floating cards */}
      <div className="relative z-10">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-white/10 px-3 py-1 text-xs font-medium backdrop-blur">
          <Sparkles className="h-3.5 w-3.5" /> Verified hiring, made simple
        </span>

        <h1 className="mt-5 font-display text-5xl font-extrabold leading-[1.05] tracking-tight">
          Work that fits.
          <br />
          <span className="bg-gradient-to-r from-white to-white/70 bg-clip-text text-transparent">
            People you can trust.
          </span>
        </h1>

        <p className="mt-5 max-w-sm text-lg leading-relaxed text-white/85">
          Job seekers, employers and agents on one platform, with every candidate verified.
        </p>

        {/* Floating cards: hidden on short screens */}
        <div
          aria-hidden="true"
          className="relative mt-10 hidden h-44 max-w-md [@media(min-height:760px)]:block"
        >
          <div className="absolute left-0 top-0 w-72 -rotate-2 rounded-2xl border border-white/25 bg-white/15 p-4 shadow-xl shadow-black/20 backdrop-blur-md">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white font-display font-bold text-primary-600">
                AO
              </div>
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1 text-sm font-semibold">
                  Adaeze O. <BadgeCheck className="h-4 w-4 text-emerald-300" />
                </p>
                <p className="flex items-center gap-1 text-xs text-white/85">
                  <MapPin className="h-3 w-3" /> Lagos · Customer Support
                </p>
              </div>
            </div>
            <div className="mt-3 flex gap-2 text-[11px] font-medium">
              <span className="rounded-full bg-white/20 px-2.5 py-1">ID verified</span>
              <span className="rounded-full bg-white/20 px-2.5 py-1">Available now</span>
            </div>
          </div>

          <div
            className="absolute bottom-0 right-0 w-56 rotate-2 rounded-2xl border border-white/25 bg-white p-4 text-slate-800 shadow-2xl shadow-black/30 motion-safe:animate-pulse"
            style={{ animationDuration: "3s" }}
          >
            <div className="flex items-center gap-2 text-xs font-semibold text-primary-600">
              <Zap className="h-4 w-4" /> New match
            </div>
            <p className="mt-1 text-sm font-semibold">Sales Associate</p>
            <p className="text-xs text-slate-500">Ikeja · Full-time</p>
          </div>
        </div>
      </div>

      {/* Trust row: hidden on short screens */}
      <div className="relative z-10 hidden grid-cols-3 gap-4 border-t border-white/20 pt-6 [@media(min-height:760px)]:grid">
        {TRUST_ITEMS.map(({ icon: Icon, label, sub }) => (
          <div key={label} className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/15 backdrop-blur">
              <Icon className="h-4 w-4" />
            </span>
            <div className="leading-tight">
              <p className="text-sm font-semibold">{label}</p>
              <p className="text-xs text-white/75">{sub}</p>
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
}

export default function Onboarding() {
  const navigate = useNavigate();
  // stage: "account" -> "verify" (both are step 1) -> "details" (step 2)
  const [stage, setStage] = useState("account");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [account, setAccount] = useState({
    role: "",
    firstName: "",
    lastName: "",
    phoneNumber: "",
    email: "",
    password: "",
  });

  const register = async () => {
    setLoading(true);
    setError("");
    try {
      await onboardingApi.register({ ...account, email: normalizeEmail(account.email) });
      setStage("verify");
    } catch (err) {
      setError(getError(err));
    } finally {
      setLoading(false);
    }
  };

  const verify = async (code) => {
    setLoading(true);
    setError("");
    try {
      const { data } = await onboardingApi.verifyOtp({
        email: normalizeEmail(account.email),
        code,
      });
      localStorage.setItem("token", data.token);
      localStorage.setItem("role", data.user.role);
      setStage("details");
    } catch (err) {
      setError(getError(err));
    } finally {
      setLoading(false);
    }
  };

  const resend = async () => {
    setError("");
    try {
      await onboardingApi.resendOtp({ email: normalizeEmail(account.email) });
      return true;
    } catch (err) {
      setError(getError(err));
      return false;
    }
  };

  const complete = async (payload) => {
    setSaving(true);
    setError("");
    try {
      const { data } = await onboardingApi.completeProfile(payload);
      navigate(data.redirectTo, { replace: true });
    } catch (err) {
      setError(getError(err));
      setSaving(false);
    }
  };

  const stepIndex = stage === "details" ? 1 : 0;

  return (
    <div className="grid min-h-screen lg:grid-cols-[2fr_3fr]">
      <BrandPanel />

      {/* Form panel */}
      <main className="flex items-center justify-center px-5 py-10 sm:px-10">
        <div className="relative w-full max-w-xl">
          {/* Compact logo for screens where the brand panel is hidden */}
          <div className="mb-8 flex items-center gap-2.5 font-display text-xl font-bold text-primary-600 lg:hidden">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-500 text-white">
              <Briefcase className="h-4 w-4" />
            </span>
            EJob
          </div>

          <Stepper steps={STEP_LABELS} current={stepIndex} />

          {error && stage !== "verify" && (
            <div
              className="mb-5 flex items-start gap-2 rounded-xl border border-danger/30 bg-red-50 p-3 text-sm text-danger"
              role="alert"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {error}
            </div>
          )}

          {saving ? (
            <Loader label="Setting up your dashboard" />
          ) : stage === "account" ? (
            <StepAccount
              data={account}
              setData={setAccount}
              onSubmit={register}
              loading={loading}
            />
          ) : stage === "verify" ? (
            <StepVerify
              email={account.email}
              onVerify={verify}
              onResend={resend}
              onBack={() => {
                setError("");
                setStage("account");
              }}
              loading={loading}
              error={error}
              setError={setError}
            />
          ) : account.role === "employer" ? (
            <StepCompany onSubmit={complete} loading={saving} />
          ) : (
            <StepProfile role={account.role} onSubmit={complete} loading={saving} />
          )}
        </div>
      </main>
    </div>
  );
}