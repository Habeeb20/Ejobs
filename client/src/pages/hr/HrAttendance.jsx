import { useState } from "react";
import { Download, Clock, PencilLine } from "lucide-react";
import { toast } from "sonner";
import { hrApi } from "../../api";
import { Btn, Card, Avatar, StatusBadge, Tabs, Modal, Spinner, Field, inputCls, useAsync, useHrEvents, fmtTime, monthLabel, thisMonth, today, toastErr, csv, fullName } from "./HrUi";

const CHIPS = [["Present", "bg-emerald-100 text-emerald-700"], ["Late", "bg-amber-100 text-amber-700"], ["HalfDay", "bg-orange-100 text-orange-700"], ["Absent", "bg-red-100 text-red-700"], ["Leave", "bg-sky-100 text-sky-700"], ["NotIn", "bg-slate-100 text-slate-600"]];

export default function HrAttendance() {
    const [tab, setTab] = useState("day");
    const [date, setDate] = useState(today());
    const [month, setMonth] = useState(thisMonth());
    const [mark, setMark] = useState(null);
    const day = useAsync(() => hrApi.attDay(date), [date]);
    const report = useAsync(() => hrApi.attReport(month), [month]);
    useHrEvents(["attendance", "leave"], () => { day.reload(); report.reload(); });

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <Tabs value={tab} onChange={setTab} tabs={[["day", "Daily board"], ["report", "Monthly report"]]} />
                {tab === "day" ? <input type="date" max={today()} value={date} onChange={(e) => setDate(e.target.value || today())} className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm" aria-label="Date" />
                    : <input type="month" max={thisMonth()} value={month} onChange={(e) => setMonth(e.target.value || thisMonth())} className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm" aria-label="Month" />}
            </div>

            {tab === "day" && (!day.data ? <Spinner /> : (
                <>
                    <div className="flex flex-wrap gap-2">
                        {CHIPS.map(([k, cls]) => <span key={k} className={`rounded-full px-3 py-1 text-sm font-semibold ${cls}`}>{k === "NotIn" ? "Not in yet" : k === "HalfDay" ? "Half day" : k} {day.data.summary[k] || 0}</span>)}
                        {!day.data.working && <span className="rounded-full bg-violet-100 px-3 py-1 text-sm font-semibold text-violet-700">{day.data.holiday || "Non-working day"}</span>}
                    </div>
                    <Card>
                        <p className="mb-2 text-xs text-slate-400">Work hours {day.data.schedule.start} to {day.data.schedule.end}, {day.data.schedule.graceMinutes} minutes grace. Staff clock in from their own dashboard.</p>
                        <ul className="divide-y divide-slate-100">
                            {day.data.rows.map((r) => (
                                <li key={r._id} className="flex flex-wrap items-center gap-3 py-3">
                                    <div className="flex min-w-[12rem] flex-1 items-center gap-3"><Avatar name={fullName(r)} src={r.photo} /><div className="min-w-0"><p className="truncate font-semibold">{fullName(r)}</p><p className="truncate text-xs text-slate-400">{r.jobTitle}{r.department ? ` · ${r.department}` : ""}</p></div></div>
                                    <StatusBadge status={r.status} />{r.leaveType && <span className="text-xs text-slate-400">{r.leaveType}</span>}
                                    <span className="flex w-40 items-center gap-1 text-sm text-slate-600"><Clock size={14} /> {fmtTime(r.clockIn)} - {fmtTime(r.clockOut)}</span>
                                    <span className="w-14 text-right text-sm font-semibold">{r.hours ? `${r.hours}h` : ""}</span>
                                    <Btn variant="ghost" onClick={() => setMark({ employee: r, date })} aria-label={`Edit attendance for ${r.firstName}`}><PencilLine size={16} /></Btn>
                                </li>
                            ))}
                            {!day.data.rows.length && <li className="py-10 text-center text-sm text-slate-400">No active staff for this date.</li>}
                        </ul>
                    </Card>
                </>
            ))}

            {tab === "report" && (!report.data ? <Spinner /> : (
                <Card title={`${monthLabel(month)} · ${report.data.workingDays} working days so far`} action={<Btn variant="outline" onClick={() => csv(`attendance-${month}.csv`, [["Staff ID", "Name", "Department", "Present", "Late", "Half days", "Absent", "Leave", "Hours", "Attendance %"], ...report.data.rows.map((r) => [r.staffId, r.name, r.department, r.present, r.late, r.halfDay, r.absent, r.leave, r.hours, r.rate ?? ""])])}><Download size={15} /> Export</Btn>}>
                    <div className="overflow-x-auto"><table className="w-full min-w-[44rem] text-sm"><thead><tr className="border-b border-slate-100 text-left text-xs text-slate-400"><th className="py-2">Employee</th><th className="text-center">Present</th><th className="text-center">Late</th><th className="text-center">Half</th><th className="text-center">Absent</th><th className="text-center">Leave</th><th className="text-center">Hours</th><th className="w-40">Attendance</th></tr></thead>
                        <tbody>{report.data.rows.map((r) => (<tr key={r._id} className="border-b border-slate-50"><td className="py-2"><p className="font-semibold">{r.name}</p><p className="text-xs text-slate-400">{r.department || r.staffId}</p></td>
                            <td className="text-center">{r.present}</td><td className="text-center text-amber-600">{r.late}</td><td className="text-center">{r.halfDay}</td><td className={`text-center ${r.absent ? "font-semibold text-red-600" : ""}`}>{r.absent}</td><td className="text-center">{r.leave}</td><td className="text-center">{r.hours}</td>
                            <td>{r.rate == null ? <span className="text-slate-300">n/a</span> : <div className="flex items-center gap-2"><div className="h-2 flex-1 rounded-full bg-slate-100"><div className={`h-full rounded-full ${r.rate >= 90 ? "bg-emerald-500" : r.rate >= 75 ? "bg-amber-500" : "bg-red-500"}`} style={{ width: `${r.rate}%` }} /></div><span className="w-9 text-right text-xs font-semibold">{r.rate}%</span></div>}</td></tr>))}</tbody></table></div>
                </Card>
            ))}

            {mark && <MarkModal ctx={mark} onClose={() => setMark(null)} onSaved={() => { setMark(null); day.reload(); report.reload(); }} />}
        </div>
    );
}

