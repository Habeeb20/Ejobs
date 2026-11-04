import { ShieldAlert } from "lucide-react";

// Shown on the login page when a blacklisted person tries to sign in
// (or is signed out because they were blacklisted while logged in).
export default function BlacklistedNotice({ info }) {
  if (!info) return null;
  const support = import.meta.env.VITE_SUPPORT_EMAIL;

  return (
    <div role="alert" className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
      <div className="flex items-center gap-2 font-bold">
        <ShieldAlert className="h-5 w-5 shrink-0" />
        Account blacklisted
      </div>
      <p className="mt-2">{info.message || "Your account has been blacklisted and you can no longer use this platform."}</p>
      {info.reason && (
        <p className="mt-3 rounded-lg bg-white/70 p-3 text-slate-700">
          <span className="block text-xs font-semibold uppercase tracking-wide text-red-700">Reason</span>
          {info.reason}
        </p>
      )}
      {support && (
        <p className="mt-3 text-xs text-red-700">
          Think this is a mistake? Contact{" "}
          <a href={`mailto:${support}`} className="font-semibold underline">
            {support}
          </a>
          .
        </p>
      )}
    </div>
  );
}
