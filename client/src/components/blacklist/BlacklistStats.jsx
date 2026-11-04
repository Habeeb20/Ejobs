import { Ban, Building2, ShieldCheck, UserCheck, Users } from "lucide-react";

export default function BlacklistStats({ stats }) {
  const cards = [
    { label: "Total blacklisted", value: stats?.total, icon: Ban, tone: "bg-red-50 text-red-600" },
    { label: "Job seekers", value: stats?.byRole?.jobseeker, icon: UserCheck, tone: "bg-emerald-50 text-emerald-600" },
    { label: "Employers", value: stats?.byRole?.employer, icon: Building2, tone: "bg-blue-50 text-blue-600" },
    { label: "Admins", value: stats?.byRole?.admin, icon: ShieldCheck, tone: "bg-violet-50 text-violet-600" },
    { label: "Agents", value: stats?.byRole?.agent, icon: Users, tone: "bg-amber-50 text-amber-600" },
  ];

  return (
    <div>
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-5">
        {cards.map(({ label, value, icon: Icon, tone }) => (
          <div key={label} className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100 sm:p-5">
            <span className={`grid h-10 w-10 place-items-center rounded-xl ${tone}`}>
              <Icon className="h-5 w-5" aria-hidden="true" />
            </span>
            {stats ? (
              <p className="mt-3 text-2xl font-extrabold tabular-nums text-slate-900">
                {Number(value || 0).toLocaleString("en-NG")}
              </p>
            ) : (
              <div className="mt-3 h-8 w-12 animate-pulse rounded bg-slate-100" />
            )}
            <p className="mt-0.5 text-sm font-medium text-slate-500">{label}</p>
          </div>
        ))}
      </div>

      {stats && (
        <p className="mt-3 text-sm text-slate-500">
          Last 30 days: <strong className="text-slate-700">{stats.blacklistedLast30Days}</strong> blacklisted ·{" "}
          <strong className="text-slate-700">{stats.liftedLast30Days}</strong> reinstated
        </p>
      )}
    </div>
  );
}
