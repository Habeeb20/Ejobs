import { useCallback, useEffect, useState } from "react";
import {
  Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { adminApi } from "../../adminApi";


export const PALETTE = ["#c2410c", "#0f766e", "#1d4ed8", "#a16207", "#7c3aed", "#be185d", "#4d7c0f", "#475569", "#0369a1", "#9f1239"];

export const fmt = (n) => new Intl.NumberFormat("en-NG", { maximumFractionDigits: 1 }).format(Number(n) || 0);
export const money = (n) => `₦${fmt(n)}`;
export const pct = (part, whole) => (whole ? `${Math.round((part / whole) * 1000) / 10}%` : "0%");

const iso = (d) => d.toISOString().slice(0, 10);

/* ---------- data hook ---------- */

export function useStats(path) {
  const [filters, setFilters] = useState({ from: "", to: "", interval: "month" });
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setData(await adminApi.get(path, filters));
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [path, filters]);

  useEffect(() => {
    load();
  }, [load]);

  return { data, loading, error, filters, setFilters, reload: load };
}

/* ---------- page chrome ---------- */

function RangeBar({ filters, setFilters, onRefresh, loading }) {
  const set = (patch) => setFilters((f) => ({ ...f, ...patch }));
  const lastDays = (n) => set({ from: iso(new Date(Date.now() - n * 864e5)), to: iso(new Date()) });
  const thisYear = () => set({ from: `${new Date().getFullYear()}-01-01`, to: iso(new Date()) });

  const input = "rounded border border-stone-300 bg-white px-2 py-1.5 text-sm text-stone-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-700";
  const chip = "rounded border border-stone-300 px-2.5 py-1.5 text-sm text-stone-700 hover:bg-stone-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-700";

  return (
    <div className="flex flex-wrap items-end gap-3">
      <label className="text-sm text-stone-600">
        From
        <input type="date" className={`${input} ml-2`} value={filters.from} onChange={(e) => set({ from: e.target.value })} />
      </label>
      <label className="text-sm text-stone-600">
        To
        <input type="date" className={`${input} ml-2`} value={filters.to} onChange={(e) => set({ to: e.target.value })} />
      </label>
      <label className="text-sm text-stone-600">
        Group trends by
        <select className={`${input} ml-2`} value={filters.interval} onChange={(e) => set({ interval: e.target.value })}>
          <option value="day">Day</option>
          <option value="week">Week</option>
          <option value="month">Month</option>
        </select>
      </label>
      <div className="flex gap-2">
        <button className={chip} onClick={() => lastDays(30)}>Last 30 days</button>
        <button className={chip} onClick={() => lastDays(90)}>Last 90 days</button>
        <button className={chip} onClick={thisYear}>This year</button>
        <button className={chip} onClick={() => set({ from: "", to: "" })}>All time</button>
      </div>
      <button
        onClick={onRefresh}
        disabled={loading}
        className="ml-auto rounded bg-orange-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-orange-800 disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-700 focus-visible:ring-offset-2"
      >
        {loading ? "Loading…" : "Refresh"}
      </button>
    </div>
  );
}

export function Page({ title, subtitle, stats, children }) {
  const { data, loading, error, filters, setFilters, reload } = stats;
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 text-stone-800">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold text-stone-900">{title}</h1>
        <p className="mt-1 max-w-2xl text-sm text-stone-600">{subtitle}</p>
      </header>
      <RangeBar filters={filters} setFilters={setFilters} onRefresh={reload} loading={loading} />
      {error && (
        <p role="alert" className="mt-6 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}. Check that you're logged in as a superadmin, then refresh.
        </p>
      )}
      {!data && loading && <p className="mt-10 text-sm text-stone-500">Crunching the numbers…</p>}
      {data && <div className={loading ? "opacity-60 transition-opacity" : ""}>{children(data)}</div>}
    </div>
  );
}

export function StatStrip({ items }) {
  return (
    <dl className="mt-8 grid grid-cols-[repeat(auto-fit,minmax(10rem,1fr))] gap-y-6 border-y border-stone-200 py-5">
      {items.map((it) => (
        <div key={it.label} className="border-l border-stone-200 pl-4">
          <dt className="text-sm text-stone-500">{it.label}</dt>
          <dd className="mt-1 text-2xl font-semibold tabular-nums text-stone-900">{it.value}</dd>
          {it.hint && <p className="mt-0.5 text-xs text-stone-500">{it.hint}</p>}
        </div>
      ))}
    </dl>
  );
}

export function Section({ title, children }) {
  return (
    <section className="mt-10">
      <h2 className="mb-3 text-lg font-semibold text-stone-900">{title}</h2>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{children}</div>
    </section>
  );
}

export function Panel({ title, note, wide, full, children }) {
  const span = full ? "md:col-span-2 xl:col-span-3" : wide ? "md:col-span-2" : "";
  return (
    <div className={`min-w-0 rounded border border-stone-200 bg-white p-4 ${span}`}>
      <h3 className="text-sm font-semibold text-stone-900">{title}</h3>
      {note && <p className="mt-0.5 text-xs text-stone-500">{note}</p>}
      <div className="mt-3">{children}</div>
    </div>
  );
}

