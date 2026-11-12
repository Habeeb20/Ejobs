import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Clock, LogIn, LogOut, ChevronLeft, ChevronRight, Plus, Trash2, ExternalLink, FileText, CheckCircle2, Circle, Star, Briefcase, Megaphone } from "lucide-react";
import { toast } from "sonner";

import { hrApi } from "../../api";
import MediaUpload from "../../utils/MediaUpload";
import {
  Btn, Card, Avatar, Badge, StatusBadge, Tabs, Modal, Spinner, Empty, ErrorBox, Field, DocUpload, inputCls, useAsync, useHrEvents,
  money, fmtDate, fmtTime, fmtDateTime, monthLabel, thisMonth, tenure, ago, toastErr, today, iso, fullName,
} from "./hrUi";
import Chat from "./Chat";
import PayslipView from "./PayslipView";

const SECTIONS = [["overview", "Overview"], ["attendance", "Attendance"], ["leave", "Leave"], ["payslips", "Payslips"], ["performance", "Performance"], ["tasks", "Tasks & documents"], ["messages", "Messages"], ["announcements", "News"], ["notices", "Notices"], ["profile", "My profile"]];
const EVENTS = { overview: null, attendance: ["attendance", "leave"], leave: ["leave"], payslips: ["payroll"], performance: ["review", "goal"], tasks: ["task", "document"], announcements: ["announcement"], notices: ["case"], profile: ["employment", "profile"] };

export default function MyEmployment() {
  const [sp, setSp] = useSearchParams();
  const emps = useAsync(() => hrApi.me.employments(), []);
  const list = emps.data?.employments || [];
  const eid = list.find((e) => e._id === sp.get("eid"))?._id || list[0]?._id;
  const section = SECTIONS.some(([k]) => k === sp.get("section")) ? sp.get("section") : "overview";

const ov = useAsync(() => (eid ? hrApi.me.overview(eid) : Promise.resolve({ data: null })), [eid]);

  console.log(ov)
  useHrEvents(null, () => ov.reload()); // any live HR event refreshes the header and tab badges
  useHrEvents(["employment"], () => emps.reload());

  const go = (s) => setSp({ tab: "myEmployment", eid, section: s });
  if (emps.loading) return <Spinner label="Loading your employment…" />;
  if (emps.error) return <ErrorBox error={emps.error} onRetry={emps.reload} />;
  if (!list.length) return (
    <Empty icon={Briefcase} title="No employment records yet" text="When an employer adds you to their staff (or hires you from an application), your staff dashboard appears here. It links to your account through your email address, so make sure it matches the one your employer has.">
      <p className="text-xs text-slate-400">Your account email: {emps.data?.email || ""}</p>
    </Empty>
  );

  const d = ov.data, e = d?.employee;
  console.log(d)
  const badge = { messages: d?.unreadMessages, tasks: d?.openTasks, notices: d?.casesAwaitingResponse, announcements: (d?.announcements || []).filter((a) => !a.read).length, leave: d?.pendingLeaves };
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-4 rounded-2xl bg-gradient-to-r from-orange-700 to-orange-600 p-4 text-white shadow-sm sm:p-5">
        <Avatar name={d?.company?.companyName || "?"} src={d?.company?.avatar} size={52} />
        <div className="min-w-0 flex-1">
          <p className="text-sm text-orange-100">You work at</p>
          <h2 className="truncate text-xl font-extrabold">{d?.company?.companyName || list.find((x) => x._id === eid)?.company}</h2>
          {e && <p className="text-sm text-orange-100">{e.jobTitle}{e.department ? ` · ${e.department}` : ""} · {e.staffId} · {tenure(e.hireDate, e.exitDate || new Date())}</p>}
        </div>
        {e && <StatusBadge status={e.status} />}
        {list.length > 1 && <select aria-label="Employer" value={eid} onChange={(x) => setSp({ tab: "myEmployment", eid: x.target.value })} className="rounded-xl border-0 bg-white/95 px-3 py-2 text-sm text-slate-900">{list.map((x) => <option key={x._id} value={x._id}>{x.company}</option>)}</select>}
      </div>

      <Tabs value={section} onChange={go} tabs={SECTIONS.map(([k, l]) => [k, l, badge[k] || 0])} />
        {ov.error ? <ErrorBox error={ov.error} onRetry={ov.reload} /> : !d ? <Spinner /> : (
  <Section key={`${eid}:${section}`} section={section} eid={eid} d={d} reloadOverview={ov.reload} go={go} />
)}
{/* 
      {ov.loading && !d ? <Spinner /> : ov.error ? <ErrorBox error={ov.error} onRetry={ov.reload} /> : (
        <Section key={`${eid}:${section}`} section={section} eid={eid} d={d} reloadOverview={ov.reload} go={go} />
      )} */}
    </div>
  );
}

