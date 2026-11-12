import { useState } from "react";
import { Check, X, Plus, CalendarDays } from "lucide-react";
import { toast } from "sonner";
import { hrApi } from "./hrApi";
import { Btn, Card, Avatar, Badge, StatusBadge, Tabs, Modal, Spinner, Empty, Field, inputCls, useAsync, useHrEvents, fmtDate, thisMonth, monthLabel, toastErr, today,  
} from "./hrUi";

// HR records leave for someone (it is approved straight away and the employee is told instantly)
export function RecordLeaveModal({ open, employee, employees = [], onClose, onSaved }) {
  const settings = useAsync(() => (open ? hrApi.settings() : Promise.resolve({ data: {} })), [open], { soft: true });
  const types = settings.data?.settings?.leaveTypes || [];
  const [f, setF] = useState({ employee: employee?._id || "", type: "", startDate: today(), endDate: today(), reason: "" });
  const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault(); setBusy(true);
    try { await hrApi.createLeave({ ...f, employee: employee?._id || f.employee, type: f.type || types[0]?.key }); toast.success("Leave recorded and the employee was notified"); onSaved(); }
    catch (err) { toastErr(err); } finally { setBusy(false); }
  };
  return (
    <Modal open={open} onClose={onClose} title={employee ? `Record leave for ${employee.firstName}` : "Record leave"}>
      <form onSubmit={submit} className="space-y-4">
        {!employee && <Field label="Employee"><select required className={inputCls} value={f.employee} onChange={(e) => setF({ ...f, employee: e.target.value })}><option value="">Select…</option>{employees.map((x) => <option key={x._id} value={x._id}>{x.name}</option>)}</select></Field>}
        <Field label="Leave type"><select className={inputCls} value={f.type || types[0]?.key || ""} onChange={(e) => setF({ ...f, type: e.target.value })}>{types.map((t) => <option key={t.key} value={t.key}>{t.name}</option>)}</select></Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="From"><input type="date" className={inputCls} value={f.startDate} onChange={(e) => setF({ ...f, startDate: e.target.value, endDate: e.target.value > f.endDate ? e.target.value : f.endDate })} /></Field>
          <Field label="To"><input type="date" min={f.startDate} className={inputCls} value={f.endDate} onChange={(e) => setF({ ...f, endDate: e.target.value })} /></Field>
        </div>
        <Field label="Note (optional)"><textarea rows={2} className={inputCls} value={f.reason} onChange={(e) => setF({ ...f, reason: e.target.value })} /></Field>
        <div className="flex justify-end gap-2"><Btn type="button" variant="ghost" onClick={onClose}>Cancel</Btn><Btn loading={busy}>Record leave</Btn></div>
      </form>
    </Modal>
  );
}

const Person = ({ e }) => (<div className="flex min-w-0 items-center gap-3"><Avatar name={`${e?.firstName} ${e?.lastName}`} src={e?.photo} /><div className="min-w-0"><p className="truncate font-semibold">{e?.firstName} {e?.lastName}</p><p className="truncate text-xs text-slate-400">{e?.jobTitle}{e?.department ? ` · ${e.department}` : ""}</p></div></div>);

