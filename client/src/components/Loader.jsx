import { Briefcase } from "lucide-react";

// Orbiting ring around a pulsing briefcase. size in px.
export function BrandSpinner({ size = 72 }) {
  return (
    <div className="relative" style={{ width: size, height: size }} role="status" aria-label="Loading">
      <div
        className="absolute inset-0 animate-spin rounded-full"
        style={{ background: "conic-gradient(from 0deg, rgba(249,115,22,0) 0%, #F97316 100%)", animationDuration: "1.1s" }}
      />
      <div className="absolute rounded-full bg-white" style={{ inset: size * 0.09 }} />
      <div className="absolute inset-0 flex items-center justify-center">
        <Briefcase className="animate-pulse text-primary-500" style={{ width: size * 0.38, height: size * 0.38 }} strokeWidth={2.2} />
      </div>
      <span
        className="absolute left-1/2 top-0 h-2.5 w-2.5 -translate-x-1/2 rounded-full bg-primary-600 shadow-[0_0_12px_#F97316]"
        style={{ marginTop: -2 }}
      />
    </div>
  );
}

export function Dots() {
  return (
    <div className="flex items-center gap-1.5">
      {[0, 1, 2].map((i) => (
        <span key={i} className="h-2 w-2 animate-bounce-dot rounded-full bg-primary-500" style={{ animationDelay: `${i * 0.15}s` }} />
      ))}
    </div>
  );
}

// Small inline spinner for buttons
export function Spinner({ className = "h-5 w-5" }) {
  return (
    <svg className={`animate-spin ${className}`} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity=".25" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

// Default export: use <Loader fullScreen label="Loading jobs" /> for pages,
// or <Loader label="Saving" /> inside a card/section.
export default function Loader({ label = "Loading", fullScreen = false }) {
  const body = (
    <div className="flex flex-col items-center gap-5">
      <BrandSpinner />
      <div className="flex flex-col items-center gap-2">
        <p className="font-display text-lg font-semibold text-ink-900">{label}</p>
        <Dots />
      </div>
    </div>
  );

  if (fullScreen)
    return <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/90 backdrop-blur-sm">{body}</div>;
  return <div className="flex w-full items-center justify-center py-16">{body}</div>;
}
