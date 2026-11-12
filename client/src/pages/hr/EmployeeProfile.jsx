import { useState } from "react";
import { ArrowLeft, Mail, Phone, MapPin, FileText, Trash2, Plus, ExternalLink, UserX, CheckCircle2, Circle, Star, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { hrApi } from "./hrApi";
import {
  Btn, Card, Avatar, Badge, StatusBadge, Tabs, Modal, Spinner, ErrorBox, Empty, Field, DocUpload, inputCls, useAsync, useHrEvents,
  fmtDate, fmtDateTime, fullName, money, tenure, toastErr, iso, today,
} from "./hrUi";
import EmployeeForm from "./EmployeeForm";
import Chat from "./Chat";
import { RecordLeaveModal } from "./HrLeave";
import { ReviewModal, GoalModal, CaseModal } from "./HrPerformance";

const Row = ({ label, children }) => (<div className="flex justify-between gap-4 border-b border-slate-50 py-2 text-sm last:border-0"><span className="text-slate-500">{label}</span><span className="text-right font-medium">{children || "-"}</span></div>);

export default function EmployeeProfile({ id, settings, onBack }) {
  const { data, loading, error, reload } = useAsync(() => hrApi.employee(id), [id]);
  const [tab, setTab] = useState("overview");
  const [statusOpen, setStatusOpen] = useState(false);
  useHrEvents(["task", "document", "profile", "employment", "message"], reload);

  if (loading) return <Spinner label="Loading profile…" />;
  if (error) return <div className="space-y-3"><Btn variant="ghost" onClick={onBack}><ArrowLeft size={16} /> Back to staff</Btn><ErrorBox error={error} onRetry={reload} /></div>;
  const e = data.employee, name = fullName(e);
  const open = e.tasks.filter((t) => !t.done).length;

  return (
    <div className="space-y-4">
      <Btn variant="ghost" onClick={onBack}><ArrowLeft size={16} /> Back to staff</Btn>
      <div className="flex flex-wrap items-center gap-4 rounded-2xl bg-white p-4 shadow-sm sm:p-5">
        <Avatar name={name} src={e.photo} size={64} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2"><h2 className="text-xl font-extrabold">{name}</h2><StatusBadge status={e.status} /></div>
          <p className="text-slate-500">{e.jobTitle}{e.department ? ` · ${e.department}` : ""}</p>
          <p className="text-xs text-slate-400">{e.staffId} · {e.employmentType} · since {fmtDate(e.hireDate)} ({tenure(e.hireDate, e.exitDate || new Date())})</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Btn variant="outline" onClick={() => setTab("messages")}><Mail size={16} /> Message</Btn>
          <Btn variant={["Terminated", "Resigned"].includes(e.status) ? "success" : "outline"} onClick={() => setStatusOpen(true)}><UserX size={16} /> {["Terminated", "Resigned"].includes(e.status) ? "Reinstate" : "Change status"}</Btn>
        </div>
      </div>
      {!data.hasAccount && <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">{e.firstName} doesn't have an EJob account yet. They were emailed at <strong>{e.email}</strong> and will see their staff dashboard as soon as they sign up with that email.</p>}

      <Tabs value={tab} onChange={setTab} tabs={[["overview", "Overview"], ["edit", "Edit details"], ["documents", "Documents", e.documents.length], ["tasks", "Tasks", open], ["leave", "Leave"], ["performance", "Performance"], ["messages", "Messages"], ["activity", "Activity"]]} />

      {tab === "overview" && <Overview e={e} manager={data.manager} reports={data.directReports} />}
      {tab === "edit" && <Card><EmployeeForm mode="edit" initial={e} settings={settings} onSaved={() => { reload(); setTab("overview"); }} /></Card>}
      {tab === "documents" && <DocsTab e={e} reload={reload} />}
      {tab === "tasks" && <TasksTab e={e} reload={reload} />}
      {tab === "leave" && <LeaveTab e={e} />}
      {tab === "performance" && <PerfTab e={e} />}
      {tab === "messages" && <Chat me="employer" load={() => hrApi.thread(e._id)} send={(b) => hrApi.send(e._id, b)} empty={`Start a conversation with ${e.firstName}. They see it instantly and get an email.`} />}
      {tab === "activity" && <ActivityTab id={e._id} />}

      <StatusModal open={statusOpen} onClose={() => setStatusOpen(false)} e={e} onDone={() => { setStatusOpen(false); reload(); }} />
    </div>
  );
}

function Overview({ e, manager, reports }) {
  const allow = (e.compensation?.allowances || []).reduce((s, a) => s + (a.amount || 0), 0);
  const bank = e.compensation?.bank;
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card title="Contact">
        <Row label="Email"><a href={`mailto:${e.email}`} className="text-orange-700">{e.email}</a></Row>
        <Row label="Phone">{e.phone && <a href={`tel:${e.phone}`} className="text-orange-700">{e.phone}</a>}</Row>
        <Row label="Address">{[e.address, e.localGovernment, e.state].filter(Boolean).join(", ")}</Row>
        <Row label="Date of birth">{e.dateOfBirth && fmtDate(e.dateOfBirth)}</Row>
        <Row label="Gender">{e.gender}</Row><Row label="Marital status">{e.maritalStatus}</Row>
      </Card>
      <Card title="Employment">
        <Row label="Type">{e.employmentType}</Row><Row label="Location">{e.workLocation}</Row>
        <Row label="Reports to">{manager ? fullName(manager) : null}</Row>
        <Row label="Probation ends">{e.probationEndDate && fmtDate(e.probationEndDate)}</Row>
        <Row label="Contract ends">{e.contractEndDate && fmtDate(e.contractEndDate)}</Row>
        {e.exitDate && <Row label="Left on">{fmtDate(e.exitDate)}</Row>}
        {e.statusReason && <Row label="Reason">{e.statusReason}</Row>}
        {reports.length > 0 && <Row label="Direct reports">{reports.map(fullName).join(", ")}</Row>}
      </Card>
      <Card title="Pay">
        <Row label="Basic salary">{money(e.compensation?.basic)}</Row><Row label="Allowances">{money(allow)}</Row>
        <Row label="Monthly gross">{money((e.compensation?.basic || 0) + allow)}</Row>
        <Row label="Bank">{bank?.accountNumber ? `${bank.name || ""} ${"•".repeat(Math.max(0, bank.accountNumber.length - 4))}${bank.accountNumber.slice(-4)}` : null}</Row>
        <Row label="Tax ID / Pension">{[e.compensation?.taxId, e.compensation?.pensionNumber].filter(Boolean).join(" / ")}</Row>
      </Card>
      <Card title="Emergency contact">
        <Row label="Name">{e.emergencyContact?.name}</Row><Row label="Relationship">{e.emergencyContact?.relationship}</Row>
        <Row label="Phone">{e.emergencyContact?.phone}</Row><Row label="Address">{e.emergencyContact?.address}</Row>
      </Card>
      {e.notes && <Card title="Private notes" className="lg:col-span-2"><p className="whitespace-pre-line text-sm text-slate-700">{e.notes}</p></Card>}
    </div>
  );
}

function DocsTab({ e, reload }) {
  const [f, setF] = useState({ name: "", type: "Contract", expiresAt: "", visibleToEmployee: true, url: "", fileName: "" });
  const [busy, setBusy] = useState(false);
  const add = async () => {
    if (!f.name.trim() || !f.url) return toast.error("Name the document and upload the file");
    setBusy(true);
    try { await hrApi.addDoc(e._id, { name: f.name, type: f.type, url: f.url, expiresAt: f.expiresAt || undefined, visibleToEmployee: f.visibleToEmployee }); toast.success("Document added"); setF({ ...f, name: "", url: "", fileName: "", expiresAt: "" }); reload(); }
    catch (err) { toastErr(err); } finally { setBusy(false); }
  };
  const remove = async (d) => { if (!window.confirm(`Remove "${d.name}"?`)) return; try { await hrApi.removeDoc(e._id, d._id); reload(); } catch (err) { toastErr(err); } };
  const expiry = (d) => { if (!d.expiresAt) return null; const days = Math.ceil((new Date(d.expiresAt) - Date.now()) / 864e5); return days < 0 ? <Badge tone="red">Expired</Badge> : days <= 30 ? <Badge tone="amber">Expires in {days}d</Badge> : <Badge>Expires {fmtDate(d.expiresAt)}</Badge>; };
  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
      <Card title="Documents">
        {!e.documents.length ? <p className="py-8 text-center text-sm text-slate-400">No documents yet. Add the signed contract, ID and certificates.</p> : (
          <ul className="divide-y divide-slate-100">
            {e.documents.map((d) => (
              <li key={d._id} className="flex flex-wrap items-center gap-3 py-3">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-orange-50 text-orange-600"><FileText size={18} /></span>
                <div className="min-w-0 flex-1"><p className="truncate font-semibold">{d.name}</p><p className="text-xs text-slate-400">{d.type} · {d.uploadedBy === "employee" ? "uploaded by employee" : "uploaded by you"} · {fmtDate(d.createdAt)}</p></div>
                {expiry(d)}{!d.visibleToEmployee && <Badge tone="violet">HR only</Badge>}
                <a href={d.url} target="_blank" rel="noopener noreferrer" aria-label="Open" className="grid h-9 w-9 place-items-center rounded-lg hover:bg-slate-100"><ExternalLink size={16} /></a>
                <button aria-label="Remove" onClick={() => remove(d)} className="grid h-9 w-9 place-items-center rounded-lg text-red-600 hover:bg-red-50"><Trash2 size={16} /></button>
              </li>
            ))}
          </ul>
        )}
      </Card>
      <Card title="Add a document">
        <div className="space-y-3">
          <Field label="Name"><input className={inputCls} value={f.name} onChange={(x) => setF({ ...f, name: x.target.value })} placeholder="Employment contract" /></Field>
          <Field label="Type"><select className={inputCls} value={f.type} onChange={(x) => setF({ ...f, type: x.target.value })}>{["Contract", "Offer letter", "ID", "Certificate", "Policy", "Other"].map((t) => <option key={t}>{t}</option>)}</select></Field>
          <Field label="Expires (optional)" hint="You'll see it in the HR overview before it expires"><input type="date" className={inputCls} value={f.expiresAt} onChange={(x) => setF({ ...f, expiresAt: x.target.value })} /></Field>
          <DocUpload file={f.fileName} onUploaded={(u) => setF({ ...f, url: u.url, fileName: u.fileName, name: f.name || u.fileName.replace(/\.[^.]+$/, "") })} />
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="accent-orange-600" checked={f.visibleToEmployee} onChange={(x) => setF({ ...f, visibleToEmployee: x.target.checked })} /> Share with {e.firstName}</label>
          <Btn loading={busy} onClick={add} className="w-full"><Plus size={16} /> Add document</Btn>
        </div>
      </Card>
    </div>
  );
}

