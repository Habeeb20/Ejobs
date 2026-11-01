import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, ComposedChart, Funnel, FunnelChart, LabelList, Legend,
  Line, PieChart, Pie, PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart,
  ResponsiveContainer, Tooltip, Treemap, XAxis, YAxis,
} from "recharts";
import {
  Activity, BadgeCheck, Banknote, Briefcase, Building2, FileText, HandCoins, Loader2, MapPin,
  Repeat, Search, UserCheck, Users,
} from "lucide-react";
import { toast } from "sonner";
import { analyticsApi, getError } from "../../api";

/* ---------- formatting ---------- */
const COLORS = ["#ea580c", "#2563eb", "#16a34a", "#9333ea", "#e11d48", "#0891b2", "#ca8a04", "#4f46e5", "#db2777", "#65a30d", "#0d9488", "#c026d3"];
const n = (v) => Number(v || 0).toLocaleString("en-NG");
const naira = (v) => `₦${n(Math.round(v || 0))}`;
const compact = (v) => new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(v || 0);
const pct = (a, b) => (b ? `${Math.round((a / b) * 100)}%` : "0%");
const cap = (s = "") => String(s).replace(/^\w/, (c) => c.toUpperCase());
const monthLabel = (m) => {
  const [y, mo] = m.split("-");
  return new Date(Date.UTC(+y, +mo - 1, 1)).toLocaleDateString("en-GB", { month: "short", year: "2-digit", timeZone: "UTC" });
};
const tipStyle = { borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12 };

