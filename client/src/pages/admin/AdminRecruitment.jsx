// src/pages/admin/AdminRecruitment.jsx   dashboard tab: outsourcingAdmin
import { useCallback, useEffect, useState } from "react";
import { Search } from "lucide-react";
import recruitmentApi from "../recruitment/recruitmentApi";
import {
  Badge, Empty, Field, Modal, Notice, PageHeader, Spinner, Tabs, inputCls, btnPrimary, btnGhost, btnDanger, btnSmall,
  apiError, fmtDate, fmtDateTime, humanize, money, personName,
} from "../recruitment/ui";

const api = recruitmentApi.admin;

/** Opens a request inside the dashboard: ?tab=outsourcingDetail&id=... */
function ReqLink({ go, id, className = "text-[#B83A06] hover:underline", children }) {
  return <button type="button" className={`${className} text-left`} onClick={() => go("outsourcingDetail", { id })}>{children}</button>;
}

function Stat({ label, value, hint }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

export default function AdminRecruitment({ go }) {
  const [stats, setStats] = useState(null);
  const [tab, setTab] = useState("requests");
  const loadStats = useCallback(() => api.overview().then(setStats).catch(() => {}), []);
  useEffect(() => { loadStats(); }, [loadStats]);

  const tabs = [
    { key: "requests", label: "Requests" },
    { key: "payments", label: "Payments", count: stats?.pendingPayments || 0 },
    { key: "replacements", label: "Replacements", count: stats?.openReplacements || 0 },
    { key: "changes", label: "Change requests", count: stats?.openChanges || 0 },
    { key: "pricing", label: "Package pricing" },
  ];

  return (
    <div className="mx-auto w-full max-w-7xl py-2">
      <PageHeader title="Recruitment" subtitle="Manage employer requests, confirm payments and set package prices." />
      {stats && (
        <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-5">
          <Stat label="Awaiting payment" value={stats.byStatus.AwaitingPayment || 0} />
          <Stat label="Active" value={stats.byStatus.Active || 0} />
          <Stat label="Completed" value={stats.byStatus.Completed || 0} />
          <Stat label="Payments to confirm" value={stats.pendingPayments} />
          <Stat label="Confirmed revenue" value={money(stats.revenue)} hint={`${stats.onlineVerified || 0} paid online and verified`} />
        </div>
      )}
      <Tabs tabs={tabs} value={tab} onChange={setTab} />
      {tab === "requests" && <RequestsTab go={go} />}
      {tab === "payments" && <PaymentsTab go={go} onChanged={loadStats} />}
      {tab === "replacements" && <ReplacementsTab go={go} onChanged={loadStats} />}
      {tab === "changes" && <ChangesTab go={go} onChanged={loadStats} />}
      {tab === "pricing" && <PricingTab />}
    </div>
  );
}

/* ---------------- requests ---------------- */
function RequestsTab({ go }) {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [res, setRes] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const t = setTimeout(() => {
      api.requests({ q, status, page }).then(setRes).catch((e) => setError(apiError(e)));
    }, 250);
    return () => clearTimeout(t);
  }, [q, status, page]);

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-3">
        <div className="relative min-w-[14rem] flex-1">
          <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" aria-hidden />
          <input className={`${inputCls} pl-9`} placeholder="Search reference, job title or employer" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} aria-label="Search requests" />
        </div>
        <select className={`${inputCls} !w-auto`} value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} aria-label="Filter by status">
          <option value="">All statuses</option>
          {["AwaitingPayment", "Active", "Suspended", "Completed", "Cancelled"].map((s) => <option key={s} value={s}>{humanize(s)}</option>)}
        </select>
      </div>
      {error && <Notice tone="error">{error}</Notice>}
      {!res && !error && <Spinner />}
      {res && res.requests.length === 0 && <Empty title="No requests found" />}
      {res?.requests.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-slate-600">
              <tr>{["Request", "Employer", "Package", "Status", "Candidates", "Fee", "Ordered"].map((h) => <th key={h} className="px-4 py-3 font-medium">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {res.requests.map((r) => (
                <tr key={r._id} className="hover:bg-slate-50">
                  <td className="px-4 py-3"><ReqLink go={go} id={r._id} className="font-medium text-[#B83A06] hover:underline">{r.jobTitle}</ReqLink><p className="text-xs text-slate-500">{r.reference}</p></td>
                  <td className="px-4 py-3">{personName(r.employer)}<p className="text-xs text-slate-500">{r.employer?.email}</p></td>
                  <td className="px-4 py-3">{r.planName}</td>
                  <td className="px-4 py-3"><Badge status={r.status} /></td>
                  <td className="px-4 py-3">{r.counts.sourced} sourced · {r.counts.submitted} shared · {r.counts.hired}/{r.counts.target} hired</td>
                  <td className="px-4 py-3">{money(r.fees?.total, r.fees?.currency)}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{fmtDate(r.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {res && res.pages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm text-slate-600">
          <span>Page {res.page} of {res.pages} · {res.total} requests</span>
          <span className="flex gap-2">
            <button className={`${btnGhost} ${btnSmall}`} disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button>
            <button className={`${btnGhost} ${btnSmall}`} disabled={page >= res.pages} onClick={() => setPage(page + 1)}>Next</button>
          </span>
        </div>
      )}
    </div>
  );
}

/* ---------------- shared decision modal (note required for negative outcomes) ---------------- */
function NoteModal({ title, cta, danger, required = true, label = "Message to the client", onClose, onSubmit }) {
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const go = async () => {
    setBusy(true); setErr("");
    try { await onSubmit(note); } catch (e) { setErr(apiError(e)); setBusy(false); }
  };
  return (
    <Modal open title={title} onClose={onClose}
      footer={<><button className={btnGhost} onClick={onClose}>Cancel</button><button className={danger ? btnDanger : btnPrimary} disabled={busy || (required && note.trim().length < 3)} onClick={go}>{busy ? "Saving" : cta}</button></>}>
      {err && <Notice tone="error">{err}</Notice>}
      <Field label={label}><textarea className={inputCls} rows={4} value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} /></Field>
    </Modal>
  );
}

/* ---------------- payments ---------------- */
function PaymentsTab({ go, onChanged }) {
  const [status, setStatus] = useState("Pending");
  const [rows, setRows] = useState(null);
  const [error, setError] = useState("");
  const [decline, setDecline] = useState(null);
  const load = useCallback(() => api.payments({ status }).then((r) => setRows(r.payments)).catch((e) => setError(apiError(e))), [status]);
  useEffect(() => { setRows(null); load(); }, [load]);

  const confirm = async (p) => {
    const force = !p.submittedAt;
    if (force && !window.confirm("The client has not submitted transfer details. Confirm only if you have seen the money arrive. Continue?")) return;
    try { await api.decidePayment(p._id, { approve: true, force }); await load(); onChanged(); } catch (e) { setError(apiError(e)); }
  };

  return (
    <div>
      <div className="mb-4 flex gap-2">
        {["Pending", "Paid", "Failed"].map((s) => (
          <button key={s} onClick={() => setStatus(s)} className={`rounded-full px-3 py-1.5 text-sm ${status === s ? "bg-[#E4510B] text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`}>{s === "Failed" ? "Declined" : s}</button>
        ))}
      </div>
      {error && <Notice tone="error">{error}</Notice>}
      {!rows && !error && <Spinner />}
      {rows?.length === 0 && <Empty title="Nothing here" />}
      <ul className="space-y-3">
        {rows?.map((p) => (
          <li key={p._id} className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4">
            <div className="min-w-0 text-sm">
              <p className="font-semibold text-slate-900">{money(p.amount, p.currency)} <span className="font-normal text-slate-500">· {humanize(p.kind)}</span></p>
              <p className="text-slate-700"><ReqLink go={go} id={p.request?._id}>{p.request?.reference}</ReqLink> · {p.request?.jobTitle} · {personName(p.employer)}</p>
              {p.method === "paystack" && p.status === "Paid" && (
                <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-slate-600">
                  <Badge tone="green">Verified by Paystack</Badge>
                  <span>Ref <strong>{p.gateway?.reference}</strong>{p.gateway?.channel && ` · ${humanize(p.gateway.channel)}`} · verified {fmtDateTime(p.gateway?.verifiedAt)}{p.gateway?.gatewayFees > 0 && ` · gateway fee ${money(p.gateway.gatewayFees)}`}</span>
                </p>
              )}
              {p.status === "Pending" && p.gateway?.reference && (
                <p className="mt-1 text-amber-700">The client started an online payment on {fmtDateTime(p.gateway.initializedAt)} but has not completed it. It will confirm itself if they do.</p>
              )}
              {p.submittedAt ? (
                <p className="mt-1 text-slate-600">Reference <strong>{p.reference}</strong>, submitted {fmtDateTime(p.submittedAt)}{p.proofUrl && <> · <a className="text-[#B83A06] underline" href={p.proofUrl} target="_blank" rel="noreferrer">proof</a></>}{p.note && ` · ${p.note}`}</p>
              ) : p.status === "Pending" ? <p className="mt-1 text-slate-500">The client has not submitted transfer details yet.</p> : null}
              {p.adminNote && <p className="mt-1 text-slate-500">{p.adminNote}</p>}
            </div>
            {p.status === "Pending" ? (
              <div className="flex gap-2">
                <button className={`${btnPrimary} ${btnSmall}`} onClick={() => confirm(p)}>Confirm payment</button>
                {p.submittedAt && <button className={`${btnGhost} ${btnSmall}`} onClick={() => setDecline(p)}>Decline</button>}
              </div>
            ) : p.method === "paystack" && p.status === "Paid" ? <Badge tone="green">Paid online</Badge> : <Badge status={p.status} />}
          </li>
        ))}
      </ul>
      {decline && (
        <NoteModal title="Decline payment" cta="Decline payment" danger onClose={() => setDecline(null)}
          onSubmit={async (note) => { await api.decidePayment(decline._id, { approve: false, note }); setDecline(null); await load(); onChanged(); }} />
      )}
    </div>
  );
}

/* ---------------- replacements ---------------- */
function ReplacementsTab({ go, onChanged }) {
  const [status, setStatus] = useState("Pending");
  const [rows, setRows] = useState(null);
  const [error, setError] = useState("");
  const [reject, setReject] = useState(null);
  const load = useCallback(() => api.replacements({ status }).then((r) => setRows(r.replacements)).catch((e) => setError(apiError(e))), [status]);
  useEffect(() => { setRows(null); load(); }, [load]);

  const act = async (x, action) => {
    try { await api.decideReplacement(x._id, { action }); await load(); onChanged(); } catch (e) { setError(apiError(e)); }
  };
  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-2">
        {["Pending", "Approved", "Fulfilled", "Rejected"].map((s) => (
          <button key={s} onClick={() => setStatus(s)} className={`rounded-full px-3 py-1.5 text-sm ${status === s ? "bg-[#E4510B] text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`}>{s}</button>
        ))}
      </div>
      {error && <Notice tone="error">{error}</Notice>}
      {!rows && !error && <Spinner />}
      {rows?.length === 0 && <Empty title="No replacement requests" />}
      <ul className="space-y-3">
        {rows?.map((x) => (
          <li key={x._id} className="rounded-xl border border-slate-200 bg-white p-4 text-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-semibold text-slate-900">{x.candidateName} <span className="font-normal text-slate-500">· {x.request?.jobTitle}</span></p>
                <p className="text-slate-700"><ReqLink go={go} id={x.request?._id}>{x.request?.reference}</ReqLink> · {personName(x.employer)}</p>
                <p className="mt-2 text-slate-800">{x.reasonLabel}</p>
                {x.details && <p className="mt-1 text-slate-600">{x.details}</p>}
                <p className="mt-2 flex flex-wrap gap-2">
                  {x.needsReview && <Badge tone="amber">Needs your review</Badge>}
                  {x.revisedRequirements && <Badge tone="blue">Revised requirements · fee {x.change?.status ? humanize(x.change.status) : "pending"}</Badge>}
                </p>
              </div>
              {x.status === "Pending" ? (
                <div className="flex gap-2">
                  <button className={`${btnPrimary} ${btnSmall}`} onClick={() => act(x, "approve")}>Approve</button>
                  <button className={`${btnGhost} ${btnSmall}`} onClick={() => setReject(x)}>Reject</button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Badge status={x.status} />
                  {x.status === "Approved" && <button className={`${btnGhost} ${btnSmall}`} onClick={() => act(x, "fulfil")}>Mark fulfilled</button>}
                </div>
              )}
            </div>
          </li>
        ))}
      </ul>
      {reject && (
        <NoteModal title="Reject replacement" cta="Reject request" danger onClose={() => setReject(null)}
          onSubmit={async (adminNote) => { await api.decideReplacement(reject._id, { action: "reject", adminNote }); setReject(null); await load(); onChanged(); }} />
      )}
    </div>
  );
}

/* ---------------- change requests ---------------- */
function ChangesTab({ go, onChanged }) {
  const [status, setStatus] = useState("AwaitingApproval");
  const [rows, setRows] = useState(null);
  const [types, setTypes] = useState([]);
  const [error, setError] = useState("");
  const [decline, setDecline] = useState(null);
  const load = useCallback(() => api.changes({ status }).then((r) => { setRows(r.changes); setTypes(r.changeTypes); }).catch((e) => setError(apiError(e))), [status]);
  useEffect(() => { setRows(null); load(); }, [load]);

  const act = async (c, action) => {
    try { await api.decideChange(c._id, { action }); await load(); onChanged(); } catch (e) { setError(apiError(e)); }
  };
  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-2">
        {["AwaitingApproval", "AwaitingPayment", "Paid", "Completed", "Declined"].map((s) => (
          <button key={s} onClick={() => setStatus(s)} className={`rounded-full px-3 py-1.5 text-sm ${status === s ? "bg-[#E4510B] text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`}>{humanize(s)}</button>
        ))}
      </div>
      {error && <Notice tone="error">{error}</Notice>}
      {!rows && !error && <Spinner />}
      {rows?.length === 0 && <Empty title="No change requests" />}
      <ul className="space-y-3">
        {rows?.map((c) => (
          <li key={c._id} className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 text-sm">
            <div className="min-w-0">
              <p className="font-semibold text-slate-900">{types.find((t) => t.value === c.type)?.label || humanize(c.type)} <span className="font-normal text-slate-500">· fee {money(c.fee)}</span></p>
              <p className="text-slate-700"><ReqLink go={go} id={c.request?._id}>{c.request?.reference}</ReqLink> · {c.request?.jobTitle} · {personName(c.employer)}</p>
              <p className="mt-2 text-slate-700">{c.description}</p>
              {c.adminNote && <p className="mt-1 text-slate-500">{c.adminNote}</p>}
            </div>
            <div className="flex items-center gap-2">
              {c.status === "AwaitingApproval" && <><button className={`${btnPrimary} ${btnSmall}`} onClick={() => act(c, "approve")}>Approve and request fee</button><button className={`${btnGhost} ${btnSmall}`} onClick={() => setDecline(c)}>Decline</button></>}
              {c.status === "Paid" && <button className={`${btnPrimary} ${btnSmall}`} onClick={() => act(c, "complete")}>Mark completed</button>}
              {!["AwaitingApproval"].includes(c.status) && <Badge status={c.status} />}
            </div>
          </li>
        ))}
      </ul>
      {decline && (
        <NoteModal title="Decline change request" cta="Decline change" danger onClose={() => setDecline(null)}
          onSubmit={async (adminNote) => { await api.decideChange(decline._id, { action: "decline", adminNote }); setDecline(null); await load(); onChanged(); }} />
      )}
    </div>
  );
}

/* ---------------- pricing ---------------- */
function PricingTab() {
  const [plans, setPlans] = useState(null);
  const [error, setError] = useState("");
  useEffect(() => { api.plans().then((r) => setPlans(r.plans)).catch((e) => setError(apiError(e))); }, []);
  if (error) return <Notice tone="error">{error}</Notice>;
  if (!plans) return <Spinner />;
  return (
    <div className="space-y-4">
      <Notice>Package content (features, limits, checks and replacement terms) is fixed in code. Here you set the price and whether each package can be ordered. Changing a price never affects requests that were already placed.</Notice>
      {plans.map((p) => <PlanRow key={p.key} plan={p} />)}
    </div>
  );
}

function PlanRow({ plan }) {
  const [model, setModel] = useState(plan.pricing.model || "fixed");
  const [amount, setAmount] = useState(plan.pricing.amount ?? "");
  const [percent, setPercent] = useState(plan.pricing.percent ?? "");
  const [active, setActive] = useState(plan.active);
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setBusy(true); setMsg(null);
    try {
      await api.updatePlan(plan.key, { active, pricing: model === "percent" ? { model, percent: Number(percent) } : { model, amount: Number(amount) } });
      setMsg({ tone: "success", text: "Saved" });
    } catch (e) { setMsg({ tone: "error", text: apiError(e) }); } finally { setBusy(false); }
  };
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><h3 className="font-semibold text-slate-900">{plan.name}</h3><p className="text-sm text-slate-500">{plan.paymentTerms.label}</p></div>
        <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" className="h-4 w-4 rounded border-slate-300 text-[#E4510B]" checked={active} onChange={(e) => setActive(e.target.checked)} /> Available to order
        </label>
      </div>
      <div className="mt-4 grid gap-4 sm:grid-cols-[200px_1fr_auto] sm:items-end">
        <Field label="Pricing">
          <select className={inputCls} value={model} onChange={(e) => setModel(e.target.value)}>
            <option value="fixed">Fixed amount</option>
            <option value="percent">Percent of annual salary</option>
          </select>
        </Field>
        {model === "fixed"
          ? <Field label="Amount (NGN)"><input className={inputCls} type="number" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} /></Field>
          : <Field label="Percent of annual salary"><input className={inputCls} type="number" min="0" max="100" step="0.1" value={percent} onChange={(e) => setPercent(e.target.value)} /></Field>}
        <button className={btnPrimary} disabled={busy} onClick={save}>{busy ? "Saving" : "Save"}</button>
      </div>
      {msg && <p className={`mt-3 text-sm ${msg.tone === "error" ? "text-red-700" : "text-green-700"}`} role={msg.tone === "error" ? "alert" : "status"}>{msg.text}</p>}
    </div>
  );
}