function TasksTab({ e, reload }) {
  const [f, setF] = useState({ title: "", dueDate: "", assignedTo: "employee", kind: "general" });
  const done = e.tasks.filter((t) => t.done).length, pct = e.tasks.length ? Math.round((done / e.tasks.length) * 100) : 0;
  const toggle = async (t) => { try { await hrApi.updateTask(e._id, t._id, { done: !t.done }); reload(); } catch (err) { toastErr(err); } };
  const remove = async (t) => { try { await hrApi.removeTask(e._id, t._id); reload(); } catch (err) { toastErr(err); } };
  const add = async (ev) => { ev.preventDefault(); if (!f.title.trim()) return; try { await hrApi.addTask(e._id, { ...f, dueDate: f.dueDate || undefined }); setF({ ...f, title: "", dueDate: "" }); reload(); } catch (err) { toastErr(err); } };
  const groups = [["onboarding", "Onboarding"], ["offboarding", "Offboarding"], ["general", "Other tasks"]];
  return (
    <div className="space-y-4">
      <Card title="Checklist progress"><div className="h-2 rounded-full bg-slate-100"><div className="h-full rounded-full bg-orange-500 transition-all" style={{ width: `${pct}%` }} /></div><p className="mt-2 text-sm text-slate-500">{done} of {e.tasks.length} done ({pct}%)</p></Card>
      {groups.map(([k, label]) => { const items = e.tasks.filter((t) => t.kind === k); return items.length ? (
        <Card key={k} title={label}>
          <ul className="divide-y divide-slate-100">
            {items.map((t) => (
              <li key={t._id} className="flex items-center gap-3 py-2.5">
                <button onClick={() => toggle(t)} aria-label={t.done ? "Mark not done" : "Mark done"}>{t.done ? <CheckCircle2 className="text-emerald-600" size={20} /> : <Circle className="text-slate-300" size={20} />}</button>
                <div className="min-w-0 flex-1"><p className={`text-sm ${t.done ? "text-slate-400 line-through" : "font-medium"}`}>{t.title}</p><p className="text-xs text-slate-400">For {t.assignedTo === "employer" ? "you" : e.firstName}{t.dueDate ? ` · due ${fmtDate(t.dueDate)}` : ""}{t.done && t.doneBy ? ` · done by ${t.doneBy}` : ""}</p></div>
                <button aria-label="Delete task" onClick={() => remove(t)} className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600"><Trash2 size={15} /></button>
              </li>
            ))}
          </ul>
        </Card>) : null; })}
      <Card title="Add a task">
        <form onSubmit={add} className="grid gap-3 sm:grid-cols-[1fr_150px_150px_auto]">
          <input className={inputCls} placeholder="Task" value={f.title} onChange={(x) => setF({ ...f, title: x.target.value })} />
          <input type="date" className={inputCls} value={f.dueDate} onChange={(x) => setF({ ...f, dueDate: x.target.value })} />
          <select className={inputCls} value={f.assignedTo} onChange={(x) => setF({ ...f, assignedTo: x.target.value })}><option value="employee">For {e.firstName}</option><option value="employer">For me</option></select>
          <Btn><Plus size={16} /> Add</Btn>
        </form>
      </Card>
    </div>
  );
}

