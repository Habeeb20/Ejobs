import { useState } from "react";
import { Plus, Star, Trash2, Send, ShieldAlert, Target, Award } from "lucide-react";
import { toast } from "sonner";
import { hrApi } from "./hrApi";
import { Btn, Card, Avatar, Badge, StatusBadge, Tabs, Modal, Spinner, Empty, Field, inputCls, useAsync, useHrEvents, fmtDate, fullName, toastErr,
} from "./hrUi";

const CRITERIA = ["Quality of work", "Productivity", "Teamwork", "Communication", "Punctuality and reliability", "Initiative", "Job knowledge"];
const CASE_TYPES = ["Verbal warning", "Written warning", "Final warning", "Query", "Suspension notice", "Commendation"];

// Picks the employee when the modal isn't opened from a profile
const EmployeePick = ({ value, onChange, employees }) => (
  <Field label="Employee"><select required className={inputCls} value={value} onChange={(e) => onChange(e.target.value)}><option value="">Select…</option>{employees.map((e) => <option key={e._id} value={e._id}>{fullName(e)} ({e.staffId})</option>)}</select></Field>
);
const useStaff = (open) => { const r = useAsync(() => (open ? hrApi.employees({ status: "current", limit: 100 }) : Promise.resolve({ data: {} })), [open], { soft: true }); return r.data?.employees || []; };

export function ReviewModal({ open, employee, review, onClose, onSaved }) {
  const staff = useStaff(open && !employee);
  const init = () => ({ employee: employee?._id || review?.employee?._id || "", period: review?.period || "", strengths: review?.strengths || "", improvements: review?.improvements || "", comments: review?.comments || "", nextGoals: review?.nextGoals || "",
    ratings: CRITERIA.map((c) => ({ criterion: c, score: review?.ratings?.find((r) => r.criterion === c)?.score || 3, comment: review?.ratings?.find((r) => r.criterion === c)?.comment || "" })) });
  const [f, setF] = useState(init);
  const [busy, setBusy] = useState(false);
  const avg = (f.ratings.reduce((s, r) => s + r.score, 0) / f.ratings.length).toFixed(1);
  const save = async (e) => {
    e.preventDefault(); setBusy(true);
    try { review ? await hrApi.updateReview(review._id, f) : await hrApi.createReview(f); toast.success("Review saved as a draft. Publish it when you're ready."); onSaved(); }
    catch (err) { toastErr(err); } finally { setBusy(false); }
  };
  return (
    <Modal open={open} onClose={onClose} title={review ? "Edit review" : "New performance review"} wide>
      <form onSubmit={save} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">{!employee && !review && <EmployeePick value={f.employee} onChange={(v) => setF({ ...f, employee: v })} employees={staff} />}
          <Field label="Review period"><input required className={inputCls} placeholder="H1 2026" value={f.period} onChange={(e) => setF({ ...f, period: e.target.value })} /></Field></div>
        <div className="space-y-3 rounded-2xl bg-slate-50 p-4">
          <div className="flex items-center justify-between"><p className="text-sm font-bold">Ratings</p><p className="flex items-center gap-1 text-sm font-semibold"><Star size={14} className="fill-amber-400 text-amber-400" /> {avg} / 5</p></div>
          {f.ratings.map((r, i) => (
            <div key={r.criterion} className="grid items-center gap-2 sm:grid-cols-[200px_1fr]"><span className="text-sm">{r.criterion}</span>
              <div className="flex items-center gap-1">{[1, 2, 3, 4, 5].map((n) => (<button type="button" key={n} aria-label={`${n} stars`} onClick={() => setF({ ...f, ratings: f.ratings.map((x, j) => (j === i ? { ...x, score: n } : x)) })}><Star size={22} className={n <= r.score ? "fill-amber-400 text-amber-400" : "text-slate-300"} /></button>))}</div></div>
          ))}
        </div>
        <Field label="Strengths"><textarea rows={2} className={inputCls} value={f.strengths} onChange={(e) => setF({ ...f, strengths: e.target.value })} /></Field>
        <Field label="Areas to improve"><textarea rows={2} className={inputCls} value={f.improvements} onChange={(e) => setF({ ...f, improvements: e.target.value })} /></Field>
        <Field label="Overall comments"><textarea rows={2} className={inputCls} value={f.comments} onChange={(e) => setF({ ...f, comments: e.target.value })} /></Field>
        <Field label="Goals for next period"><textarea rows={2} className={inputCls} value={f.nextGoals} onChange={(e) => setF({ ...f, nextGoals: e.target.value })} /></Field>
        <div className="flex justify-end gap-2"><Btn type="button" variant="ghost" onClick={onClose}>Cancel</Btn><Btn loading={busy}>Save draft</Btn></div>
      </form>
    </Modal>
  );
}