function MarkModal({ ctx, onClose, onSaved }) {
    const { employee: e, date } = ctx;
    const [f, setF] = useState({ status: ["Present", "Late", "HalfDay", "Absent", "Leave", "Holiday"].includes(e.status) ? e.status : "Present", clockIn: "", clockOut: "", note: e.note || "" });
    const [busy, setBusy] = useState(false);
    const save = async (ev) => {
        ev.preventDefault(); setBusy(true);
        try { await hrApi.attMark({ employee: e._id, date, ...f }); toast.success("Attendance updated"); onSaved(); } catch (err) { toastErr(err); } finally { setBusy(false); }
    };
    return (
        <Modal open onClose={onClose} title={`${fullName(e)} · ${date}`}>
            <form onSubmit={save} className="space-y-4">
                <Field label="Status"><select className={inputCls} value={f.status} onChange={(x) => setF({ ...f, status: x.target.value })}>{[["Present", "Present"], ["Late", "Late"], ["HalfDay", "Half day"], ["Absent", "Absent"], ["Leave", "On leave"], ["Holiday", "Holiday"]].map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></Field>
                <div className="grid gap-4 sm:grid-cols-2"><Field label="Clock in"><input type="time" className={inputCls} value={f.clockIn} onChange={(x) => setF({ ...f, clockIn: x.target.value })} /></Field><Field label="Clock out"><input type="time" className={inputCls} value={f.clockOut} onChange={(x) => setF({ ...f, clockOut: x.target.value })} /></Field></div>
                <Field label="Note"><input className={inputCls} value={f.note} onChange={(x) => setF({ ...f, note: x.target.value })} /></Field>
                <div className="flex justify-end gap-2"><Btn type="button" variant="ghost" onClick={onClose}>Cancel</Btn><Btn loading={busy}>Save</Btn></div>
            </form>
        </Modal>
    );
}