function LeaveTab({ e }) {
  const [rec, setRec] = useState(false);
  const leaves = useAsync(() => hrApi.leave({ employee: e._id }), [e._id]);
  const bal = useAsync(() => hrApi.leaveBalances(), [], { soft: true });
  useHrEvents(["leave"], () => { leaves.reload(); bal.reload(); });
  const mine = bal.data?.rows?.find((r) => r._id === e._id)?.balances || [];
  return (
    <div className="space-y-4">
      <Card title={`Leave balances ${bal.data?.year || ""}`} action={<Btn variant="soft" onClick={() => setRec(true)}><Plus size={15} /> Record leave</Btn>}>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {mine.map((b) => (<div key={b.key} className="rounded-xl bg-slate-50 p-3"><p className="text-sm font-semibold">{b.name}</p><p className="text-xs text-slate-500">{b.entitlement == null ? `${b.used} days taken` : `${b.remaining} of ${b.entitlement} days left`}{b.pending ? ` · ${b.pending} pending` : ""}</p>
            {b.entitlement != null && <div className="mt-2 h-1.5 rounded-full bg-slate-200"><div className="h-full rounded-full bg-orange-500" style={{ width: `${Math.min(100, ((b.used + b.pending) / b.entitlement) * 100)}%` }} /></div>}</div>))}
        </div>
      </Card>
      <Card title="History">
        {!leaves.data ? <Spinner /> : !leaves.data.leaves.length ? <p className="py-6 text-center text-sm text-slate-400">No leave recorded.</p> : (
          <ul className="divide-y divide-slate-100">{leaves.data.leaves.map((l) => (<li key={l._id} className="flex flex-wrap items-center gap-3 py-2.5 text-sm"><span className="font-semibold">{l.typeName}</span><span className="text-slate-500">{l.startDate} to {l.endDate} ({l.days} day{l.days === 1 ? "" : "s"})</span><span className="ml-auto"><StatusBadge status={l.status} /></span></li>))}</ul>
        )}
      </Card>
      <RecordLeaveModal open={rec} employee={e} onClose={() => setRec(false)} onSaved={() => { setRec(false); leaves.reload(); bal.reload(); }} />
    </div>
  );
}