function Section({ section, eid, d, reloadOverview, go }) {
  const p = { eid, d, reloadOverview, go };
  return { overview: <Overview {...p} />, attendance: <AttendanceTab {...p} />, leave: <LeaveTab {...p} />, payslips: <PayslipsTab {...p} />, performance: <PerformanceTab {...p} />,
    tasks: <TasksTab {...p} />, messages: <Chat me="employee" load={() => hrApi.me.messages(eid)} send={(b) => hrApi.me.sendMessage(eid, b)} empty="Message HR here. They see it instantly." />,
    announcements: <NewsTab {...p} />, notices: <NoticesTab {...p} />, profile: <ProfileTab {...p} /> }[section];
}

const ClockCard = ({ eid, d, reload }) => {
  const [busy, setBusy] = useState(false);
  const t = d.today;
  const act = async (fn, msg) => { setBusy(true); try { await fn(eid); toast.success(msg); reload(); } catch (e) { toastErr(e); } finally { setBusy(false); } };
  return (
    <Card title="Today">
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex-1"><p className="flex items-center gap-2 text-sm text-slate-600"><Clock size={16} /> Work hours {d.schedule.start} to {d.schedule.end}</p>
          <p className="mt-1 text-lg font-bold">{!t?.clockIn ? "You haven't clocked in" : t.clockOut ? `Worked ${t.hours} hours` : `In since ${fmtTime(t.clockIn)}`}{t?.status === "Late" && <Badge tone="amber" className="ml-2">Late</Badge>}</p>
          {t?.clockOut && <p className="text-xs text-slate-400">{fmtTime(t.clockIn)} to {fmtTime(t.clockOut)}</p>}</div>
        {!t?.clockIn && d.employee.status === "Active" && <Btn loading={busy} onClick={() => act(hrApi.me.clockIn, "Clocked in")}><LogIn size={16} /> Clock in</Btn>}
        {t?.clockIn && !t.clockOut && <Btn variant="dark" loading={busy} onClick={() => act(hrApi.me.clockOut, "Clocked out")}><LogOut size={16} /> Clock out</Btn>}
      </div>
    </Card>
  );
};

function Overview({ eid, d, reloadOverview, go }) {
  console.log(d)
  const e = d?.employee;
  const alerts = [
    d.casesAwaitingResponse && ["notices", `${d.casesAwaitingResponse} notice${d.casesAwaitingResponse > 1 ? "s" : ""} need your response`, "red"],
    d.unreadMessages && ["messages", `${d.unreadMessages} unread message${d.unreadMessages > 1 ? "s" : ""} from HR`, "orange"],
    d.openTasks && ["tasks", `${d.openTasks} task${d.openTasks > 1 ? "s" : ""} for you to complete`, "amber"],
    d.pendingLeaves && ["leave", `${d.pendingLeaves} leave request${d.pendingLeaves > 1 ? "s" : ""} waiting for approval`, "blue"],
  ].filter(Boolean);
  return (
    <div className="space-y-4">
      {!!alerts.length && <div className="flex flex-wrap gap-2">{alerts.map(([s, text, tone]) => <button key={s} onClick={() => go(s)}><Badge tone={tone} className="px-3 py-1.5 text-sm">{text}</Badge></button>)}</div>}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <ClockCard eid={eid} d={d} reload={reloadOverview} />
          <Card title="Leave balances" action={<Btn variant="ghost" onClick={() => go("leave")}>Request leave</Btn>}>
            <div className="grid gap-3 sm:grid-cols-2">{d.balances.filter((b) => b.entitlement != null).map((b) => (<div key={b.key} className="rounded-xl bg-slate-50 p-3"><div className="flex justify-between text-sm"><span className="font-semibold">{b.name}</span><span className="text-slate-500">{b.remaining} left</span></div><div className="mt-2 h-1.5 rounded-full bg-slate-200"><div className="h-full rounded-full bg-orange-500" style={{ width: `${Math.min(100, ((b.used + b.pending) / b.entitlement) * 100)}%` }} /></div></div>))}</div>
          </Card>
          <Card title="Goals" action={<Btn variant="ghost" onClick={() => go("performance")}>All</Btn>}>
            {!d.goals.length ? <p className="py-4 text-center text-sm text-slate-400">No open goals.</p> : d.goals.map((g) => (<div key={g._id} className="border-b border-slate-50 py-2 last:border-0"><p className="text-sm font-semibold">{g.title}</p><div className="mt-1 h-1.5 rounded-full bg-slate-100"><div className="h-full rounded-full bg-orange-500" style={{ width: `${g.progress}%` }} /></div></div>))}
          </Card>
        </div>
        <div className="space-y-4">
          <Card title="Latest payslip" action={<Btn variant="ghost" onClick={() => go("payslips")}>All</Btn>}>
            {d.latestPayslip ? <><p className="text-sm text-slate-500">{monthLabel(d.latestPayslip.month)}</p><p className="text-2xl font-extrabold text-orange-700">{money(d.latestPayslip.net, d.latestPayslip.currency)}</p><StatusBadge status={d.latestPayslip.status} /></> : <p className="text-sm text-slate-400">No payslip yet.</p>}
          </Card>
          <Card title="Your manager">{d.manager ? <div className="flex items-center gap-3"><Avatar name={fullName(d.manager)} src={d.manager.photo} /><div><p className="font-semibold">{fullName(d.manager)}</p><p className="text-xs text-slate-400">{d.manager.jobTitle}</p></div></div> : <p className="text-sm text-slate-400">Not assigned.</p>}</Card>
          <Card title="Key dates"><p className="flex justify-between py-1 text-sm"><span className="text-slate-500">Started</span>{fmtDate(e.hireDate)}</p>
            {e.probationEndDate && <p className="flex justify-between py-1 text-sm"><span className="text-slate-500">Probation ends</span>{fmtDate(e.probationEndDate)}</p>}
            {e.contractEndDate && <p className="flex justify-between py-1 text-sm"><span className="text-slate-500">Contract ends</span>{fmtDate(e.contractEndDate)}</p>}
            {d.nextLeave && <p className="flex justify-between py-1 text-sm"><span className="text-slate-500">Next leave</span>{fmtDate(d.nextLeave.startDate)}</p>}</Card>
          <Card title="News" action={<Btn variant="ghost" onClick={() => go("announcements")}>All</Btn>}>
            {!d.announcements.length ? <p className="text-sm text-slate-400">Nothing new.</p> : d.announcements.slice(0, 3).map((a) => (<p key={a._id} className="flex items-center gap-2 border-b border-slate-50 py-1.5 text-sm last:border-0"><Megaphone size={14} className={a.read ? "text-slate-300" : "text-orange-600"} /><span className={`truncate ${a.read ? "text-slate-500" : "font-semibold"}`}>{a.title}</span></p>))}
          </Card>
        </div>
      </div>
    </div>
  );
}