/* ---------- building blocks ---------- */
function Card({ title, subtitle, children, className = "" }) {
  return (
    <section className={`rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100 ${className}`}>
      <h3 className="font-bold text-slate-900">{title}</h3>
      {subtitle && <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

const Empty = () => <p className="py-8 text-center text-sm text-slate-400">No data yet</p>;

function Kpi({ icon: Icon, label, value, hint, tone = "bg-orange-50 text-orange-600" }) {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100 transition hover:-translate-y-0.5 hover:shadow-md">
      <span className={`grid h-10 w-10 place-items-center rounded-xl ${tone}`}><Icon className="h-5 w-5" aria-hidden="true" /></span>
      <p className="mt-3 text-2xl font-extrabold tracking-tight text-slate-900 tabular-nums">{value}</p>
      <p className="text-sm font-medium text-slate-500">{label}</p>
      {hint && <p className="mt-0.5 text-xs text-slate-400">{hint}</p>}
    </div>
  );
}

const Grid = ({ cols = "lg:grid-cols-2", children }) => <div className={`grid gap-5 ${cols}`}>{children}</div>;

function HBar({ data = [], color = COLORS[0], fmt = n, valueKey = "value", max = 20 }) {
  const rows = data.slice(0, max);
  if (!rows.length) return <Empty />;
  return (
    <ResponsiveContainer width="100%" height={Math.max(200, rows.length * 30 + 20)}>
      <BarChart data={rows} layout="vertical" margin={{ left: 8, right: 40 }}>
        <CartesianGrid horizontal={false} stroke="#f1f5f9" />
        <XAxis type="number" hide />
        <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 12 }} tickFormatter={(v) => (String(v).length > 17 ? `${String(v).slice(0, 16)}…` : cap(v))} />
        <Tooltip formatter={(v) => fmt(v)} contentStyle={tipStyle} cursor={{ fill: "#fff7ed" }} />
        <Bar dataKey={valueKey} fill={color} radius={[0, 6, 6, 0]}>
          <LabelList dataKey={valueKey} position="right" formatter={(v) => compact(v)} style={{ fontSize: 11, fill: "#475569" }} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

function VBar({ data = [], color = COLORS[1], fmt = n, valueKey = "value", height = 260 }) {
  if (!data.length) return <Empty />;
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ left: -10, right: 8 }}>
        <CartesianGrid vertical={false} stroke="#f1f5f9" />
        <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} />
        <YAxis tick={{ fontSize: 11 }} tickFormatter={compact} />
        <Tooltip formatter={(v) => fmt(v)} contentStyle={tipStyle} />
        <Bar dataKey={valueKey} radius={[6, 6, 0, 0]}>
          {data.map((_, i) => <Cell key={i} fill={data.length > 1 ? COLORS[i % COLORS.length] : color} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

function Donut({ data = [], height = 260 }) {
  const rows = data.filter((d) => d.value > 0);
  if (!rows.length) return <Empty />;
  const total = rows.reduce((s, d) => s + d.value, 0);
  return (
    <div>
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie data={rows} dataKey="value" nameKey="name" innerRadius="55%" outerRadius="85%" paddingAngle={2} stroke="none">
            {rows.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
          </Pie>
          <Tooltip formatter={(v, name) => [`${n(v)} (${pct(v, total)})`, cap(name)]} contentStyle={tipStyle} />
        </PieChart>
      </ResponsiveContainer>
      <ul className="mt-2 flex flex-wrap justify-center gap-x-4 gap-y-1.5 text-xs text-slate-600">
        {rows.slice(0, 8).map((d, i) => (
          <li key={d.name} className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
            {cap(d.name)} <b className="text-slate-800">{n(d.value)}</b>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Trend({ data = [], color = COLORS[0], name = "Total", height = 240 }) {
  if (!data.length) return <Empty />;
  const rows = data.map((d) => ({ ...d, label: monthLabel(d.month) }));
  const id = `g${color.slice(1)}`;
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={rows} margin={{ left: -10, right: 8 }}>
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={color} stopOpacity={0.35} /><stop offset="95%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke="#f1f5f9" />
        <XAxis dataKey="label" tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} tickFormatter={compact} allowDecimals={false} />
        <Tooltip contentStyle={tipStyle} />
        <Area type="monotone" dataKey="value" name={name} stroke={color} strokeWidth={2.5} fill={`url(#${id})`} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

// Several monthly series on one chart
function MultiTrend({ series, height = 300, kind = "line" }) {
  const months = series[0]?.data.map((d) => d.month) || [];
  const rows = months.map((m, i) => ({ label: monthLabel(m), ...Object.fromEntries(series.map((s) => [s.name, s.data[i]?.value || 0])) }));
  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={rows} margin={{ left: -10, right: 8 }}>
        <CartesianGrid vertical={false} stroke="#f1f5f9" />
        <XAxis dataKey="label" tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} tickFormatter={compact} allowDecimals={false} />
        <Tooltip contentStyle={tipStyle} /><Legend wrapperStyle={{ fontSize: 12 }} />
        {series.map((s, i) => kind === "bar"
          ? <Bar key={s.name} dataKey={s.name} fill={COLORS[i]} radius={[4, 4, 0, 0]} />
          : <Line key={s.name} type="monotone" dataKey={s.name} stroke={COLORS[i]} strokeWidth={2.5} dot={{ r: 3 }} />)}
      </ComposedChart>
    </ResponsiveContainer>
  );
}

function FlagBars({ data = [] }) {
  if (!data.length) return <Empty />;
  return (
    <ul className="space-y-3">
      {data.map((f, i) => (
        <li key={f.name}>
          <div className="flex justify-between text-sm"><span className="text-slate-700">{f.name}</span>
            <span className="font-semibold text-slate-900">{n(f.value)} <span className="text-slate-400">· {pct(f.value, f.total)}</span></span></div>
          <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full" style={{ width: pct(f.value, f.total), background: COLORS[i % COLORS.length] }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

function TreemapChart({ data = [], height = 320 }) {
  const rows = data.filter((d) => d.value > 0).slice(0, 25);
  if (!rows.length) return <Empty />;
  const Cellr = ({ x, y, width, height: h, index, name, value }) => (
    <g>
      <rect x={x} y={y} width={width} height={h} fill={COLORS[index % COLORS.length]} stroke="#fff" strokeWidth={2} rx={6} />
      {width > 70 && h > 36 && (
        <text x={x + 8} y={y + 20} fill="#fff" fontSize={12} fontWeight={700}>{String(name).slice(0, Math.floor(width / 8))}</text>
      )}
      {width > 70 && h > 36 && <text x={x + 8} y={y + 36} fill="#fff" fontSize={11} opacity={0.9}>{n(value)}</text>}
    </g>
  );
  return (
    <ResponsiveContainer width="100%" height={height}>
      <Treemap data={rows} dataKey="value" nameKey="name" content={<Cellr />} isAnimationActive={false}><Tooltip contentStyle={tipStyle} /></Treemap>
    </ResponsiveContainer>
  );
}

function RadarBlock({ data = [], color = COLORS[3], height = 280 }) {
  const rows = data.slice(0, 8);
  if (rows.length < 3) return <HBar data={rows} color={color} />;
  return (
    <ResponsiveContainer width="100%" height={height}>
      <RadarChart data={rows} outerRadius="72%">
        <PolarGrid stroke="#e2e8f0" /><PolarAngleAxis dataKey="name" tick={{ fontSize: 11 }} /><PolarRadiusAxis tick={false} axisLine={false} />
        <Radar dataKey="value" stroke={color} fill={color} fillOpacity={0.35} /><Tooltip contentStyle={tipStyle} />
      </RadarChart>
    </ResponsiveContainer>
  );
}

function FunnelBlock({ data = [] }) {
  if (!data.length || !data[0].value) return <Empty />;
  const rows = data.map((d, i) => ({ ...d, fill: COLORS[i % COLORS.length] }));
  return (
    <div>
      <ResponsiveContainer width="100%" height={300}>
        <FunnelChart>
          <Tooltip contentStyle={tipStyle} />
          <Funnel dataKey="value" data={rows} isAnimationActive>
            <LabelList position="right" fill="#334155" stroke="none" dataKey="name" style={{ fontSize: 12 }} />
          </Funnel>
        </FunnelChart>
      </ResponsiveContainer>
      <p className="mt-1 text-center text-xs text-slate-500">
        {rows.map((r, i) => (i ? `${r.name} ${pct(r.value, rows[0].value)}` : null)).filter(Boolean).join(" · ")} of all applications
      </p>
    </div>
  );
}

function ShareBars({ e = {} }) {
  const data = ["whatsapp", "facebook", "twitter", "linkedin", "telegram", "email", "copy", "other"].map((k) => ({ name: k, value: e[k] || 0 }));
  return <VBar data={data} height={240} />;
}

function Table({ rows = [], cols }) {
  if (!rows.length) return <Empty />;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead><tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-500">
          {cols.map((c) => <th key={c.label} className={`py-2 pr-4 font-semibold ${c.right ? "text-right" : ""}`}>{c.label}</th>)}
        </tr></thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-b border-slate-50 last:border-0">
              {cols.map((c) => <td key={c.label} className={`py-2 pr-4 ${c.right ? "text-right tabular-nums" : "text-slate-700"}`}>{c.render ? c.render(r) : r[c.key]}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ---------- tabs ---------- */
function Overview({ d }) {
  const k = d.kpis;
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
        <Kpi icon={Users} label="Total users" value={n(k.totalUsers)} hint={`+${n(k.users7d)} this week`} />
        <Kpi icon={UserCheck} label="Job seekers" value={n(k.jobseekers)} tone="bg-emerald-50 text-emerald-600" hint={`${n(k.jobseekerChangers)} job changers`} />
        <Kpi icon={Building2} label="Employers" value={n(k.employers)} tone="bg-blue-50 text-blue-600" />
        <Kpi icon={Briefcase} label="Live jobs" value={n(k.liveJobs)} tone="bg-amber-50 text-amber-600" hint={`${n(k.totalJobs)} posted overall`} />
        <Kpi icon={FileText} label="Applications" value={n(k.applications)} tone="bg-violet-50 text-violet-600" hint={`+${n(k.applications7d)} this week`} />
        <Kpi icon={BadgeCheck} label="Employed (offers)" value={n(k.employed)} tone="bg-rose-50 text-rose-600" hint={`${n(k.accepted)} accepted`} />
        <Kpi icon={Activity} label="Jobs, last 24h" value={n(k.jobs24h)} tone="bg-orange-50 text-orange-600" />
        <Kpi icon={Activity} label="Jobs, last 7 days" value={n(k.jobs7d)} tone="bg-orange-50 text-orange-600" />
        <Kpi icon={Activity} label="Jobs, last 30 days" value={n(k.jobs30d)} tone="bg-orange-50 text-orange-600" />
        <Kpi icon={Users} label="Active users, 7 days" value={n(k.activeUsers7d)} tone="bg-sky-50 text-sky-600" hint={`${n(k.activeUsers30d)} in 30 days`} />
        <Kpi icon={Briefcase} label="Awaiting approval" value={n(k.awaitingApproval)} tone="bg-yellow-50 text-yellow-600" />
        <Kpi icon={HandCoins} label="Benefits paid" value={naira(k.benefitsPaidAmount)} tone="bg-teal-50 text-teal-600" hint={`${n(k.benefitRequests)} requests`} />
      </div>
      <Card title="Growth over the last 12 months" subtitle="New users, jobs posted and applications received each month">
        <MultiTrend series={[
          { name: "New users", data: d.users.signupsMonthly }, { name: "Jobs posted", data: d.jobs.monthly },
          { name: "Applications", data: d.applications.monthly }, { name: "Offers", data: d.applications.offersMonthly },
        ]} />
      </Card>
      <Grid cols="lg:grid-cols-3">
        <Card title="Users by role"><Donut data={d.users.byRole} /></Card>
        <Card title="Hiring funnel" subtitle="How far applications progressed"><FunnelBlock data={d.applications.funnel} /></Card>
        <Card title="How people joined"><Donut data={d.users.byRegistrationMethod} /></Card>
      </Grid>
      <Grid>
        <Card title="Top states for jobs"><HBar data={d.jobs.byState} max={12} color={COLORS[0]} /></Card>
        <Card title="Top industries" subtitle="Share of all job postings"><TreemapChart data={d.jobs.byIndustry} /></Card>
      </Grid>
    </div>
  );
}

function JobsTab({ d }) {
  const j = d.jobs, e = j.engagement || {};
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4 xl:grid-cols-6">
        <Kpi icon={Briefcase} label="Openings available" value={n(j.totalOpenings)} />
        <Kpi icon={Activity} label="Total views" value={n(e.views)} tone="bg-emerald-50 text-emerald-600" />
        <Kpi icon={Activity} label="Likes" value={n(e.likes)} tone="bg-rose-50 text-rose-600" />
        <Kpi icon={Activity} label="Shares" value={n(e.shares)} tone="bg-blue-50 text-blue-600" />
        <Kpi icon={Activity} label="Follows" value={n(e.follows)} tone="bg-violet-50 text-violet-600" />
        <Kpi icon={Repeat} label="Renewals" value={n(j.renewals)} tone="bg-amber-50 text-amber-600" />
      </div>
      <Card title="Jobs posted vs jobs approved, by month"><MultiTrend kind="bar" series={[{ name: "Posted", data: j.monthly }, { name: "Approved", data: j.approvedMonthly }]} /></Card>
      <Grid cols="lg:grid-cols-3">
        <Card title="Status"><Donut data={j.byStatus} /></Card>
        <Card title="Plan (Basic, Standard, Premium)"><Donut data={j.byPlan} /></Card>
        <Card title="Payment"><Donut data={j.byPayment} /></Card>
      </Grid>
      <Grid>
        <Card title="Jobs by industry"><HBar data={j.byIndustry} max={20} color={COLORS[1]} /></Card>
        <Card title="Jobs by function"><HBar data={j.byFunction} max={20} color={COLORS[2]} /></Card>
      </Grid>
      <Grid cols="lg:grid-cols-3">
        <Card title="Work type"><Donut data={j.byWorkType} /></Card>
        <Card title="Job level"><RadarBlock data={j.byLevel} /></Card>
        <Card title="Experience wanted"><VBar data={j.byExperience} /></Card>
      </Grid>
      <Grid>
        <Card title="Minimum qualification"><HBar data={j.byQualification} color={COLORS[3]} /></Card>
        <Card title="Vacancy duration"><VBar data={j.byVacancy} /></Card>
      </Grid>
      <Grid cols="lg:grid-cols-3">
        <Card title="Currency"><Donut data={j.byCurrency} /></Card>
        <Card title="Open to students"><Donut data={j.byStudents} /></Card>
        <Card title="Job source"><Donut data={j.bySource} /></Card>
      </Grid>
      <Grid>
        <Card title="Salary ranges (₦)" subtitle="Jobs paid in naira, grouped by monthly figure as posted"><VBar data={j.salaryBuckets} color={COLORS[0]} /></Card>
        <Card title="Salary summary by currency">
          <Table rows={j.salaryByCurrency} cols={[
            { label: "Currency", key: "currency" }, { label: "Jobs", right: true, render: (r) => n(r.count) },
            { label: "Average", right: true, render: (r) => n(r.avg) }, { label: "Lowest", right: true, render: (r) => n(r.min) },
            { label: "Highest", right: true, render: (r) => n(r.max) },
          ]} />
        </Card>
      </Grid>
      <Grid>
        <Card title="Highest average pay by state (₦)"><HBar data={j.salaryByState} fmt={naira} color={COLORS[4]} /></Card>
        <Card title="Highest average pay by industry (₦)"><HBar data={j.salaryByIndustry} fmt={naira} color={COLORS[5]} /></Card>
      </Grid>
      <Grid>
        <Card title="Most requested skills"><HBar data={j.topSkills} max={20} color={COLORS[6]} /></Card>
        <Card title="Popular job tags"><HBar data={j.topTags} max={20} color={COLORS[7]} /></Card>
      </Grid>
      <Grid>
        <Card title="Where people share jobs"><ShareBars e={e} /></Card>
        <Card title="Job settings"><FlagBars data={j.flags} /></Card>
      </Grid>
      <Card title="Most viewed jobs">
        <Table rows={j.topViewed} cols={[
          { label: "Job", key: "jobTitle" }, { label: "State", key: "state" }, { label: "Industry", key: "industry" },
          { label: "Views", right: true, render: (r) => n(r.totalViews) }, { label: "Likes", right: true, render: (r) => n(r.likeCount) },
          { label: "Shares", right: true, render: (r) => n(r.shareCount) }, { label: "Applicants", right: true, render: (r) => n(r.applicantCount) },
        ]} />
      </Card>
    </div>
  );
}

// Merges several {name, value} lists into rows for a grouped bar chart
const mergeByName = (lists, top = 12) => {
  const map = {};
  Object.entries(lists).forEach(([key, arr]) => (arr || []).forEach((r) => {
    const k = String(r.name).toLowerCase();
    map[k] = map[k] || { name: r.name }; map[k][key] = r.value;
  }));
  return Object.values(map).sort((a, b) => (b.Jobs || 0) - (a.Jobs || 0)).slice(0, top);
};

function LocationsTab({ d }) {
  const [state, setState] = useState("");
  const [q, setQ] = useState("");
  const states = useMemo(() => [...new Set((d.jobs.byLocation || []).map((r) => r.state))].sort(), [d]);
  const same = (r) => !state || String(r.state).toLowerCase() === state.toLowerCase();
  const group = (rows, key) => {
    const m = {};
    (rows || []).filter(same).forEach((r) => { const k = r[key]; if (!k) return; const l = k.toLowerCase(); m[l] = m[l] || { name: k, value: 0 }; m[l].value += r.value; });
    return Object.values(m).sort((a, b) => b.value - a.value);
  };
  const jobsLga = group(d.jobs.byLocation, "localGovernment"), jobsCity = group(d.jobs.byLocation, "city");
  const liveCity = group(d.jobs.liveByLocation, "city");
  const seekerLga = group(d.seekers.byLocation, "localGovernment"), changerLga = group(d.changers.byLocation, "localGovernment");
  const employerLga = group(d.employers.byLocation, "localGovernment");

  const table = useMemo(() => {
    const m = {};
    const row = (s, l) => {
      const key = `${String(s).toLowerCase()}|${String(l).toLowerCase()}`;
      m[key] = m[key] || { state: s, lga: l, Jobs: 0, Seekers: 0, Changers: 0, Employers: 0 };
      return m[key];
    };
    (d.jobs.byLocation || []).filter(same).forEach((r) => { row(r.state, r.localGovernment).Jobs += r.value; });
    (d.seekers.byLocation || []).filter(same).forEach((r) => { row(r.state, r.localGovernment).Seekers += r.value; });
    (d.changers.byLocation || []).filter(same).forEach((r) => { row(r.state, r.localGovernment).Changers += r.value; });
    (d.employers.byLocation || []).filter(same).forEach((r) => { row(r.state, r.localGovernment).Employers += r.value; });
    return Object.values(m)
      .filter((r) => !q || `${r.state} ${r.lga}`.toLowerCase().includes(q.toLowerCase()))
      .sort((a, b) => b.Jobs + b.Seekers - (a.Jobs + a.Seekers)).slice(0, 100);
  }, [d, state, q]);

  return (
    <div className="space-y-6">
      <Card title="State comparison" subtitle="Jobs, job seekers, job changers and employers in the busiest states">
        <ResponsiveContainer width="100%" height={340}>
          <BarChart data={mergeByName({ Jobs: d.jobs.byState, Seekers: d.seekers.byState, Changers: d.changers.byState, Employers: d.employers.byState })} margin={{ left: -10 }}>
            <CartesianGrid vertical={false} stroke="#f1f5f9" />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-25} textAnchor="end" height={60} />
            <YAxis tick={{ fontSize: 11 }} tickFormatter={compact} /><Tooltip contentStyle={tipStyle} /><Legend wrapperStyle={{ fontSize: 12 }} />
            {["Jobs", "Seekers", "Changers", "Employers"].map((k, i) => <Bar key={k} dataKey={k} fill={COLORS[i]} radius={[4, 4, 0, 0]} />)}
          </BarChart>
        </ResponsiveContainer>
      </Card>

      <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
        <MapPin className="h-5 w-5 text-orange-600" />
        <label className="text-sm font-semibold text-slate-700" htmlFor="stateSel">Zoom into a state</label>
        <select id="stateSel" value={state} onChange={(e) => setState(e.target.value)}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-4 focus:ring-orange-500/15">
          <option value="">All states</option>{states.map((s) => <option key={s}>{s}</option>)}
        </select>
      </div>

      <Grid>
        <Card title={`Jobs by LGA${state ? ` in ${state}` : ""}`}><HBar data={jobsLga} max={20} color={COLORS[0]} /></Card>
        <Card title={`Jobs by city${state ? ` in ${state}` : ""}`}><HBar data={jobsCity} max={20} color={COLORS[1]} /></Card>
      </Grid>
      <Grid>
        <Card title="Live jobs by city" subtitle="Online and not yet expired"><HBar data={liveCity} max={20} color={COLORS[2]} /></Card>
        <Card title="Employers by LGA"><HBar data={employerLga} max={20} color={COLORS[3]} /></Card>
      </Grid>
      <Grid>
        <Card title="Job seekers by LGA"><HBar data={seekerLga} max={20} color={COLORS[4]} /></Card>
        <Card title="Job changers by LGA"><HBar data={changerLga} max={20} color={COLORS[5]} /></Card>
      </Grid>
      <Grid>
        <Card title="Industries by state" subtitle="Biggest state and industry pairs">
          <HBar data={(d.jobs.industryByState || []).filter(same).slice(0, 20).map((r) => ({ name: `${r.industry} (${r.state})`, value: r.value }))} color={COLORS[6]} />
        </Card>
        <Card title="Employed people by state" subtitle="Applications that reached the offer stage"><HBar data={d.applications.employedByState} color={COLORS[7]} /></Card>
      </Grid>

      <Card title="Local government breakdown" subtitle="Areas with fewer than 3 people are hidden. Cities are only stored on jobs.">
        <div className="relative mb-4 max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search a state or LGA" aria-label="Search locations"
            className="w-full rounded-xl border border-slate-200 py-2 pl-9 pr-3 text-sm focus:border-orange-500 focus:outline-none focus:ring-4 focus:ring-orange-500/15" />
        </div>
        <Table rows={table} cols={[
          { label: "State", key: "state" }, { label: "LGA", key: "lga" },
          { label: "Jobs", right: true, render: (r) => n(r.Jobs) }, { label: "Seekers", right: true, render: (r) => n(r.Seekers) },
          { label: "Changers", right: true, render: (r) => n(r.Changers) }, { label: "Employers", right: true, render: (r) => n(r.Employers) },
        ]} />
      </Card>
    </div>
  );
}

function ChangersTab({ d }) {
  const c = d.changers;
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Kpi icon={Repeat} label="Job changers" value={n(c.total)} tone="bg-orange-50 text-orange-600" />
        <Kpi icon={UserCheck} label="Share of job seekers" value={pct(c.total, c.share)} tone="bg-emerald-50 text-emerald-600" />
        <Kpi icon={MapPin} label="States covered" value={n((c.byState || []).length)} tone="bg-blue-50 text-blue-600" />
        <Kpi icon={BadgeCheck} label="Certified changers" value={n((c.flags.find((f) => f.name === "Certified") || {}).value)} tone="bg-violet-50 text-violet-600" />
      </div>
      <Card title="Job changers joining each month"><Trend data={c.monthly} color={COLORS[0]} name="Job changers" /></Card>
      <Grid>
        <Card title="Job changers by state"><HBar data={c.byState} max={20} color={COLORS[0]} /></Card>
        <Card title="Job changers by LGA (top 20)">
          <HBar max={20} color={COLORS[1]} data={(c.byLocation || []).slice(0, 20).map((r) => ({ name: `${r.localGovernment} (${r.state})`, value: r.value }))} />
        </Card>
      </Grid>
      <Grid cols="lg:grid-cols-3">
        <Card title="Gender"><Donut data={c.byGender} /></Card>
        <Card title="Education"><Donut data={c.byEducation} /></Card>
        <Card title="Marital status"><Donut data={c.byMaritalStatus} /></Card>
      </Grid>
      <Grid>
        <Card title="Roles they want"><HBar data={c.byJobChoice} max={20} color={COLORS[2]} /></Card>
        <Card title="Skills on their CVs"><HBar data={c.topSkills} max={15} color={COLORS[3]} /></Card>
      </Grid>
      <Grid>
        <Card title="Job mode"><VBar data={c.byJobMode} /></Card>
        <Card title="Working mode"><VBar data={c.byWorkingMode} /></Card>
      </Grid>
      <Card title="Verification and availability"><FlagBars data={c.flags} /></Card>
    </div>
  );
}

function ApplicationsTab({ d }) {
  const a = d.applications, k = d.kpis;
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4 xl:grid-cols-6">
        <Kpi icon={FileText} label="Applications" value={n(k.applications)} hint={`+${n(k.applications24h)} today`} tone="bg-violet-50 text-violet-600" />
        <Kpi icon={BadgeCheck} label="Offers (employed)" value={n(k.employed)} hint={pct(k.employed, k.applications)} tone="bg-rose-50 text-rose-600" />
        <Kpi icon={BadgeCheck} label="Accepted" value={n(k.accepted)} tone="bg-emerald-50 text-emerald-600" />
        <Kpi icon={Activity} label="Average match score" value={`${Math.round(a.match.avg || 0)}%`} hint={`${n(a.match.scored)} scored`} tone="bg-amber-50 text-amber-600" />
        <Kpi icon={MapPin} label="Average distance" value={`${Math.round(a.avgDistance || 0)} km`} tone="bg-sky-50 text-sky-600" />
        <Kpi icon={FileText} label="Interviews booked" value={n(a.interviewsBooked)} tone="bg-teal-50 text-teal-600" />
      </div>
      <Grid>
        <Card title="Applications and offers by month"><MultiTrend kind="bar" series={[{ name: "Applications", data: a.monthly }, { name: "Offers", data: a.offersMonthly }]} /></Card>
        <Card title="Hiring funnel"><FunnelBlock data={a.funnel} /></Card>
      </Grid>
      <Grid cols="lg:grid-cols-3">
        <Card title="Status"><Donut data={a.byStatus} /></Card>
        <Card title="Match score spread"><VBar data={a.matchBuckets} /></Card>
        <Card title="Preferred contact"><Donut data={a.byMedium} /></Card>
      </Grid>
      <Grid>
        <Card title="Applications by job state"><HBar data={a.byJobState} color={COLORS[0]} /></Card>
        <Card title="Applications by industry"><HBar data={a.byJobIndustry} color={COLORS[1]} /></Card>
      </Grid>
      <Grid>
        <Card title="Employed by industry" subtitle="Applications that reached the offer stage"><HBar data={a.employedByIndustry} color={COLORS[4]} /></Card>
        <Card title="Applications by work type"><Donut data={a.byJobWorkType} /></Card>
      </Grid>
      <Grid cols="lg:grid-cols-3">
        <Card title="By job plan"><Donut data={a.byJobPlan} /></Card>
        <Card title="Availability to start"><Donut data={a.byAvailability} /></Card>
        <Card title="Students"><Donut data={a.byStudents} /></Card>
      </Grid>
      <Grid>
        <Card title="Positions applied for"><HBar data={a.byPosition} max={15} color={COLORS[5]} /></Card>
        <Card title="Reasons for rejection"><HBar data={a.rejectionReasons} max={10} color={COLORS[6]} /></Card>
      </Grid>
      <Card title="Jobs with the most applications">
        <Table rows={a.topJobs} cols={[{ label: "Job", key: "name" }, { label: "State", key: "state" }, { label: "Applications", right: true, render: (r) => n(r.value) }]} />
      </Card>
    </div>
  );
}

function PeopleTab({ d }) {
  const s = d.seekers, u = d.users;
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Kpi icon={UserCheck} label="Job seekers" value={n(s.total)} tone="bg-emerald-50 text-emerald-600" />
        <Kpi icon={FileText} label="Have applied" value={n(s.withApplications)} hint={pct(s.withApplications, s.total)} tone="bg-violet-50 text-violet-600" />
        <Kpi icon={HandCoins} label="Requested benefits" value={n(s.withBenefits)} tone="bg-teal-50 text-teal-600" />
        <Kpi icon={FileText} label="Uploaded a CV file" value={n(s.withCvFiles)} tone="bg-sky-50 text-sky-600" />
      </div>
      <Grid>
        <Card title="Sign-ups by month"><MultiTrend series={[{ name: "Job seekers", data: u.seekerSignupsMonthly }, { name: "Employers", data: u.employerSignupsMonthly }]} /></Card>
        <Card title="Verification and availability"><FlagBars data={s.flags} /></Card>
      </Grid>
      <Grid cols="lg:grid-cols-3">
        <Card title="Gender"><Donut data={s.byGender} /></Card>
        <Card title="Marital status"><Donut data={s.byMaritalStatus} /></Card>
        <Card title="Education level"><Donut data={s.byEducation} /></Card>
      </Grid>
      <Grid cols="lg:grid-cols-3">
        <Card title="What seekers are (job changer, professional...)"><Donut data={s.byJobDecision} /></Card>
        <Card title="Job mode"><Donut data={s.byJobMode} /></Card>
        <Card title="Working mode"><Donut data={s.byWorkingMode} /></Card>
      </Grid>
      <Grid>
        <Card title="Roles seekers want"><HBar data={s.byJobChoice} max={25} color={COLORS[0]} /></Card>
        <Card title="Jobs they are interested in"><HBar data={s.byInterestedJob} max={15} color={COLORS[1]} /></Card>
      </Grid>
      <Grid>
        <Card title="Top CV skills"><HBar data={s.topSkills} max={20} color={COLORS[2]} /></Card>
        <Card title="Languages spoken"><HBar data={s.topLanguages} max={12} color={COLORS[3]} /></Card>
      </Grid>
      <Grid cols="lg:grid-cols-3">
        <Card title="Hand skills"><HBar data={s.byHandworkSkill} max={12} color={COLORS[4]} /></Card>
        <Card title="Willing to work outside their area"><Donut data={s.byWorkOutside} /></Card>
        <Card title="CV template"><Donut data={s.byCvTemplate} /></Card>
      </Grid>
      <Grid>
        <Card title="Have children"><Donut data={s.byAnyChild} /></Card>
        <Card title="Live alone"><Donut data={s.byLiveAlone} /></Card>
      </Grid>
      <Card title="Seekers by state"><HBar data={s.byState} max={20} color={COLORS[5]} /></Card>
    </div>
  );
}

function EmployersTab({ d }) {
  const e = d.employers;
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Kpi icon={Building2} label="Employers" value={n(e.total)} tone="bg-blue-50 text-blue-600" />
        <Kpi icon={Users} label="Total followers" value={n(e.followers)} tone="bg-rose-50 text-rose-600" />
        <Kpi icon={BadgeCheck} label="Business verified" value={n((e.flags.find((f) => f.name === "Business verified") || {}).value)} tone="bg-emerald-50 text-emerald-600" />
        <Kpi icon={BadgeCheck} label="Identity approved" value={n((e.flags.find((f) => f.name === "Identity approved") || {}).value)} tone="bg-violet-50 text-violet-600" />
      </div>
      <Card title="New employers each month"><Trend data={e.monthly} color={COLORS[1]} name="Employers" /></Card>
      <Grid cols="lg:grid-cols-3">
        <Card title="Company size"><Donut data={e.bySize} /></Card>
        <Card title="Employer type"><Donut data={e.byType} /></Card>
        <Card title="Year established"><VBar data={(e.byEstablished || []).slice(-12)} /></Card>
      </Grid>
      <Grid>
        <Card title="Verification progress"><FlagBars data={e.flags} /></Card>
        <Card title="Employers by state"><HBar data={e.byState} max={20} color={COLORS[1]} /></Card>
      </Grid>
      <Card title="Most active employers">
        <Table rows={e.topByJobs} cols={[
          { label: "Company", key: "name" }, { label: "Jobs", right: true, render: (r) => n(r.jobs) },
          { label: "Views", right: true, render: (r) => n(r.views) }, { label: "Applicants", right: true, render: (r) => n(r.applicants) },
        ]} />
      </Card>
    </div>
  );
}

function BenefitsTab({ d }) {
  const b = d.benefits;
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4 xl:grid-cols-6">
        <Kpi icon={HandCoins} label="Requests" value={n(b.total)} hint={`${n(b.distinctBeneficiaries)} people`} tone="bg-teal-50 text-teal-600" />
        <Kpi icon={Banknote} label="Requested" value={naira(b.requestedAmount)} tone="bg-amber-50 text-amber-600" />
        <Kpi icon={BadgeCheck} label="Approved" value={naira(b.approvedAmount)} tone="bg-emerald-50 text-emerald-600" />
        <Kpi icon={Banknote} label="Paid out" value={naira(b.paidAmount)} tone="bg-blue-50 text-blue-600" />
        <Kpi icon={Activity} label="Average request" value={naira(b.avgRequest)} tone="bg-violet-50 text-violet-600" />
        <Kpi icon={Activity} label="Avg review time" value={`${b.avgReviewHours}h`} tone="bg-rose-50 text-rose-600" />
      </div>
      <Grid>
        <Card title="Requests by month"><Trend data={b.requestsMonthly} color={COLORS[2]} name="Requests" /></Card>
        <Card title="Amount paid by month (₦)"><Trend data={b.paidMonthly} color={COLORS[1]} name="Paid" /></Card>
      </Grid>
      <Grid cols="lg:grid-cols-3">
        <Card title="Status"><Donut data={b.byStatus} /></Card>
        <Card title="Category"><Donut data={b.byCategory} /></Card>
        <Card title="Requests with documents"><FlagBars data={[{ name: "Has supporting documents", value: b.withDocuments, total: b.total }]} /></Card>
      </Grid>
      <Grid>
        <Card title="Total requested by category (₦)"><HBar data={b.byCategory.map((c) => ({ name: c.name, value: c.amount }))} fmt={naira} color={COLORS[3]} /></Card>
        <Card title="Average request by category (₦)"><HBar data={b.byCategory.map((c) => ({ name: c.name, value: c.avg }))} fmt={naira} color={COLORS[4]} /></Card>
      </Grid>
      <Card title="Amounts by status (₦)">
        <Table rows={b.byStatus} cols={[
          { label: "Status", render: (r) => cap(r.name) }, { label: "Requests", right: true, render: (r) => n(r.value) },
          { label: "Requested", right: true, render: (r) => naira(r.amount) }, { label: "Approved", right: true, render: (r) => naira(r.approved) },
        ]} />
      </Card>
    </div>
  );
}

/* ---------- page ---------- */
const TABS = [
  ["overview", "Overview", Activity], ["jobs", "Jobs", Briefcase], ["locations", "Locations", MapPin],
  ["changers", "Job changers", Repeat], ["applications", "Applications", FileText],
  ["people", "Job seekers", UserCheck], ["employers", "Employers", Building2], ["benefits", "Benefits", HandCoins],
];

export default function StatisticsPage() {
  const [data, setData] = useState(null);
  const [tab, setTab] = useState("overview");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await analyticsApi.full();
      setData(res.data.data);
    } catch (err) {
      toast.error(getError(err));
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <div role="status" className="flex min-h-[60vh] items-center justify-center gap-2 text-slate-500">
        <Loader2 className="h-5 w-5 animate-spin" /> Crunching the numbers…
      </div>
    );
  }
  if (!data) return <p className="p-10 text-center text-slate-500">Statistics couldn't be loaded. Please try again later.</p>;

  const View = { overview: Overview, jobs: JobsTab, locations: LocationsTab, changers: ChangersTab,
    applications: ApplicationsTab, people: PeopleTab, employers: EmployersTab, benefits: BenefitsTab }[tab];

  return (
    <div className="min-h-screen bg-slate-100 pb-16">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">Employment statistics</h1>
          <p className="text-sm text-slate-500">
            Live numbers on jobs, hiring and job seekers across Nigeria. Updated {new Date(data.generatedAt).toLocaleString("en-GB")}.
          </p>
        </div>
        <nav aria-label="Statistics sections" className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-4 sm:px-6">
          {TABS.map(([key, label, Icon]) => (
            <button key={key} type="button" onClick={() => setTab(key)} aria-current={tab === key ? "page" : undefined}
              className={`inline-flex shrink-0 items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition ${tab === key ? "border-orange-600 text-orange-700" : "border-transparent text-slate-500 hover:text-slate-800"}`}>
              <Icon className="h-4 w-4" aria-hidden="true" /> {label}
            </button>
          ))}
        </nav>
      </header>
      <main className="mx-auto mt-6 max-w-7xl px-4 sm:px-6"><View d={data} /></main>
    </div>
  );
}