export function GoalModal({ open, employee, onClose, onSaved }) {
  const staff = useStaff(open && !employee);
  const [f, setF] = useState({ employee: employee?._id || "", title: "", description: "", dueDate: "" });
  const [busy, setBusy] = useState(false);
  const save = async (e) => { e.preventDefault(); setBusy(true); try { await hrApi.createGoal({ ...f, dueDate: f.dueDate || undefined }); toast.success("Goal assigned. The employee was notified."); onSaved(); } catch (err) { toastErr(err); } finally { setBusy(false); } };
  return (
    <Modal open={open} onClose={onClose} title="Assign a goal">
      <form onSubmit={save} className="space-y-4">
        {!employee && <EmployeePick value={f.employee} onChange={(v) => setF({ ...f, employee: v })} employees={staff} />}
        <Field label="Goal"><input required className={inputCls} value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="Close 20 new accounts" /></Field>
        <Field label="Details"><textarea rows={3} className={inputCls} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></Field>
        <Field label="Due date"><input type="date" className={inputCls} value={f.dueDate} onChange={(e) => setF({ ...f, dueDate: e.target.value })} /></Field>
        <div className="flex justify-end gap-2"><Btn type="button" variant="ghost" onClick={onClose}>Cancel</Btn><Btn loading={busy}>Assign goal</Btn></div>
      </form>
    </Modal>
  );
}

export function CaseModal({ open, employee, onClose, onSaved }) {
  const staff = useStaff(open && !employee);
  const [f, setF] = useState({ employee: employee?._id || "", type: "Query", subject: "", details: "", incidentDate: "", requiresResponse: true });
  const [busy, setBusy] = useState(false);
  const save = async (e) => { e.preventDefault(); setBusy(true); try { await hrApi.createCase(f); toast.success("Notice sent. The employee sees it instantly and was emailed."); onSaved(); } catch (err) { toastErr(err); } finally { setBusy(false); } };
  return (
    <Modal open={open} onClose={onClose} title="Issue a notice">
      <form onSubmit={save} className="space-y-4">
        {!employee && <EmployeePick value={f.employee} onChange={(v) => setF({ ...f, employee: v })} employees={staff} />}
        <div className="grid gap-4 sm:grid-cols-2"><Field label="Type"><select className={inputCls} value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })}>{CASE_TYPES.map((t) => <option key={t}>{t}</option>)}</select></Field>
          <Field label="Incident date"><input type="date" className={inputCls} value={f.incidentDate} onChange={(e) => setF({ ...f, incidentDate: e.target.value })} /></Field></div>
        <Field label="Subject"><input required className={inputCls} value={f.subject} onChange={(e) => setF({ ...f, subject: e.target.value })} /></Field>
        <Field label="Details"><textarea required rows={5} className={inputCls} value={f.details} onChange={(e) => setF({ ...f, details: e.target.value })} /></Field>
        {f.type !== "Commendation" && <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="accent-orange-600" checked={f.requiresResponse} onChange={(e) => setF({ ...f, requiresResponse: e.target.checked })} /> Ask the employee to respond</label>}
        <div className="flex justify-end gap-2"><Btn type="button" variant="ghost" onClick={onClose}>Cancel</Btn><Btn loading={busy}>Send notice</Btn></div>
      </form>
    </Modal>
  );
}