const DAY_STYLE = { Present: "bg-emerald-100 text-emerald-800", Late: "bg-amber-100 text-amber-800", HalfDay: "bg-orange-100 text-orange-800", Absent: "bg-red-100 text-red-700", Leave: "bg-sky-100 text-sky-700", Holiday: "bg-violet-100 text-violet-700", Weekend: "bg-slate-50 text-slate-300", Upcoming: "bg-white text-slate-300", NotIn: "bg-white text-slate-500 ring-1 ring-orange-300", BeforeHire: "bg-white text-slate-200" };
function AttendanceTab({ eid, d, reloadOverview }) {
  const [month, setMonth] = useState(thisMonth());
  const { data, loading, reload } = useAsync(() => hrApi.me.attendance(eid, month), [month]);
  const shift = (n) => { const x = new Date(`${month}-15T12:00:00Z`); x.setUTCMonth(x.getUTCMonth() + n); const m = x.toISOString().slice(0, 7); if (m <= thisMonth()) setMonth(m); };
  const both = () => { reload(); reloadOverview(); };
  return (
    <div className="space-y-4">
      <ClockCard eid={eid} d={d} reload={both} />
      <Card title={monthLabel(month)} action={<div className="flex gap-1"><Btn variant="outline" onClick={() => shift(-1)} aria-label="Previous month"><ChevronLeft size={16} /></Btn><Btn variant="outline" onClick={() => shift(1)} disabled={month >= thisMonth()} aria-label="Next month"><ChevronRight size={16} /></Btn></div>}>
        {loading || !data ? <Spinner /> : (
          <>
            <div className="mb-4 flex flex-wrap gap-2 text-sm">{[["Present", data.summary.present, "green"], ["Late", data.summary.late, "amber"], ["Half days", data.summary.halfDay, "orange"], ["Absent", data.summary.absent, "red"], ["Leave", data.summary.leave, "blue"], ["Hours", data.summary.hours, "slate"]].map(([l, v, t]) => <Badge key={l} tone={t} className="px-3 py-1">{l} {v}</Badge>)}</div>
            <div className="grid grid-cols-7 gap-1.5 text-center">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((x) => <p key={x} className="text-xs font-semibold text-slate-400">{x}</p>)}
              {Array.from({ length: new Date(`${data.days[0].date}T00:00:00Z`).getUTCDay() }).map((_, i) => <span key={i} />)}
              {data.days.map((day) => <div key={day.date} title={`${day.status}${day.holiday ? `: ${day.holiday}` : ""}${day.clockIn ? `. ${fmtTime(day.clockIn)} to ${fmtTime(day.clockOut)}` : ""}`} className={`grid aspect-square place-items-center rounded-lg text-sm font-semibold ${DAY_STYLE[day.status] || ""}`}>{+day.date.slice(8)}</div>)}
            </div>
          </>
        )}
      </Card>
    </div>
  );
}