const Empty = () => <p className="py-6 text-center text-sm text-stone-500">No data for this range.</p>;

/* ---------- charts ---------- */

export function Donut({ data = [], colors = {} }) {
  const rows = data.filter((d) => d.value > 0);
  const total = rows.reduce((s, d) => s + d.value, 0);
  if (!total) return <Empty />;
  const color = (d, i) => colors[d.name] || PALETTE[i % PALETTE.length];

  return (
    <div className="flex items-center gap-4">
      <div className="h-36 w-36 shrink-0">
        <ResponsiveContainer>
          <PieChart>
            <Pie data={rows} dataKey="value" nameKey="name" innerRadius="60%" outerRadius="100%" paddingAngle={1} stroke="none">
              {rows.map((d, i) => <Cell key={d.name} fill={color(d, i)} />)}
            </Pie>
            <Tooltip formatter={(v, n) => [fmt(v), n]} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <ul className="min-w-0 flex-1 space-y-1 text-sm">
        {rows.map((d, i) => (
          <li key={d.name} className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: color(d, i) }} />
            <span className="truncate text-stone-700">{d.name}</span>
            <span className="ml-auto tabular-nums text-stone-900">{fmt(d.value)}</span>
            <span className="w-12 text-right text-xs tabular-nums text-stone-500">{pct(d.value, total)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// Horizontal ranked bars. Pass `total` to show each row as a share of a known whole.
export function RankBars({ data = [], total, color = PALETTE[0], limit = 10, format = fmt }) {
  const rows = data.slice(0, limit);
  if (!rows.length) return <Empty />;
  const base = total || data.reduce((s, r) => s + r.value, 0);
  const scale = total || Math.max(...rows.map((r) => r.value), 1);

  return (
    <ul className="space-y-2">
      {rows.map((r) => (
        <li key={r.name} className="text-sm">
          <div className="flex items-baseline justify-between gap-3">
            <span className="truncate text-stone-700">{r.name}</span>
            <span className="shrink-0 tabular-nums text-stone-900">
              {format(r.value)}
              {base ? <span className="ml-2 text-xs text-stone-500">{pct(r.value, base)}</span> : null}
            </span>
          </div>
          <div className="mt-1 h-1.5 rounded-sm bg-stone-100">
            <div className="h-full rounded-sm" style={{ width: `${Math.min((r.value / scale) * 100, 100)}%`, background: color }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

const axis = { fontSize: 12, fill: "#78716c" };

export function Columns({ data = [], color = PALETTE[1], height = 220, format = fmt }) {
  if (!data.length) return <Empty />;
  return (
    <div style={{ height }}>
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 4, right: 4, left: -12, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="#e7e5e4" />
          <XAxis dataKey="name" tick={axis} tickLine={false} axisLine={false} interval={0} />
          <YAxis tick={axis} tickLine={false} axisLine={false} allowDecimals={false} width={48} />
          <Tooltip formatter={(v) => format(v)} cursor={{ fill: "#f5f5f4" }} />
          <Bar dataKey="value" fill={color} radius={[2, 2, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// Time series (or any category pivot). Stacks when there is more than one key.
export function Trend({ data = [], keys, colors = {}, xKey = "period", height = 260, format = fmt }) {
  if (!data.length) return <Empty />;
  const all = keys || [...new Set(data.flatMap((d) => Object.keys(d)))].filter((k) => k !== xKey);
  const multi = all.length > 1;

  return (
    <div style={{ height }}>
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 4, right: 4, left: -12, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="#e7e5e4" />
          <XAxis dataKey={xKey} tick={axis} tickLine={false} axisLine={false} />
          <YAxis tick={axis} tickLine={false} axisLine={false} allowDecimals={false} width={52} />
          <Tooltip formatter={(v, n) => [format(v), n === "total" ? "Total" : n]} cursor={{ fill: "#f5f5f4" }} />
          {multi && <Legend iconType="square" wrapperStyle={{ fontSize: 12 }} />}
          {all.map((k, i) => (
            <Bar key={k} dataKey={k} stackId="a" fill={colors[k] || PALETTE[i % PALETTE.length]} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function DataTable({ columns, rows = [] }) {
  if (!rows.length) return <Empty />;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-stone-200 text-stone-500">
            {columns.map((c) => (
              <th key={c.key} scope="col" className={`py-2 pr-3 font-medium ${c.num ? "text-right" : ""}`}>{c.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.id || r._id || i} className="border-b border-stone-100 last:border-0">
              {columns.map((c) => (
                <td key={c.key} className={`py-2 pr-3 ${c.num ? "text-right tabular-nums" : "max-w-[16rem] truncate"}`}>
                  {c.render ? c.render(r) : r[c.key] ?? "—"}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export const personCell = (r) => (
  <span title={r.email}>{r.name?.trim() || r.email || "—"}</span>
);