function HrPerformance() {
  const [tab, setTab] = useState("reviews");
  const [modal, setModal] = useState(null); // "review" | "goal" | "case" | { review }
  const reviews = useAsync(() => hrApi.reviews({}), []);
  const goals = useAsync(() => hrApi.goals({}), []);
  const cases = useAsync(() => hrApi.cases({}), []);
  const reload = () => { reviews.reload(); goals.reload(); cases.reload(); setModal(null); };
  useHrEvents(["review", "goal", "case"], () => { reviews.reload(); goals.reload(); cases.reload(); });
  const Person = ({ e }) => (<div className="flex min-w-0 items-center gap-3"><Avatar name={fullName(e)} src={e?.photo} /><div className="min-w-0"><p className="truncate font-semibold">{fullName(e)}</p><p className="truncate text-xs text-slate-400">{e?.jobTitle}</p></div></div>);

  const publish = async (r) => { try { await hrApi.publishReview(r._id); toast.success("Published. The employee was notified."); reload(); } catch (err) { toastErr(err); } };
  const delReview = async (r) => { if (!window.confirm("Delete this draft?")) return; try { await hrApi.deleteReview(r._id); reload(); } catch (err) { toastErr(err); } };
  const delGoal = async (g) => { try { await hrApi.deleteGoal(g._id); reload(); } catch (err) { toastErr(err); } };
  const closeCase = async (c) => { try { await hrApi.closeCase(c._id); reload(); } catch (err) { toastErr(err); } };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs value={tab} onChange={setTab} tabs={[["reviews", "Reviews"], ["goals", "Goals"], ["notices", "Notices", (cases.data?.cases || []).filter((c) => c.status === "Responded").length]]} />
        <Btn onClick={() => setModal(tab === "reviews" ? "review" : tab === "goals" ? "goal" : "case")}><Plus size={16} /> {tab === "reviews" ? "New review" : tab === "goals" ? "Assign goal" : "Issue notice"}</Btn>
      </div>

      {tab === "reviews" && (!reviews.data ? <Spinner /> : !reviews.data.reviews.length ? <Empty icon={Award} title="No reviews yet" text="Rate your team on clear criteria, publish, and they see it immediately and can add their own comments." /> : (
        <div className="grid gap-3 lg:grid-cols-2">{reviews.data.reviews.map((r) => (
          <Card key={r._id}><div className="flex items-start justify-between gap-2"><Person e={r.employee} /><StatusBadge status={r.status} /></div>
            <p className="mt-3 flex items-center gap-2 text-sm"><strong>{r.period}</strong><span className="flex items-center gap-1 text-slate-500"><Star size={14} className="fill-amber-400 text-amber-400" /> {r.overall}/5</span></p>
            {r.employeeComment && <p className="mt-2 rounded-xl bg-slate-50 p-3 text-sm"><span className="font-semibold">Employee comment: </span>{r.employeeComment}</p>}
            <div className="mt-3 flex flex-wrap gap-2">{r.status === "Draft" && <><Btn variant="outline" onClick={() => setModal({ review: r })}>Edit</Btn><Btn onClick={() => publish(r)}><Send size={15} /> Publish</Btn><Btn variant="ghost" onClick={() => delReview(r)}><Trash2 size={15} /></Btn></>}</div>
          </Card>))}</div>
      ))}

      {tab === "goals" && (!goals.data ? <Spinner /> : !goals.data.goals.length ? <Empty icon={Target} title="No goals yet" text="Assign goals with due dates. Employees update their progress and you see it live." /> : (
        <div className="grid gap-3 lg:grid-cols-2">{goals.data.goals.map((g) => (
          <Card key={g._id}><div className="flex items-start justify-between gap-2"><Person e={g.employee} /><StatusBadge status={g.status} /></div>
            <p className="mt-3 font-semibold">{g.title}</p>{g.description && <p className="text-sm text-slate-500">{g.description}</p>}
            <div className="mt-3 h-2 rounded-full bg-slate-100"><div className="h-full rounded-full bg-orange-500 transition-all" style={{ width: `${g.progress}%` }} /></div>
            <div className="mt-1 flex justify-between text-xs text-slate-400"><span>{g.progress}%{g.createdBy === "employee" ? " · set by employee" : ""}</span><span>{g.dueDate ? `Due ${fmtDate(g.dueDate)}` : ""}</span></div>
            <div className="mt-2 text-right"><button onClick={() => delGoal(g)} className="text-xs text-red-600">Delete</button></div></Card>))}</div>
      ))}

      {tab === "notices" && (!cases.data ? <Spinner /> : !cases.data.cases.length ? <Empty icon={ShieldAlert} title="No notices" text="Warnings, queries and commendations are recorded here and delivered to the employee instantly." /> : (
        <div className="space-y-3">{cases.data.cases.map((c) => (
          <Card key={c._id}><div className="flex flex-wrap items-start justify-between gap-2"><Person e={c.employee} /><div className="flex gap-2"><Badge tone={c.type === "Commendation" ? "green" : "orange"}>{c.type}</Badge><StatusBadge status={c.status} /></div></div>
            <p className="mt-3 font-semibold">{c.subject}</p><p className="whitespace-pre-line text-sm text-slate-600">{c.details}</p>
            {c.response && <p className="mt-3 rounded-xl bg-sky-50 p-3 text-sm"><span className="font-semibold">Response: </span>{c.response}</p>}
            <div className="mt-3 flex items-center justify-between text-xs text-slate-400"><span>{fmtDate(c.createdAt)}</span>{c.status !== "Closed" && <Btn variant="outline" onClick={() => closeCase(c)}>Close notice</Btn>}</div></Card>))}</div>
      ))}

      <ReviewModal key={modal?.review?._id || "new-review"} open={modal === "review" || !!modal?.review} review={modal?.review} onClose={() => setModal(null)} onSaved={reload} />
      <GoalModal open={modal === "goal"} onClose={() => setModal(null)} onSaved={reload} />
      <CaseModal open={modal === "case"} onClose={() => setModal(null)} onSaved={reload} />
    </div>
  );
}

export default HrPerformance;