function LeaveTab({ eid, reloadOverview }) {
  const { data, loading, reload } = useAsync(() => hrApi.me.leave(eid), []);
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ type: "", startDate: today(), endDate: today(), reason: "" });
  const [busy, setBusy] = useState(false);
  const refresh = () => { reload(); reloadOverview(); };
  const submit = async (e) => {
    e.preventDefault(); setBusy(true);
    try { await hrApi.me.requestLeave(eid, { ...f, type: f.type || data.balances[0]?.key }); toast.success("Request sent. HR was notified instantly."); setOpen(false); refresh(); } catch (err) { toastErr(err); } finally { setBusy(false); }
  };
  const cancel = async (l) => { try { await hrApi.me.cancelLeave(eid, l._id); toast.success("Leave cancelled"); refresh(); } catch (err) { toastErr(err); } };
  if (loading || !data) return <Spinner />;
  const can = (l) => l.status === "Pending" || (l.status === "Approved" && l.startDate > today());
  return (
    <div className="space-y-4">
      <Card title={`Balances for ${data.year}`} action={<Btn onClick={() => setOpen(true)}><Plus size={16} /> Request leave</Btn>}>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{data.balances.map((b) => (<div key={b.key} className="rounded-xl bg-slate-50 p-3"><p className="text-sm font-semibold">{b.name}</p><p className="text-xs text-slate-500">{b.entitlement == null ? `${b.used} days taken (no limit)` : `${b.remaining} of ${b.entitlement} days left`}{b.pending ? ` · ${b.pending} pending` : ""}</p>{b.entitlement != null && <div className="mt-2 h-1.5 rounded-full bg-slate-200"><div className="h-full rounded-full bg-orange-500" style={{ width: `${Math.min(100, ((b.used + b.pending) / b.entitlement) * 100)}%` }} /></div>}</div>))}</div>
      </Card>
      <Card title="My requests">
        {!data.leaves.length ? <p className="py-6 text-center text-sm text-slate-400">No leave yet.</p> : <ul className="divide-y divide-slate-100">{data.leaves.map((l) => (
          <li key={l._id} className="flex flex-wrap items-center gap-3 py-3 text-sm"><div className="min-w-[10rem] flex-1"><p className="font-semibold">{l.typeName}</p><p className="text-xs text-slate-400">{fmtDate(l.startDate)} to {fmtDate(l.endDate)} · {l.days} working day{l.days === 1 ? "" : "s"}</p>{l.decisionNote && <p className="mt-1 text-xs text-slate-500">HR: {l.decisionNote}</p>}</div><StatusBadge status={l.status} />{can(l) && <Btn variant="ghost" onClick={() => cancel(l)}>Cancel</Btn>}</li>))}</ul>}
      </Card>
      <Modal open={open} onClose={() => setOpen(false)} title="Request leave">
        <form onSubmit={submit} className="space-y-4">
          <Field label="Leave type"><select className={inputCls} value={f.type || data.balances[0]?.key} onChange={(e) => setF({ ...f, type: e.target.value })}>{data.balances.map((b) => <option key={b.key} value={b.key}>{b.name}{b.entitlement != null ? ` (${b.remaining} left)` : ""}</option>)}</select></Field>
          <div className="grid gap-4 sm:grid-cols-2"><Field label="From"><input type="date" min={today()} className={inputCls} value={f.startDate} onChange={(e) => setF({ ...f, startDate: e.target.value, endDate: e.target.value > f.endDate ? e.target.value : f.endDate })} /></Field><Field label="To"><input type="date" min={f.startDate} className={inputCls} value={f.endDate} onChange={(e) => setF({ ...f, endDate: e.target.value })} /></Field></div>
          <Field label="Reason (optional)"><textarea rows={3} className={inputCls} value={f.reason} onChange={(e) => setF({ ...f, reason: e.target.value })} /></Field>
          <p className="text-xs text-slate-400">Weekends and public holidays are not counted.</p>
          <div className="flex justify-end gap-2"><Btn type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Btn><Btn loading={busy}>Send request</Btn></div>
        </form>
      </Modal>
    </div>
  );
}

