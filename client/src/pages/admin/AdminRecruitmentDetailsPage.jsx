// src/pages/admin/AdminRecruitmentDetailPage.jsx   route: /admin/recruitment/:id
import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, FileText, Plus, Search, Trash2 } from "lucide-react";
import recruitmentApi from "../recruitment/recruitmentApi";
import {
  Badge, Empty, Field, Modal, Notice, Panel, Spinner, Tabs, inputCls, btnPrimary, btnGhost, btnDanger, btnSmall,
  apiError, fmtDate, fmtDateTime, humanize, money, personName,
} from "../recruitment/ui";

const api = recruitmentApi.admin;
const STATUS_FLOW = {
  AwaitingPayment: ["Cancelled"], Active: ["Suspended", "Completed", "Cancelled"],
  Suspended: ["Active", "Cancelled"], Completed: ["Active"], Cancelled: [],
};
const CHECK_STATUSES = ["Pending", "InProgress", "Passed", "Failed", "NotApplicable"];
const toLocalInput = (d) => {
  if (!d) return "";
  const x = new Date(d);
  return new Date(x.getTime() - x.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};

export default function AdminRecruitmentDetailPage() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [tab, setTab] = useState("pipeline");
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(null);
  const [adding, setAdding] = useState(false);
  const [statusChange, setStatusChange] = useState(null);

  const load = useCallback(async () => {
    try { setData(await api.request(id)); setError(""); } catch (e) { setError(apiError(e)); }
  }, [id]);
  useEffect(() => { load(); }, [load]);

  if (error && !data) return <div className="mx-auto max-w-3xl p-6"><Notice tone="error">{error}</Notice></div>;
  if (!data) return <Spinner />;
  const { request: r, payments, changes, replacements, quota } = data;
  const approvedReplacements = replacements.filter((x) => x.status === "Approved");
  const hired = r.candidates.filter((c) => c.stage === "Hired").length;
  const submitted = r.candidates.filter((c) => c.submittedAt && !c.replacementFor).length;
  const screened = r.candidates.filter((c) => c.screenedAt && !c.replacementFor).length;
  const limits = r.planSnapshot?.limits || {};

  const tabs = [
    { key: "pipeline", label: "Pipeline", count: 0 },
    { key: "brief", label: "Brief and limits" },
    { key: "payments", label: "Payments and changes", count: payments.filter((p) => p.status === "Pending" && p.submittedAt).length },
    { key: "documents", label: "Documents" },
    { key: "activity", label: "Activity" },
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <Link to="/admin/recruitment" className="mb-4 inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900"><ArrowLeft className="h-4 w-4" /> Recruitment</Link>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">{r.jobTitle}</h1>
          <p className="mt-1 text-sm text-gray-500">
            {r.reference} · {r.planName} · {personName(r.employer)} ({r.employer?.email}{r.employer?.phone && `, ${r.employer.phone}`})
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge status={r.status} />
          {(STATUS_FLOW[r.status] || []).map((s) => (
            <button key={s} className={`${btnGhost} ${btnSmall}`} onClick={() => setStatusChange(s)}>
              {s === "Active" ? (r.status === "Completed" ? "Reopen" : "Resume") : s === "Suspended" ? "Put on hold" : s === "Completed" ? "Mark complete" : "Cancel request"}
            </button>
          ))}
        </div>
      </div>

      {error && <div className="mb-4"><Notice tone="error">{error}</Notice></div>}
      {r.status === "AwaitingPayment" && <div className="mb-6"><Notice tone="warn">Waiting for the upfront payment of {money(r.fees.upfront, r.fees.currency)}. Candidates can be added once it is confirmed.</Notice></div>}

      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          ["Screened", `${screened}${limits.screenMax ? ` of ${limits.screenMax}` : ""}`],
          ["Shared with client", `${submitted} of ${limits.shortlistMax}`],
          ["Hired", `${hired} of ${limits.hireTarget}`],
          ["Replacements used", `${quota.used} of ${quota.allowed}`],
        ].map(([k, v]) => (
          <div key={k} className="rounded-xl border border-gray-200 bg-white p-4"><p className="text-sm text-gray-500">{k}</p><p className="mt-1 text-xl font-bold text-gray-900">{v}</p></div>
        ))}
      </div>

      <Tabs tabs={tabs} value={tab} onChange={setTab} />

      {/* ---------------- pipeline ---------------- */}
      {tab === "pipeline" && (
        <div>
          <div className="mb-4 flex items-center justify-between gap-3">
            <p className="text-sm text-gray-600">Candidates become visible to the client once they are submitted.</p>
            {["Active", "Completed"].includes(r.status) && <button className={btnPrimary} onClick={() => setAdding(true)}><Plus className="h-4 w-4" /> Add candidate</button>}
          </div>
          {r.candidates.length === 0 ? <Empty title="No candidates yet" text="Search jobseekers on the platform and add the ones that match this brief." /> : (
            <ul className="space-y-3">
              {r.candidates.map((c) => {
                const done = c.checks.filter((k) => ["Passed", "NotApplicable"].includes(k.status)).length;
                return (
                  <li key={c._id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white p-4">
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-900">{c.name} {c.replacementFor && <Badge tone="blue">Replacement</Badge>}</p>
                      <p className="text-sm text-gray-500">{[c.headline, c.email, c.phone].filter(Boolean).join(" · ")}</p>
                      <p className="mt-1 text-sm text-gray-600">Checks {done}/{c.checks.length}{c.interview?.scheduledAt && ` · interview ${fmtDateTime(c.interview.scheduledAt)}`}{c.interviewRequestedAt && !c.interview?.scheduledAt && " · client asked to interview"}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge status={c.stage} />
                      <button className={`${btnGhost} ${btnSmall}`} onClick={() => setEditing(c)}>Manage</button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}

      {/* ---------------- brief & limits ---------------- */}
      {tab === "brief" && <BriefTab request={r} onSaved={load} />}

      {/* ---------------- payments & changes ---------------- */}
      {tab === "payments" && (
        <div className="space-y-6">
          <Panel title="Payments" action={<Link to="/admin/recruitment" className="text-sm font-medium text-orange-700 hover:underline">Confirm in the payments queue</Link>}>
            <ul className="divide-y divide-gray-100 text-sm">
              {payments.map((p) => (
                <li key={p._id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div><p className="font-medium text-gray-900">{humanize(p.kind)} · {money(p.amount, p.currency)}</p><p className="text-gray-500">{p.submittedAt ? `Reference ${p.reference}, submitted ${fmtDateTime(p.submittedAt)}` : "No transfer details yet"}{p.paidAt && ` · paid ${fmtDate(p.paidAt)}`}</p></div>
                  <Badge status={p.status} />
                </li>
              ))}
            </ul>
            <p className="mt-3 text-sm text-gray-600">Total {money(r.fees.total, r.fees.currency)} · confirmed {money(r.fees.paid, r.fees.currency)}</p>
          </Panel>
          <Panel title="Change requests">
            {changes.length === 0 ? <p className="text-sm text-gray-500">None.</p> : (
              <ul className="divide-y divide-gray-100 text-sm">
                {changes.map((c) => <li key={c._id} className="flex flex-wrap items-start justify-between gap-3 py-3"><div><p className="font-medium text-gray-900">{humanize(c.type)} · {money(c.fee)}</p><p className="text-gray-600">{c.description}</p></div><Badge status={c.status} /></li>)}
              </ul>
            )}
          </Panel>
          <Panel title="Replacement requests">
            {replacements.length === 0 ? <p className="text-sm text-gray-500">None.</p> : (
              <ul className="divide-y divide-gray-100 text-sm">
                {replacements.map((x) => <li key={x._id} className="flex flex-wrap items-start justify-between gap-3 py-3"><div><p className="font-medium text-gray-900">{x.candidateName}</p><p className="text-gray-600">{x.reasonLabel}</p></div><Badge status={x.status} /></li>)}
              </ul>
            )}
          </Panel>
        </div>
      )}

      {tab === "documents" && <DocumentsTab request={r} onChanged={load} />}
      {tab === "activity" && <ActivityTab request={r} onChanged={load} />}

      {/* ---------------- modals ---------------- */}
      {adding && <AddCandidateModal request={r} replacements={approvedReplacements} onClose={() => setAdding(false)} onDone={() => { setAdding(false); load(); }} />}
      {editing && r.candidates.some((c) => c._id === editing._id) && <CandidateEditor request={r} cand={r.candidates.find((c) => c._id === editing._id)} onClose={() => setEditing(null)} onDone={() => { load(); }} onRemoved={() => { setEditing(null); load(); }} />}
      {statusChange && <StatusModal request={r} to={statusChange} onClose={() => setStatusChange(null)} onDone={() => { setStatusChange(null); load(); }} />}
    </div>
  );
}

/* ------------------------------------------------------------------ */
function StatusModal({ request, to, onClose, onDone }) {
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const needsReason = ["Suspended", "Cancelled"].includes(to);
  const go = async () => {
    setBusy(true); setErr("");
    try { await api.updateRequest(request._id, { status: to, statusReason: reason }); onDone(); } catch (e) { setErr(apiError(e)); setBusy(false); }
  };
  return (
    <Modal open title={`Set request to ${humanize(to).toLowerCase()}`} onClose={onClose}
      footer={<><button className={btnGhost} onClick={onClose}>Back</button><button className={to === "Cancelled" ? btnDanger : btnPrimary} disabled={busy || (needsReason && reason.trim().length < 3)} onClick={go}>{busy ? "Saving" : "Confirm"}</button></>}>
      {err && <Notice tone="error">{err}</Notice>}
      <p className="text-sm text-gray-700">The employer is emailed about this change.</p>
      <Field label={needsReason ? "Reason (shown to the employer)" : "Note (optional)"}><textarea className={inputCls} rows={3} value={reason} onChange={(e) => setReason(e.target.value)} maxLength={300} /></Field>
    </Modal>
  );
}

/* ------------------------------------------------------------------ */
function AddCandidateModal({ request, replacements, onClose, onDone }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState([]);
  const [picked, setPicked] = useState(null);
  const [form, setForm] = useState({ headline: "", yearsExperience: "", summary: "", replacementId: "" });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (picked || q.trim().length < 2) { setResults([]); return undefined; }
    const t = setTimeout(() => api.searchJobseekers(q.trim()).then((r) => setResults(r.users)).catch(() => {}), 250);
    return () => clearTimeout(t);
  }, [q, picked]);

  const submit = async () => {
    setBusy(true); setErr("");
    try { await api.addCandidate(request._id, { userId: picked._id, ...form }); onDone(); } catch (e) { setErr(apiError(e)); setBusy(false); }
  };
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  return (
    <Modal open title="Add a candidate" onClose={onClose}
      footer={<><button className={btnGhost} onClick={onClose}>Cancel</button><button className={btnPrimary} disabled={!picked || busy} onClick={submit}>{busy ? "Adding" : "Add to pipeline"}</button></>}>
      {err && <Notice tone="error">{err}</Notice>}
      {!picked ? (
        <>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-gray-400" aria-hidden />
            <input className={`${inputCls} pl-9`} placeholder="Search jobseekers by name, email or phone" value={q} onChange={(e) => setQ(e.target.value)} autoFocus aria-label="Search jobseekers" />
          </div>
          <ul className="divide-y divide-gray-100 rounded-lg border border-gray-100">
            {results.map((u) => (
              <li key={u._id}><button className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left text-sm hover:bg-gray-50" onClick={() => setPicked(u)}>
                <span><span className="block font-medium text-gray-900">{personName(u)}</span><span className="text-gray-500">{[u.email, u.phone, u.state].filter(Boolean).join(" · ")}</span></span>
                <span className="text-orange-700">Select</span>
              </button></li>
            ))}
            {q.trim().length >= 2 && results.length === 0 && <li className="px-3 py-4 text-sm text-gray-500">No jobseekers found.</li>}
          </ul>
        </>
      ) : (
        <>
          <p className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 text-sm"><span className="font-medium text-gray-900">{personName(picked)}</span><button className="text-orange-700 underline" onClick={() => setPicked(null)}>Change</button></p>
          <Field label="Headline" hint="e.g. Chartered accountant, 8 years in banking"><input className={inputCls} value={form.headline} onChange={set("headline")} maxLength={160} /></Field>
          <Field label="Years of experience"><input className={inputCls} type="number" min="0" value={form.yearsExperience} onChange={set("yearsExperience")} /></Field>
          <Field label="Profile summary (visible to the client once submitted)"><textarea className={inputCls} rows={4} value={form.summary} onChange={set("summary")} maxLength={4000} /></Field>
          {replacements.length > 0 && (
            <Field label="Is this a replacement?">
              <select className={inputCls} value={form.replacementId} onChange={set("replacementId")}>
                <option value="">No, a regular candidate</option>
                {replacements.map((x) => <option key={x._id} value={x._id}>Replacing {x.candidateName}</option>)}
              </select>
            </Field>
          )}
        </>
      )}
    </Modal>
  );
}

/* ------------------------------------------------------------------ */
function CandidateEditor({ request, cand, onClose, onDone, onRemoved }) {
  const [f, setF] = useState(() => ({
    headline: cand.headline || "", yearsExperience: cand.yearsExperience ?? "", summary: cand.summary || "", adminNotes: cand.adminNotes || "",
    checks: cand.checks.map((c) => ({ key: c.key, label: c.label, status: c.status, note: c.note || "", reportUrl: c.reportUrl || "" })),
    scheduledAt: toLocalInput(cand.interview?.scheduledAt), mode: cand.interview?.mode || "Video", location: cand.interview?.location || "",
    interviewStatus: cand.interview?.status || "Scheduled",
    stage: cand.stage, reason: "", startDate: "",
  }));
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [saved, setSaved] = useState(false);

  const setCheck = (key, patch) => setF((x) => ({ ...x, checks: x.checks.map((c) => (c.key === key ? { ...c, ...patch } : c)) }));
  const stages = [cand.stage, ...(cand.nextStages || [])];
  const needsReason = ["Rejected", "Withdrawn"].includes(f.stage) && f.stage !== cand.stage;
  const needsStart = f.stage === "Hired" && cand.stage !== "Hired";

  const save = async () => {
    setBusy(true); setErr(""); setSaved(false);
    try {
      const body = {
        headline: f.headline, yearsExperience: f.yearsExperience, summary: f.summary, adminNotes: f.adminNotes, checks: f.checks,
      };
      if (f.scheduledAt) body.interview = { scheduledAt: new Date(f.scheduledAt).toISOString(), mode: f.mode, location: f.location, status: f.interviewStatus };
      if (f.stage !== cand.stage) { body.stage = f.stage; body.reason = f.reason; body.startDate = f.startDate; }
      await api.updateCandidate(request._id, cand._id, body);
      setSaved(true); onDone();
      setF((x) => ({ ...x, reason: "", startDate: "" }));
    } catch (e) { setErr(apiError(e)); } finally { setBusy(false); }
  };

  const remove = async () => {
    if (!window.confirm(`Remove ${cand.name} from this request?`)) return;
    try { await api.removeCandidate(request._id, cand._id); onRemoved(); } catch (e) { setErr(apiError(e)); }
  };

  return (
    <Modal open wide title={cand.name} onClose={onClose}
      footer={<>
        {!cand.submittedAt && <button className={`${btnGhost} mr-auto !text-red-700`} onClick={remove}><Trash2 className="h-4 w-4" /> Remove</button>}
        <button className={btnGhost} onClick={onClose}>Close</button>
        <button className={btnPrimary} disabled={busy || (needsReason && f.reason.trim().length < 3) || (needsStart && !f.startDate)} onClick={save}>{busy ? "Saving" : "Save changes"}</button>
      </>}>
      {err && <Notice tone="error">{err}</Notice>}
      {saved && <Notice tone="success">Saved.</Notice>}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Headline"><input className={inputCls} value={f.headline} onChange={(e) => setF({ ...f, headline: e.target.value })} maxLength={160} /></Field>
        <Field label="Years of experience"><input className={inputCls} type="number" min="0" value={f.yearsExperience} onChange={(e) => setF({ ...f, yearsExperience: e.target.value })} /></Field>
        <Field label="Profile summary (client sees this)" className="sm:col-span-2"><textarea className={inputCls} rows={4} value={f.summary} onChange={(e) => setF({ ...f, summary: e.target.value })} maxLength={4000} /></Field>
        <Field label="Private notes (never shown to the client)" className="sm:col-span-2"><textarea className={inputCls} rows={3} value={f.adminNotes} onChange={(e) => setF({ ...f, adminNotes: e.target.value })} maxLength={4000} /></Field>
      </div>

      <div>
        <h3 className="mb-2 text-sm font-semibold text-gray-900">Verification checks</h3>
        <p className="mb-3 text-xs text-gray-500">Every check must be passed or marked not applicable before the candidate can be submitted to the client.</p>
        <div className="space-y-3">
          {f.checks.map((c) => (
            <div key={c.key} className="grid gap-2 rounded-lg border border-gray-200 p-3 sm:grid-cols-[1fr_150px]">
              <p className="text-sm font-medium text-gray-900 sm:col-span-2">{c.label}</p>
              <select className={inputCls} value={c.status} onChange={(e) => setCheck(c.key, { status: e.target.value })} aria-label={`${c.label} status`}>{CHECK_STATUSES.map((s) => <option key={s} value={s}>{humanize(s)}</option>)}</select>
              <input className={inputCls} placeholder="Note" value={c.note} onChange={(e) => setCheck(c.key, { note: e.target.value })} aria-label={`${c.label} note`} />
              <input className={`${inputCls} sm:col-span-2`} placeholder="Report link (https://...)" value={c.reportUrl} onChange={(e) => setCheck(c.key, { reportUrl: e.target.value })} aria-label={`${c.label} report link`} />
            </div>
          ))}
          {f.checks.length === 0 && <p className="text-sm text-gray-500">This package has no checks.</p>}
        </div>
      </div>

      {cand.submittedAt && (
        <div>
          <h3 className="mb-2 text-sm font-semibold text-gray-900">Interview</h3>
          {cand.interviewRequestedAt && <p className="mb-2 text-xs text-gray-500">The client asked for an interview on {fmtDate(cand.interviewRequestedAt)}.</p>}
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Date and time"><input type="datetime-local" className={inputCls} value={f.scheduledAt} onChange={(e) => setF({ ...f, scheduledAt: e.target.value })} /></Field>
            <Field label="Mode"><select className={inputCls} value={f.mode} onChange={(e) => setF({ ...f, mode: e.target.value })}>{["Onsite", "Video", "Phone"].map((m) => <option key={m}>{m}</option>)}</select></Field>
            <Field label="Location or meeting link"><input className={inputCls} value={f.location} onChange={(e) => setF({ ...f, location: e.target.value })} maxLength={300} /></Field>
            <Field label="Interview status"><select className={inputCls} value={f.interviewStatus} onChange={(e) => setF({ ...f, interviewStatus: e.target.value })}>{["Scheduled", "Completed", "Cancelled"].map((m) => <option key={m}>{m}</option>)}</select></Field>
          </div>
        </div>
      )}

      <div>
        <h3 className="mb-2 text-sm font-semibold text-gray-900">Stage</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Move to">
            <select className={inputCls} value={f.stage} onChange={(e) => setF({ ...f, stage: e.target.value })} disabled={stages.length === 1}>
              {stages.map((s) => <option key={s} value={s}>{s === cand.stage ? `${s} (current)` : s}</option>)}
            </select>
          </Field>
          {needsStart && <Field label="Start date"><input type="date" className={inputCls} value={f.startDate} onChange={(e) => setF({ ...f, startDate: e.target.value })} /></Field>}
          {needsReason && <Field label="Reason" className="sm:col-span-2"><input className={inputCls} value={f.reason} onChange={(e) => setF({ ...f, reason: e.target.value })} maxLength={1000} /></Field>}
        </div>
        {f.stage === "Submitted" && cand.stage !== "Submitted" && <p className="mt-2 text-xs text-gray-500">Submitting shows this profile to the employer and emails them.</p>}
      </div>
    </Modal>
  );
}

/* ------------------------------------------------------------------ */
function BriefTab({ request: r, onSaved }) {
  const limits = r.planSnapshot?.limits || {};
  const [f, setF] = useState({ shortlistMax: limits.shortlistMax ?? "", screenMax: limits.screenMax ?? "", hireTarget: limits.hireTarget ?? "", dueDate: r.dueDate ? r.dueDate.slice(0, 10) : "" });
  const [msg, setMsg] = useState(null);
  const save = async () => {
    setMsg(null);
    const lim = {};
    ["shortlistMax", "screenMax", "hireTarget"].forEach((k) => { if (f[k] !== "" && Number(f[k]) !== limits[k]) lim[k] = Number(f[k]); });
    try {
      await api.updateRequest(r._id, { limits: Object.keys(lim).length ? lim : undefined, dueDate: f.dueDate || undefined });
      setMsg({ tone: "success", text: "Saved" }); onSaved();
    } catch (e) { setMsg({ tone: "error", text: apiError(e) }); }
  };
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Panel title="Employer's brief">
        <dl className="space-y-3 text-sm">
          <div><dt className="font-medium text-gray-900">Description</dt><dd className="mt-1 whitespace-pre-line text-gray-700">{r.description}</dd></div>
          {r.qualifications && <div><dt className="font-medium text-gray-900">Qualifications</dt><dd className="mt-1 whitespace-pre-line text-gray-700">{r.qualifications}</dd></div>}
          <div><dt className="font-medium text-gray-900">Skills</dt><dd className="text-gray-700">{r.skills?.join(", ") || "None listed"}</dd></div>
          <div className="grid grid-cols-2 gap-3"><div><dt className="font-medium text-gray-900">Experience</dt><dd className="text-gray-700">{r.experience || "Not specified"}</dd></div><div><dt className="font-medium text-gray-900">Location</dt><dd className="text-gray-700">{r.location || "Not specified"}</dd></div></div>
          <div className="grid grid-cols-2 gap-3"><div><dt className="font-medium text-gray-900">Type</dt><dd className="text-gray-700">{r.employmentType}</dd></div><div><dt className="font-medium text-gray-900">Annual salary</dt><dd className="text-gray-700">{r.annualSalary ? money(r.annualSalary) : "Not specified"}</dd></div></div>
          {r.hiringEngagement && <Notice>The employer asked us to handle the hiring process.</Notice>}
        </dl>
      </Panel>
      <Panel title="Package limits and dates">
        <p className="mb-4 text-sm text-gray-600">Raise a limit after an approved change request such as additional positions or sourcing.</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Candidates to submit (max)"><input className={inputCls} type="number" min="1" value={f.shortlistMax} onChange={(e) => setF({ ...f, shortlistMax: e.target.value })} /></Field>
          <Field label="Candidates to screen (max)"><input className={inputCls} type="number" min="1" value={f.screenMax} onChange={(e) => setF({ ...f, screenMax: e.target.value })} placeholder="No limit" /></Field>
          <Field label="Positions to fill"><input className={inputCls} type="number" min="1" value={f.hireTarget} onChange={(e) => setF({ ...f, hireTarget: e.target.value })} /></Field>
          <Field label="Target date"><input className={inputCls} type="date" value={f.dueDate} onChange={(e) => setF({ ...f, dueDate: e.target.value })} /></Field>
        </div>
        <div className="mt-4 flex items-center gap-3">
          <button className={btnPrimary} onClick={save}>Save</button>
          {msg && <span className={`text-sm ${msg.tone === "error" ? "text-red-700" : "text-green-700"}`}>{msg.text}</span>}
        </div>
      </Panel>
    </div>
  );
}

/* ------------------------------------------------------------------ */
function DocumentsTab({ request: r, onChanged }) {
  const [f, setF] = useState({ name: "", url: "", type: "Report" });
  const [err, setErr] = useState("");
  const add = async () => {
    setErr("");
    try { await api.addDocument(r._id, f); setF({ name: "", url: "", type: "Report" }); onChanged(); } catch (e) { setErr(apiError(e)); }
  };
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
      <div>
        {r.documents.length === 0 ? <Empty title="No documents shared yet" text="Share screening and verification reports with the employer here." /> : (
          <ul className="space-y-3">
            {r.documents.map((d) => (
              <li key={d._id} className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white p-4">
                <a href={d.url} target="_blank" rel="noreferrer" className="flex min-w-0 items-center gap-3 hover:text-orange-700"><FileText className="h-5 w-5 shrink-0 text-orange-600" /><span className="min-w-0"><span className="block truncate font-medium text-gray-900">{d.name}</span><span className="text-xs text-gray-500">{d.type} · {fmtDate(d.createdAt)}</span></span></a>
                <button aria-label={`Remove ${d.name}`} className="rounded-md p-2 text-gray-500 hover:bg-gray-100 hover:text-red-700" onClick={async () => { await api.removeDocument(r._id, d._id); onChanged(); }}><Trash2 className="h-4 w-4" /></button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <Panel title="Share a document">
        {err && <div className="mb-3"><Notice tone="error">{err}</Notice></div>}
        <div className="space-y-3">
          <Field label="Name"><input className={inputCls} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} maxLength={120} /></Field>
          <Field label="Link"><input className={inputCls} type="url" value={f.url} onChange={(e) => setF({ ...f, url: e.target.value })} placeholder="https://" /></Field>
          <Field label="Type"><select className={inputCls} value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })}>{["Report", "Assessment", "Verification", "Contract", "Other"].map((t) => <option key={t}>{t}</option>)}</select></Field>
          <button className={`${btnPrimary} w-full`} disabled={!f.name || !f.url} onClick={add}>Share with employer</button>
        </div>
      </Panel>
    </div>
  );
}

/* ------------------------------------------------------------------ */
function ActivityTab({ request: r, onChanged }) {
  const [text, setText] = useState("");
  const [visible, setVisible] = useState(false);
  const [err, setErr] = useState("");
  const add = async () => {
    setErr("");
    try { await api.addNote(r._id, { text, internal: !visible }); setText(""); setVisible(false); onChanged(); } catch (e) { setErr(apiError(e)); }
  };
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
      <Panel title="Activity">
        <ol className="space-y-4">
          {r.timeline.map((t, i) => (
            <li key={i} className="flex gap-3 text-sm">
              <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${t.internal ? "bg-gray-400" : "bg-orange-500"}`} aria-hidden />
              <div><p className="text-gray-800">{t.text}</p><p className="text-xs text-gray-500">{fmtDateTime(t.at)} · {t.actor}{t.actorName && ` (${t.actorName})`}{t.internal && " · internal"}</p></div>
            </li>
          ))}
        </ol>
      </Panel>
      <Panel title="Add a note">
        {err && <div className="mb-3"><Notice tone="error">{err}</Notice></div>}
        <textarea className={inputCls} rows={4} value={text} onChange={(e) => setText(e.target.value)} maxLength={1000} aria-label="Note" />
        <label className="mt-3 flex cursor-pointer gap-2 text-sm text-gray-700"><input type="checkbox" className="mt-0.5 h-4 w-4 rounded border-gray-300 text-orange-600" checked={visible} onChange={(e) => setVisible(e.target.checked)} /> Show this update to the employer</label>
        <button className={`${btnPrimary} mt-4 w-full`} disabled={!text.trim()} onClick={add}>Add note</button>
      </Panel>
    </div>
  );
}