import { ArrowRight, Sparkles } from "lucide-react";

const ROLE_LABEL = {
  jobseeker: "Job Seeker",
  employer: "Employer",
  agent: "Agent",
  admin: "Admin",
  superadmin: "Super Admin",
};

function Ring({ percent }) {
  const r = 34;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative h-24 w-24 shrink-0">
      <svg viewBox="0 0 80 80" className="h-full w-full -rotate-90">
        <circle cx="40" cy="40" r={r} fill="none" strokeWidth="8" className="stroke-white/25" />
        <circle
          cx="40" cy="40" r={r} fill="none" strokeWidth="8" strokeLinecap="round"
          className="stroke-white transition-all duration-700"
          strokeDasharray={c}
          strokeDashoffset={c - (c * percent) / 100}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center font-display text-xl font-extrabold">
        {percent}%
      </span>
    </div>
  );
}

export default function ProfileHeader({ user, completion, tabs, onGoTo }) {
  const percent = completion?.percent ?? 0;
  const person = [user.firstName, user.lastName].filter((v) => v && v !== "none").join(" ");
  const name = (user.role === "employer" && user.companyName) || person || "Your profile";
  const initials = name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
  const next = tabs.find((t) => (completion?.sections?.[t.key]?.percent ?? 100) < 100);

  return (
    <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-orange-500 via-orange-600 to-orange-700 p-5 text-white shadow-xl shadow-orange-600/20 sm:p-7">
      <div aria-hidden="true" className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/10 blur-2xl" />
      <div aria-hidden="true" className="pointer-events-none absolute -bottom-20 left-1/3 h-48 w-48 rounded-full bg-black/10 blur-3xl" />

      <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-4">
          {user.avatar ? (
            <img src={user.avatar} alt="" className="h-16 w-16 shrink-0 rounded-2xl object-cover ring-2 ring-white/60" />
          ) : (
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white font-display text-xl font-bold text-orange-600">
              {initials}
            </div>
          )}
          <div className="min-w-0">
            <h2 className="truncate font-display text-xl font-extrabold sm:text-2xl">{name}</h2>
            <span className="mt-1 inline-block rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-medium backdrop-blur">
              {ROLE_LABEL[user.role] || user.role}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <Ring percent={percent} />
          <div className="max-w-[14rem]">
            <p className="text-sm font-semibold">Profile completeness</p>
            {next ? (
              <>
                <p className="mt-0.5 text-xs text-white/80">
                  {completion.filled} of {completion.total} details added
                </p>
                <button
                  type="button"
                  onClick={() => onGoTo(next.key)}
                  className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-orange-700 shadow transition hover:-translate-y-0.5"
                >
                  Continue: {next.label} <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </>
            ) : (
              <p className="mt-0.5 flex items-center gap-1.5 text-xs text-white/90">
                <Sparkles className="h-3.5 w-3.5" /> Your profile is complete
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}