function PayslipsTab({ eid }) {
  const { data, loading } = useAsync(() => hrApi.me.payslips(eid), []);
  const [view, setView] = useState(null);
  const open = async (p) => { try { const r = await hrApi.me.payslip(eid, p._id); setView(r.data); } catch (e) { toastErr(e); } };
  if (loading) return <Spinner />;
  if (!data.payslips.length) return <Empty icon={FileText} title="No payslips yet" text="Your payslips appear here the moment your employer publishes them." />;
  return (
    <Card title="Payslips"><ul className="divide-y divide-slate-100">{data.payslips.map((p) => (
      <li key={p._id}><button onClick={() => open(p)} className="flex w-full flex-wrap items-center gap-3 py-3 text-left hover:bg-slate-50"><div className="flex-1"><p className="font-semibold">{monthLabel(p.month)}</p><p className="text-xs text-slate-400">{p.paidAt ? `Paid ${fmtDate(p.paidAt)}` : `Published ${fmtDate(p.publishedAt)}`}</p></div><span className="font-bold text-orange-700">{money(p.net, p.currency)}</span><StatusBadge status={p.status} /></button></li>))}</ul>
      {view && <PayslipView payslip={view.payslip} company={view.company} onClose={() => setView(null)} />}</Card>
  );
}

function PerformanceTab({ eid }) {
  const reviews = useAsync(() => hrApi.me.reviews(eid), []);
  const goals = useAsync(() => hrApi.me.goals(eid), []);
  const [comment, setComment] = useState({});
  const [adding, setAdding] = useState(false);
  const [g, setG] = useState({ title: "", description: "", dueDate: "" });
  const ack = async (r) => { try { await hrApi.me.ackReview(eid, r._id, comment[r._id] || ""); toast.success("Review acknowledged"); reviews.reload(); } catch (e) { toastErr(e); } };
  const progress = async (goal, v) => { try { await hrApi.me.updateGoal(eid, goal._id, { progress: Number(v) }); goals.reload(); } catch (e) { toastErr(e); } };
  const addGoal = async (e) => { e.preventDefault(); try { await hrApi.me.createGoal(eid, { ...g, dueDate: g.dueDate || undefined }); setAdding(false); setG({ title: "", description: "", dueDate: "" }); goals.reload(); } catch (err) { toastErr(err); } };
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="space-y-4">
        <h3 className="font-bold">Performance reviews</h3>
        {!reviews.data ? <Spinner /> : !reviews.data.reviews.length ? <Empty title="No reviews yet" text="Published reviews appear here." /> : reviews.data.reviews.map((r) => (
          <Card key={r._id}><div className="flex items-center justify-between"><p className="font-bold">{r.period}</p><StatusBadge status={r.status} /></div>
            <p className="mt-1 flex items-center gap-1 text-sm"><Star size={15} className="fill-amber-400 text-amber-400" /> <strong>{r.overall}</strong> / 5</p>
            <ul className="mt-3 space-y-1.5">{r.ratings.map((x) => (<li key={x.criterion} className="flex items-center justify-between text-sm"><span>{x.criterion}</span><span className="flex">{[1, 2, 3, 4, 5].map((n) => <Star key={n} size={14} className={n <= x.score ? "fill-amber-400 text-amber-400" : "text-slate-200"} />)}</span></li>))}</ul>
            {[["Strengths", r.strengths], ["To improve", r.improvements], ["Comments", r.comments], ["Next goals", r.nextGoals]].filter(([, v]) => v).map(([l, v]) => <p key={l} className="mt-3 text-sm"><span className="font-semibold">{l}: </span><span className="text-slate-600">{v}</span></p>)}
            {r.status === "Published" ? (<div className="mt-4 space-y-2 border-t border-slate-100 pt-3"><textarea rows={2} className={inputCls} placeholder="Add your comments (optional)" value={comment[r._id] || ""} onChange={(e) => setComment({ ...comment, [r._id]: e.target.value })} /><Btn onClick={() => ack(r)}>Acknowledge review</Btn></div>)
              : r.employeeComment && <p className="mt-3 rounded-xl bg-slate-50 p-3 text-sm"><span className="font-semibold">Your comment: </span>{r.employeeComment}</p>}</Card>
        ))}
      </div>
      <div className="space-y-4">
        <div className="flex items-center justify-between"><h3 className="font-bold">My goals</h3><Btn variant="soft" onClick={() => setAdding(true)}><Plus size={15} /> Add goal</Btn></div>
        {!goals.data ? <Spinner /> : !goals.data.goals.length ? <Empty title="No goals yet" text="Goals assigned by your employer show here. You can add your own too." /> : goals.data.goals.map((x) => (
          <Card key={x._id}><div className="flex items-start justify-between gap-2"><p className="font-semibold">{x.title}</p><StatusBadge status={x.status} /></div>{x.description && <p className="text-sm text-slate-500">{x.description}</p>}
            <input type="range" min="0" max="100" step="5" defaultValue={x.progress} onMouseUp={(e) => progress(x, e.target.value)} onTouchEnd={(e) => progress(x, e.target.value)} onKeyUp={(e) => progress(x, e.target.value)} aria-label={`Progress for ${x.title}`} className="mt-3 w-full accent-orange-600" />
            <p className="text-xs text-slate-400">{x.progress}% done{x.dueDate ? ` · due ${fmtDate(x.dueDate)}` : ""}{x.createdBy === "employee" ? " · set by you" : ""}</p></Card>
        ))}
      </div>
      <Modal open={adding} onClose={() => setAdding(false)} title="Add a goal"><form onSubmit={addGoal} className="space-y-4"><Field label="Goal"><input required className={inputCls} value={g.title} onChange={(e) => setG({ ...g, title: e.target.value })} /></Field><Field label="Details"><textarea rows={3} className={inputCls} value={g.description} onChange={(e) => setG({ ...g, description: e.target.value })} /></Field><Field label="Due date"><input type="date" className={inputCls} value={g.dueDate} onChange={(e) => setG({ ...g, dueDate: e.target.value })} /></Field><div className="flex justify-end"><Btn>Add goal</Btn></div></form></Modal>
    </div>
  );
}