function PerfTab({ e }) {
  const [modal, setModal] = useState(null);
  const reviews = useAsync(() => hrApi.reviews({ employee: e._id }), [e._id]);
  const goals = useAsync(() => hrApi.goals({ employee: e._id }), [e._id]);
  const cases = useAsync(() => hrApi.cases({ employee: e._id }), [e._id]);
  const reload = () => { reviews.reload(); goals.reload(); cases.reload(); setModal(null); };
  useHrEvents(["review", "goal", "case"], reload);
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card title="Reviews" action={<Btn variant="soft" onClick={() => setModal("review")}><Plus size={15} /> New</Btn>}>
        {(reviews.data?.reviews || []).map((r) => (<div key={r._id} className="border-b border-slate-50 py-2 text-sm last:border-0"><div className="flex items-center justify-between"><span className="font-semibold">{r.period}</span><StatusBadge status={r.status} /></div><p className="flex items-center gap-1 text-xs text-slate-500"><Star size={12} className="fill-amber-400 text-amber-400" /> {r.overall}/5</p></div>))}
        {reviews.data && !reviews.data.reviews.length && <p className="py-4 text-center text-sm text-slate-400">None yet</p>}
      </Card>
      <Card title="Goals" action={<Btn variant="soft" onClick={() => setModal("goal")}><Plus size={15} /> New</Btn>}>
        {(goals.data?.goals || []).map((g) => (<div key={g._id} className="border-b border-slate-50 py-2 text-sm last:border-0"><p className="font-semibold">{g.title}</p><div className="mt-1 h-1.5 rounded-full bg-slate-100"><div className="h-full rounded-full bg-orange-500" style={{ width: `${g.progress}%` }} /></div><p className="mt-0.5 text-xs text-slate-400">{g.progress}%{g.dueDate ? ` · due ${fmtDate(g.dueDate)}` : ""}</p></div>))}
        {goals.data && !goals.data.goals.length && <p className="py-4 text-center text-sm text-slate-400">None yet</p>}
      </Card>
      <Card title="Notices" action={<Btn variant="soft" onClick={() => setModal("case")}><ShieldAlert size={15} /> Issue</Btn>}>
        {(cases.data?.cases || []).map((c) => (<div key={c._id} className="border-b border-slate-50 py-2 text-sm last:border-0"><div className="flex items-center justify-between gap-2"><span className="truncate font-semibold">{c.subject}</span><StatusBadge status={c.status} /></div><p className="text-xs text-slate-400">{c.type} · {fmtDate(c.createdAt)}</p></div>))}
        {cases.data && !cases.data.cases.length && <p className="py-4 text-center text-sm text-slate-400">None</p>}
      </Card>
      <ReviewModal open={modal === "review"} employee={e} onClose={() => setModal(null)} onSaved={reload} />
      <GoalModal open={modal === "goal"} employee={e} onClose={() => setModal(null)} onSaved={reload} />
      <CaseModal open={modal === "case"} employee={e} onClose={() => setModal(null)} onSaved={reload} />
    </div>
  );
}

