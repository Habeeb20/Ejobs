import { useSearchParams } from "react-router-dom";
import { Users, UserPlus, Wallet, CalendarDays, Cake, Award, FileWarning, Clock, TrendingDown, Hourglass, ClipboardList } from "lucide-react";
import { ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, AreaChart, Area, Legend } from "recharts";
import { hrApi } from "../../api";
import { Btn, Card, Kpi, Avatar, Spinner, ErrorBox, Empty, useAsync, useHrEvents, money, fmtDate } from "./HrUi";

const COLORS = ["#E4510B", "#0ea5e9", "#10b981", "#f59e0b", "#8b5cf6", "#ef4444", "#14b8a6", "#64748b"];
const Box = ({ title, data, children, h = 230 }) => (<Card title={title}>{data && !data.length ? <p className="grid place-items-center text-sm text-slate-400" style={{ height: h }}>No data yet</p> : <div style={{ height: h }}><ResponsiveContainer width="100%" height="100%">{children}</ResponsiveContainer></div>}</Card>);
const donut = (data) => (<PieChart><Pie data={data} dataKey="count" nameKey="name" innerRadius="55%" outerRadius="85%" paddingAngle={2}>{data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}</Pie><Tooltip /><Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} /></PieChart>);
const bars = (data, color = "#E4510B") => (<BarChart data={data} margin={{ left: -20, right: 8 }}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" /><XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} /><YAxis allowDecimals={false} tick={{ fontSize: 11 }} /><Tooltip /><Bar dataKey="count" fill={color} radius={[6, 6, 0, 0]} /></BarChart>);

const Upcoming = ({ title, icon: Icon, items, render, empty }) => (
    <Card title={title}>{!items.length ? <p className="py-4 text-center text-sm text-slate-400">{empty}</p> : <ul className="divide-y divide-slate-50">{items.map((x, i) => (<li key={i} className="flex items-center gap-3 py-2">{render(x)}</li>))}</ul>}</Card>
);
const when = (n) => (n === 0 ? "Today" : n === 1 ? "Tomorrow" : `in ${n} days`);

export default function HrOverview({ go }) {
    const [, setSp] = useSearchParams();
    const { data: d, loading, error, reload } = useAsync(() => hrApi.overview(), []);
    useHrEvents(["employment", "leave", "attendance", "payroll", "task"], reload);
    const open = (id) => setSp({ tab: "hrEmployees", id });
    if (loading) return <Spinner label="Loading your HR dashboard…" />;
    if (error) return <ErrorBox error={error} onRetry={reload} />;
    const k = d.kpis, a = d.attendanceToday;
    if (!k.headcount && !k.former) return (
        <Empty icon={Users} title="Set up your team" text="Add your first employee, or turn a candidate you made an offer to into staff. They get an email and their own staff dashboard right away.">
            <div className="flex flex-wrap justify-center gap-2"><Btn onClick={() => go("hrEmployees")}><UserPlus size={16} /> Add staff</Btn><Btn variant="outline" onClick={() => go("hrSettings")}>HR settings</Btn></div>
        </Empty>
    );
    const pay = d.payrollThisMonth;

    return (
        <div className="space-y-5">
            <div className="flex flex-wrap gap-2"><Btn onClick={() => go("hrEmployees")}><UserPlus size={16} /> Add or hire staff</Btn><Btn variant="outline" onClick={() => go("hrPayroll")}><Wallet size={16} /> Run payroll</Btn><Btn variant="outline" onClick={() => go("hrComms")}>Send announcement</Btn></div>

            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
                <Kpi label="Headcount" value={k.headcount} hint={`${k.active} active · ${k.onLeaveStatus} on leave`} onClick={() => go("hrEmployees")} />
                <Kpi label="New hires (30 days)" value={k.newHires30} tone="green" />
                <Kpi label="Left (12 months)" value={k.exits12} hint={`${k.turnover}% turnover`} tone={k.turnover > 20 ? "red" : "slate"} />
                <Kpi label="Average tenure" value={`${k.avgTenure} yrs`} />
                <Kpi label="Pending leave" value={k.pendingLeaves} hint="Tap to review" tone={k.pendingLeaves ? "red" : "slate"} onClick={() => go("hrLeave")} />
                <Kpi label="Monthly payroll (est.)" value={money(k.monthlyPayrollEstimate)} onClick={() => go("hrPayroll")} />
                <Kpi label="This month's payslips" value={Object.values(pay).reduce((s, x) => s + x.count, 0)} hint={Object.entries(pay).map(([s, x]) => `${x.count} ${s.toLowerCase()}`).join(" · ") || "None yet"} onClick={() => go("hrPayroll")} />
                <Kpi label="Suspended" value={k.suspended} /><Kpi label="Former staff" value={k.former} /><Kpi label="Your open tasks" value={k.openTasks} hint="Onboarding and offboarding" />
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
                <Card title="Attendance today">
                    {a.expected === 0 && a.present === 0 ? <p className="py-6 text-center text-sm text-slate-400">Not a working day.</p> : (
                        <><div className="grid grid-cols-2 gap-2 text-center">{[["Present", a.present, "text-emerald-600"], ["Late", a.late, "text-amber-600"], ["On leave", a.onLeave, "text-sky-600"], ["Half day", a.halfDay, "text-orange-600"]].map(([l, v, c]) => <div key={l} className="rounded-xl bg-slate-50 py-3"><p className={`text-2xl font-extrabold ${c}`}>{v}</p><p className="text-xs text-slate-500">{l}</p></div>)}</div>
                            <p className="mt-3 text-center text-xs text-slate-400">{a.expected} expected today · <button className="font-semibold text-orange-700" onClick={() => go("hrAttendance")}>Open board</button></p></>
                    )}
                </Card>
                <Card title="Needs your decision" action={<Btn variant="ghost" onClick={() => go("hrLeave")}>All</Btn>}>
                    {!d.pendingLeaveList.length ? <p className="py-6 text-center text-sm text-slate-400">No leave waiting.</p> : <ul className="divide-y divide-slate-50">{d.pendingLeaveList.map((l) => (<li key={l._id} className="flex items-center gap-3 py-2"><Avatar name={l.name} src={l.photo} size={34} /><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{l.name}</p><p className="truncate text-xs text-slate-400">{l.typeName} · {l.days}d · {fmtDate(l.startDate)}</p></div></li>))}</ul>}
                </Card>
                <Box title="Payroll trend (gross and net)" data={d.payrollTrend.filter((x) => x.gross)}>
                    <AreaChart data={d.payrollTrend} margin={{ left: -10, right: 8 }}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" /><XAxis dataKey="label" tick={{ fontSize: 11 }} /><YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => (v >= 1e6 ? `${v / 1e6}m` : v >= 1e3 ? `${v / 1e3}k` : v)} /><Tooltip formatter={(v) => money(v)} /><Area type="monotone" dataKey="gross" stroke="#E4510B" fill="#E4510B22" /><Area type="monotone" dataKey="net" stroke="#10b981" fill="#10b98122" /></AreaChart>
                </Box>
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
                <Box title="Hires and exits (12 months)" data={d.hiresVsExits.some((x) => x.hires || x.exits) ? d.hiresVsExits : []} h={250}>
                    <BarChart data={d.hiresVsExits} margin={{ left: -20, right: 8 }}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" /><XAxis dataKey="label" tick={{ fontSize: 10 }} interval={0} /><YAxis allowDecimals={false} tick={{ fontSize: 11 }} /><Tooltip /><Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} /><Bar dataKey="hires" fill="#10b981" radius={[4, 4, 0, 0]} /><Bar dataKey="exits" fill="#ef4444" radius={[4, 4, 0, 0]} /></BarChart>
                </Box>
                <Box title="By department" data={d.byDepartment} h={250}>{donut(d.byDepartment)}</Box>
                <Box title="Employment type" data={d.byType} h={250}>{bars(d.byType, "#0ea5e9")}</Box>
                <Box title="Gender" data={d.byGender}>{donut(d.byGender)}</Box>
                <Box title="Length of service" data={d.tenure}>{bars(d.tenure, "#8b5cf6")}</Box>
                <Box title="Age groups" data={d.ageGroups}>{bars(d.ageGroups, "#14b8a6")}</Box>
                <Box title="Leave taken this year (days)" data={d.leaveByType.map((l) => ({ name: l.name, count: l.days }))}>{bars(d.leaveByType.map((l) => ({ name: l.name, count: l.days })), "#f59e0b")}</Box>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                <Upcoming title="Birthdays (30 days)" items={d.birthdays} empty="No birthdays soon" render={(x) => (<><Avatar name={x.name} src={x.photo} size={34} /><span className="flex-1 text-sm font-semibold">{x.name}</span><span className="flex items-center gap-1 text-xs text-slate-500"><Cake size={13} /> {when(x.in)}</span></>)} />
                <Upcoming title="Work anniversaries" items={d.anniversaries} empty="None soon" render={(x) => (<><Avatar name={x.name} src={x.photo} size={34} /><span className="flex-1 text-sm font-semibold">{x.name}</span><span className="flex items-center gap-1 text-xs text-slate-500"><Award size={13} /> {x.years} yr{x.years === 1 ? "" : "s"}, {when(x.in)}</span></>)} />
                <Upcoming title="Probation ending (30 days)" items={d.probationEnding} empty="Nobody on probation" render={(x) => (<button className="flex w-full items-center gap-3 text-left" onClick={() => open(x.id)}><Hourglass size={16} className="text-amber-500" /><span className="flex-1 text-sm font-semibold">{x.name}</span><span className="text-xs text-slate-500">{fmtDate(x.date)}</span></button>)} />
                <Upcoming title="Contracts ending (60 days)" items={d.contractsEnding} empty="No contracts ending" render={(x) => (<button className="flex w-full items-center gap-3 text-left" onClick={() => open(x.id)}><ClipboardList size={16} className="text-orange-500" /><span className="flex-1 text-sm font-semibold">{x.name}</span><span className="text-xs text-slate-500">{fmtDate(x.date)}</span></button>)} />
                <Upcoming title={`Documents expiring${d.documentsExpired ? ` (${d.documentsExpired} already expired)` : ""}`} items={d.documentsExpiring} empty="Nothing expiring" render={(x) => (<><FileWarning size={16} className="text-red-500" /><div className="flex-1"><p className="text-sm font-semibold">{x.item}</p><p className="text-xs text-slate-400">{x.name}</p></div><span className="text-xs text-slate-500">{when(x.in)}</span></>)} />
            </div>
        </div>
    );
}