function TasksTab({ eid, d, reloadOverview }) {
  const [emp, setEmp] = useState(d.employee);
  const [doc, setDoc] = useState({ name: "", type: "ID", expiresAt: "", url: "", fileName: "" });
  const reload = () => hrApi.me.overview(eid).then((r) => { setEmp(r.data.employee); reloadOverview(); }).catch(toastErr);
  useHrEvents(["task", "document"], reload);
  const toggle = async (t) => { try { await hrApi.me.toggleTask(eid, t._id, !t.done); reload(); } catch (e) { toastErr(e); } };
  const upload = async () => {
    if (!doc.name.trim() || !doc.url) return toast.error("Name the document and upload the file");
    try { await hrApi.me.uploadDoc(eid, { name: doc.name, type: doc.type, url: doc.url, expiresAt: doc.expiresAt || undefined }); toast.success("Document uploaded. HR can see it."); setDoc({ ...doc, name: "", url: "", fileName: "", expiresAt: "" }); reload(); } catch (e) { toastErr(e); }
  };
  const remove = async (x) => { try { await hrApi.me.removeDoc(eid, x._id); reload(); } catch (e) { toastErr(e); } };
  const mine = emp.tasks.filter((t) => t.assignedTo === "employee"), done = mine.filter((t) => t.done).length;
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card title={`My tasks (${done}/${mine.length})`}>
        {!mine.length ? <p className="py-6 text-center text-sm text-slate-400">Nothing to do.</p> : <ul className="divide-y divide-slate-100">{mine.map((t) => (
          <li key={t._id} className="flex items-center gap-3 py-2.5"><button onClick={() => toggle(t)} aria-label={t.done ? "Mark not done" : "Mark done"}>{t.done ? <CheckCircle2 className="text-emerald-600" size={20} /> : <Circle className="text-slate-300" size={20} />}</button>
            <div className="min-w-0 flex-1"><p className={`text-sm ${t.done ? "text-slate-400 line-through" : "font-medium"}`}>{t.title}</p>{t.dueDate && <p className="text-xs text-slate-400">Due {fmtDate(t.dueDate)}</p>}</div></li>))}</ul>}
      </Card>
      <Card title="Documents">
        <ul className="divide-y divide-slate-100">{emp.documents.map((x) => (
          <li key={x._id} className="flex items-center gap-3 py-2.5"><span className="grid h-9 w-9 place-items-center rounded-xl bg-orange-50 text-orange-600"><FileText size={16} /></span><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{x.name}</p><p className="text-xs text-slate-400">{x.type}{x.expiresAt ? ` · expires ${fmtDate(x.expiresAt)}` : ""}</p></div>
            <a href={x.url} target="_blank" rel="noopener noreferrer" aria-label="Open" className="rounded-lg p-2 hover:bg-slate-100"><ExternalLink size={15} /></a>{x.uploadedBy === "employee" && <button aria-label="Remove" onClick={() => remove(x)} className="rounded-lg p-2 text-red-600 hover:bg-red-50"><Trash2 size={15} /></button>}</li>))}
          {!emp.documents.length && <li className="py-6 text-center text-sm text-slate-400">No documents yet.</li>}</ul>
        <div className="mt-4 space-y-3 border-t border-slate-100 pt-4"><p className="text-sm font-bold">Upload a document</p>
          <div className="grid gap-3 sm:grid-cols-2"><input className={inputCls} placeholder="Name (for example National ID)" value={doc.name} onChange={(e) => setDoc({ ...doc, name: e.target.value })} /><select className={inputCls} value={doc.type} onChange={(e) => setDoc({ ...doc, type: e.target.value })}>{["ID", "Certificate", "Contract", "Other"].map((t) => <option key={t}>{t}</option>)}</select></div>
          <DocUpload file={doc.fileName} onUploaded={(u) => setDoc({ ...doc, url: u.url, fileName: u.fileName, name: doc.name || u.fileName.replace(/\.[^.]+$/, "") })} /><Btn onClick={upload} className="w-full">Upload</Btn></div>
      </Card>
    </div>
  );
}