function ActivityTab({ id }) {
  const { data, loading } = useAsync(() => hrApi.activity(id), [id]);
  if (loading) return <Spinner />;
  if (!data.items.length) return <Empty title="No activity yet" />;
  return (
    <Card title="Timeline">
      <ol className="relative space-y-4 border-l border-slate-200 pl-5">
        {data.items.map((a) => (<li key={a._id} className="relative"><span className="absolute -left-[27px] top-1 h-3 w-3 rounded-full border-2 border-white bg-orange-500" /><p className="text-sm font-semibold">{a.action}</p>{a.detail && <p className="text-sm text-slate-500">{a.detail}</p>}<p className="text-xs text-slate-400">{fmtDateTime(a.createdAt)} · {a.actor}</p></li>))}
      </ol>
    </Card>
  );
}

function StatusModal({ open, onClose, e, onDone }) {
  const options = { Active: ["OnLeave", "Suspended", "Terminated", "Resigned"], OnLeave: ["Active", "Suspended", "Terminated", "Resigned"], Suspended: ["Active", "Terminated", "Resigned"], Terminated: ["Active"], Resigned: ["Active"] }[e.status] || [];
  const [f, setF] = useState({ status: options[0], reason: "", effectiveDate: today() });
  const [busy, setBusy] = useState(false);
  const ending = ["Terminated", "Resigned"].includes(f.status);
  const submit = async (ev) => {
    ev.preventDefault(); setBusy(true);
    try { await hrApi.setStatus(e._id, f); toast.success(`Status changed to ${f.status}`); onDone(); } catch (err) { toastErr(err); } finally { setBusy(false); }
  };
  return (
    <Modal open={open} onClose={onClose} title={`Change status for ${e.firstName}`}>
      <form onSubmit={submit} className="space-y-4">
        <Field label="New status"><select className={inputCls} value={f.status} onChange={(x) => setF({ ...f, status: x.target.value })}>{options.map((o) => <option key={o} value={o}>{o === "OnLeave" ? "On leave" : o === "Active" ? (["Terminated", "Resigned"].includes(e.status) ? "Reinstate" : "Active") : o}</option>)}</select></Field>
        {ending && <Field label="Effective date"><input type="date" className={inputCls} value={f.effectiveDate} onChange={(x) => setF({ ...f, effectiveDate: x.target.value })} /></Field>}
        <Field label="Reason" hint={f.status === "Active" ? "Optional" : "Required. The employee is told straight away."}><textarea rows={3} className={inputCls} value={f.reason} onChange={(x) => setF({ ...f, reason: x.target.value })} /></Field>
        {ending && <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">An offboarding checklist (equipment, exit interview, final pay, access) is created automatically.</p>}
        <div className="flex justify-end gap-2"><Btn type="button" variant="ghost" onClick={onClose}>Cancel</Btn><Btn variant={ending ? "danger" : "primary"} loading={busy}>Confirm</Btn></div>
      </form>
    </Modal>
  );
}