function HrLeave() {
  const [tab, setTab] = useState("pending");
  const [deciding, setDeciding] = useState(null); // { leave, action }
  const [note, setNote] = useState("");
  const [rec, setRec] = useState(false);
  const [month, setMonth] = useState(thisMonth());
  const all = useAsync(() => hrApi.leave({}), []);
  const balances = useAsync(() => hrApi.leaveBalances(), []);
  const [from, to] = [`${month}-01`, `${month}-${String(new Date(+month.slice(0, 4), +month.slice(5), 0).getDate()).padStart(2, "0")}`];
  const cal = useAsync(() => hrApi.leave({ status: "Approved", from, to }), [month]);
  const reload = () => { all.reload(); balances.reload(); cal.reload(); };
  useHrEvents(["leave"], reload);

  const leaves = all.data?.leaves || [];
  const pending = leaves.filter((l) => l.status === "Pending");
  const people = (balances.data?.rows || []).map((r) => ({ _id: r._id, name: r.name }));

  const decide = async () => {
    const { leave, action } = deciding;
    try { await hrApi.decideLeave(leave._id, action, note); toast.success(action === "approve" ? "Approved. The employee was notified." : "Rejected. The employee was notified."); setDeciding(null); setNote(""); reload(); }
    catch (err) { toastErr(err); }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs value={tab} onChange={setTab} tabs={[["pending", "Pending", pending.length], ["all", "All requests"], ["balances", "Balances"], ["calendar", "Calendar"]]} />
        <Btn onClick={() => setRec(true)}><Plus size={16} /> Record leave</Btn>
      </div>

      {tab === "pending" && (!all.data ? <Spinner /> : !pending.length ? <Empty icon={CalendarDays} title="All caught up" text="New leave requests appear here the moment an employee sends one." /> : (
        <ul className="space-y-3">{pending.map((l) => (
          <li key={l._id} className="rounded-2xl bg-white p-4 shadow-sm sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-3"><Person e={l.employee} /><div className="flex gap-2"><Btn variant="success" onClick={() => setDeciding({ leave: l, action: "approve" })}><Check size={16} /> Approve</Btn><Btn variant="outline" onClick={() => setDeciding({ leave: l, action: "reject" })}><X size={16} /> Reject</Btn></div></div>
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm"><Badge tone="blue">{l.typeName}</Badge><span>{fmtDate(l.startDate)} to {fmtDate(l.endDate)}</span><strong>{l.days} working day{l.days === 1 ? "" : "s"}</strong></div>
            {l.reason && <p className="mt-2 text-sm text-slate-600">"{l.reason}"</p>}
          </li>))}</ul>
      ))}

      {tab === "all" && (!all.data ? <Spinner /> : (
        <Card><ul className="divide-y divide-slate-100">{leaves.map((l) => (
          <li key={l._id} className="flex flex-wrap items-center gap-3 py-3"><div className="min-w-[12rem] flex-1"><Person e={l.employee} /></div><span className="text-sm">{l.typeName}</span><span className="text-sm text-slate-500">{fmtDate(l.startDate)} to {fmtDate(l.endDate)} · {l.days}d</span><StatusBadge status={l.status} /></li>))}
          {!leaves.length && <li className="py-8 text-center text-sm text-slate-400">No leave yet</li>}</ul></Card>
      ))}

      {tab === "balances" && (!balances.data ? <Spinner /> : (
        <Card title={`Leave balances ${balances.data.year}`}>
          <div className="overflow-x-auto"><table className="w-full min-w-[40rem] text-sm"><thead><tr className="border-b border-slate-100 text-left text-xs text-slate-400"><th className="py-2">Employee</th>{balances.data.types.map((t) => <th key={t.key} className="py-2 text-center">{t.name}</th>)}</tr></thead>
            <tbody>{balances.data.rows.map((r) => (<tr key={r._id} className="border-b border-slate-50"><td className="py-2"><p className="font-semibold">{r.name}</p><p className="text-xs text-slate-400">{r.department || r.staffId}</p></td>
              {balances.data.types.map((t) => { const b = r.balances.find((x) => x.key === t.key); return <td key={t.key} className="py-2 text-center">{!b ? <span className="text-slate-300">n/a</span> : b.entitlement == null ? `${b.used}d used` : <span className={b.remaining === 0 ? "font-semibold text-red-600" : ""}>{b.remaining}/{b.entitlement}</span>}</td>; })}</tr>))}</tbody></table></div>
        </Card>
      ))}

      {tab === "calendar" && (
        <Card title={`Who is away: ${monthLabel(month)}`} action={<input type="month" value={month} onChange={(e) => setMonth(e.target.value || thisMonth())} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm" />}>
          {!cal.data ? <Spinner /> : (() => {
            const days = Array.from({ length: +to.slice(8) }, (_, i) => `${month}-${String(i + 1).padStart(2, "0")}`);
            const rows = Object.values(cal.data.leaves.reduce((m, l) => { (m[l.employee?._id] ??= { e: l.employee, ls: [] }).ls.push(l); return m; }, {}));
            return !rows.length ? <p className="py-8 text-center text-sm text-slate-400">Nobody is on leave this month.</p> : (
              <div className="overflow-x-auto"><table className="text-xs"><thead><tr><th className="sticky left-0 bg-white py-1 pr-3 text-left">Employee</th>{days.map((d) => <th key={d} className={`w-6 px-0.5 text-center font-normal ${[0, 6].includes(new Date(`${d}T00:00:00Z`).getUTCDay()) ? "text-slate-300" : "text-slate-500"}`}>{+d.slice(8)}</th>)}</tr></thead>
                <tbody>{rows.map(({ e, ls }) => (<tr key={e?._id}><td className="sticky left-0 whitespace-nowrap bg-white py-1 pr-3 font-medium">{e?.firstName} {e?.lastName}</td>{days.map((d) => { const l = ls.find((x) => x.startDate <= d && x.endDate >= d); return <td key={d} title={l ? l.typeName : ""} className="px-0.5 py-1"><span className={`block h-5 w-5 rounded ${l ? "bg-orange-500" : "bg-slate-100"}`} /></td>; })}</tr>))}</tbody></table></div>
            );
          })()}
        </Card>
      )}

      <Modal open={!!deciding} onClose={() => { setDeciding(null); setNote(""); }} title={deciding?.action === "approve" ? "Approve leave" : "Reject leave"}>
        {deciding && <div className="space-y-4">
          <p className="text-sm text-slate-600">{deciding.leave.employee?.firstName}'s {deciding.leave.typeName.toLowerCase()}, {fmtDate(deciding.leave.startDate)} to {fmtDate(deciding.leave.endDate)} ({deciding.leave.days} working days).</p>
          <Field label={deciding.action === "reject" ? "Reason (required, they will see it)" : "Note (optional)"}><textarea rows={3} className={inputCls} value={note} onChange={(e) => setNote(e.target.value)} /></Field>
          <div className="flex justify-end gap-2"><Btn variant="ghost" onClick={() => setDeciding(null)}>Cancel</Btn><Btn variant={deciding.action === "approve" ? "success" : "danger"} onClick={decide}>{deciding.action === "approve" ? "Approve" : "Reject"}</Btn></div>
        </div>}
      </Modal>
      <RecordLeaveModal open={rec} employees={people} onClose={() => setRec(false)} onSaved={() => { setRec(false); reload(); }} />
    </div>
  );
}

export default HrLeave;