function NewsTab({ eid, reloadOverview }) {
  const { data, loading, reload } = useAsync(() => hrApi.me.announcements(eid), []);
  const [open, setOpen] = useState(null);
  const toggle = async (a) => { setOpen(open === a._id ? null : a._id); if (!a.read) { await hrApi.me.readAnnouncement(eid, a._id).catch(() => {}); reload(); reloadOverview(); } };
  if (loading) return <Spinner />;
  if (!data.announcements.length) return <Empty icon={Megaphone} title="No news yet" text="Announcements from your employer appear here." />;
  return <div className="space-y-3">{data.announcements.map((a) => (
    <Card key={a._id}><button onClick={() => toggle(a)} className="w-full text-left"><div className="flex items-center gap-2">{!a.read && <span className="h-2 w-2 rounded-full bg-orange-600" />}<h3 className="font-bold">{a.title}</h3>{a.pinned && <Badge tone="orange">Pinned</Badge>}<span className="ml-auto text-xs text-slate-400">{ago(a.createdAt)}</span></div>
      <p className={`mt-2 whitespace-pre-line text-sm text-slate-600 ${open === a._id ? "" : "line-clamp-2"}`}>{a.body}</p></button></Card>))}</div>;
}

function NoticesTab({ eid, reloadOverview }) {
  const { data, loading, reload } = useAsync(() => hrApi.me.cases(eid), []);
  const [text, setText] = useState({});
  const respond = async (c) => { try { await hrApi.me.respondCase(eid, c._id, text[c._id] || ""); toast.success("Sent to HR"); reload(); reloadOverview(); } catch (e) { toastErr(e); } };
  if (loading) return <Spinner />;
  if (!data.cases.length) return <Empty title="No notices" text="Warnings, queries and commendations from HR appear here." />;
  return <div className="space-y-3">{data.cases.map((c) => (
    <Card key={c._id}><div className="flex flex-wrap items-center justify-between gap-2"><div className="flex items-center gap-2"><Badge tone={c.type === "Commendation" ? "green" : "orange"}>{c.type}</Badge><span className="text-xs text-slate-400">{fmtDate(c.createdAt)}</span></div><StatusBadge status={c.status} /></div>
      <h3 className="mt-2 font-bold">{c.subject}</h3><p className="whitespace-pre-line text-sm text-slate-600">{c.details}</p>
      {c.response && <p className="mt-3 rounded-xl bg-sky-50 p-3 text-sm"><span className="font-semibold">Your response ({fmtDateTime(c.respondedAt)}): </span>{c.response}</p>}
      {c.status === "Open" && <div className="mt-3 space-y-2 border-t border-slate-100 pt-3"><textarea rows={3} className={inputCls} placeholder={c.requiresResponse ? "HR is asking for your response" : "Add a response (optional)"} value={text[c._id] || ""} onChange={(e) => setText({ ...text, [c._id]: e.target.value })} /><Btn onClick={() => respond(c)}>{c.requiresResponse ? "Send response" : text[c._id] ? "Send response" : "Acknowledge"}</Btn></div>}</Card>))}</div>;
}

function ProfileTab({ eid, d, reloadOverview }) {
  const e = d.employee;
  const [f, setF] = useState({ phone: e.phone || "", address: e.address || "", state: e.state || "", localGovernment: e.localGovernment || "", maritalStatus: e.maritalStatus || "", photo: e.photo || "",
    ecName: e.emergencyContact?.name || "", ecRelationship: e.emergencyContact?.relationship || "", ecPhone: e.emergencyContact?.phone || "", ecAddress: e.emergencyContact?.address || "",
    bankName: e.compensation?.bank?.name || "", accountName: e.compensation?.bank?.accountName || "", accountNumber: e.compensation?.bank?.accountNumber || "",
    taxId: e.compensation?.taxId || "", pensionNumber: e.compensation?.pensionNumber || "", nhfNumber: e.compensation?.nhfNumber || "" });
  const [busy, setBusy] = useState(false);
  const set = (k) => (x) => setF({ ...f, [k]: x.target.value });
  const save = async (ev) => {
    ev.preventDefault(); setBusy(true);
    try {
      await hrApi.me.profile(eid, { phone: f.phone, address: f.address, state: f.state, localGovernment: f.localGovernment, maritalStatus: f.maritalStatus, photo: f.photo,
        emergencyContact: { name: f.ecName, relationship: f.ecRelationship, phone: f.ecPhone, address: f.ecAddress },
        compensation: { bank: { name: f.bankName, accountName: f.accountName, accountNumber: f.accountNumber }, taxId: f.taxId, pensionNumber: f.pensionNumber, nhfNumber: f.nhfNumber } });
      toast.success("Profile saved. HR was notified."); reloadOverview();
    } catch (err) { toastErr(err); } finally { setBusy(false); }
  };
  const allow = (e.compensation?.allowances || []).reduce((s, a) => s + (a.amount || 0), 0);
  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
      <form onSubmit={save} className="space-y-5 rounded-2xl bg-white p-4 shadow-sm sm:p-5">
        <MediaUpload value={f.photo ? { url: f.photo, type: "image" } : null} onChange={(v) => setF({ ...f, photo: v?.url || "" })} accept="image" folder="ejob/staff" label="Photo" />
        <div className="grid gap-4 sm:grid-cols-2"><Field label="Phone"><input className={inputCls} value={f.phone} onChange={set("phone")} /></Field><Field label="Marital status"><select className={inputCls} value={f.maritalStatus} onChange={set("maritalStatus")}><option value="">Select…</option>{["Single", "Married", "Divorced", "Widowed"].map((s) => <option key={s}>{s}</option>)}</select></Field>
          <Field label="State"><input className={inputCls} value={f.state} onChange={set("state")} /></Field><Field label="Local government"><input className={inputCls} value={f.localGovernment} onChange={set("localGovernment")} /></Field><Field label="Home address" className="sm:col-span-2"><input className={inputCls} value={f.address} onChange={set("address")} /></Field></div>
        <p className="text-sm font-bold">Emergency contact</p>
        <div className="grid gap-4 sm:grid-cols-2"><Field label="Name"><input className={inputCls} value={f.ecName} onChange={set("ecName")} /></Field><Field label="Relationship"><input className={inputCls} value={f.ecRelationship} onChange={set("ecRelationship")} /></Field><Field label="Phone"><input className={inputCls} value={f.ecPhone} onChange={set("ecPhone")} /></Field><Field label="Address"><input className={inputCls} value={f.ecAddress} onChange={set("ecAddress")} /></Field></div>
        <p className="text-sm font-bold">Bank and ID numbers <span className="font-normal text-slate-400">(HR is notified when your bank details change)</span></p>
        <div className="grid gap-4 sm:grid-cols-3"><Field label="Bank"><input className={inputCls} value={f.bankName} onChange={set("bankName")} /></Field><Field label="Account name"><input className={inputCls} value={f.accountName} onChange={set("accountName")} /></Field><Field label="Account number"><input className={inputCls} inputMode="numeric" maxLength={20} value={f.accountNumber} onChange={set("accountNumber")} /></Field>
          <Field label="Tax ID (TIN)"><input className={inputCls} value={f.taxId} onChange={set("taxId")} /></Field><Field label="Pension number"><input className={inputCls} value={f.pensionNumber} onChange={set("pensionNumber")} /></Field><Field label="NHF number"><input className={inputCls} value={f.nhfNumber} onChange={set("nhfNumber")} /></Field></div>
        <div className="flex justify-end"><Btn loading={busy}>Save profile</Btn></div>
      </form>
      <Card title="My employment (set by your employer)">
        {[["Name", fullName(e)], ["Staff ID", e.staffId], ["Job title", e.jobTitle], ["Department", e.department], ["Type", e.employmentType], ["Location", e.workLocation], ["Started", fmtDate(e.hireDate)], ["Basic salary", money(e.compensation?.basic)], ["Allowances", money(allow)], ["Monthly gross", money((e.compensation?.basic || 0) + allow)]].map(([l, v]) => (
          <p key={l} className="flex justify-between gap-3 border-b border-slate-50 py-2 text-sm last:border-0"><span className="text-slate-500">{l}</span><span className="text-right font-medium">{v || "-"}</span></p>))}
        <p className="mt-3 text-xs text-slate-400">To change these, speak to HR.</p>
      </Card>
    </div>
  );
}