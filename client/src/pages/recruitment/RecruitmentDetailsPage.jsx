// src/pages/employer/RecruitmentDetailPage.jsx   route: /employer/recruitment/requests/:id
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { ArrowLeft, Calendar, FileText, Mail, Phone, RefreshCw, ShieldCheck, Video } from "lucide-react";
import recruitmentApi from "./recruitmentApi";
import {
  Badge, Empty, Field, Modal, Notice, Panel, Spinner, Tabs, inputCls, btnPrimary, btnGhost, btnDanger, btnSmall,
  apiError, fmtDate, fmtDateTime, humanize, money,
} from "./ui";

/* ------------------------------------------------------------------ */
/* Candidate card                                                      */
/* ------------------------------------------------------------------ */
function CandidateCard({ c, onAct, onReplace, canAct }) {
  const open = ["Submitted", "Interviewing", "Offered"].includes(c.stage);
  return (
    <article className="rounded-xl border border-gray-200 bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          {c.photo ? (
            <img src={c.photo} alt="" className="h-12 w-12 rounded-full object-cover" />
          ) : (
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-orange-100 text-lg font-semibold text-orange-700">{c.name?.[0]}</span>
          )}
          <div className="min-w-0">
            <h3 className="truncate font-semibold text-gray-900">{c.name}</h3>
            <p className="truncate text-sm text-gray-600">{[c.headline, c.yearsExperience != null && `${c.yearsExperience} yrs experience`, c.state].filter(Boolean).join(" · ")}</p>
          </div>
        </div>
        <Badge status={c.stage} />
      </div>

      {c.summary && <p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-gray-700">{c.summary}</p>}

      {c.checks?.length > 0 && (
        <div className="mt-4">
          <p className="mb-2 flex items-center gap-1.5 text-sm font-medium text-gray-900"><ShieldCheck className="h-4 w-4 text-orange-600" aria-hidden /> Verification</p>
          <ul className="divide-y divide-gray-100 rounded-lg border border-gray-100">
            {c.checks.map((k) => (
              <li key={k.key} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm">
                <span className="text-gray-700">{k.label}{k.note && <span className="ml-2 text-gray-500">{k.note}</span>}</span>
                <span className="flex items-center gap-3">
                  {k.reportUrl && <a href={k.reportUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-medium text-orange-700 hover:underline"><FileText className="h-3.5 w-3.5" />Report</a>}
                  <Badge status={k.status} />
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {c.interview?.scheduledAt && (
        <p className="mt-4 flex flex-wrap items-center gap-2 rounded-lg bg-blue-50 px-3 py-2 text-sm text-blue-900">
          {c.interview.mode === "Video" ? <Video className="h-4 w-4" /> : <Calendar className="h-4 w-4" />}
          Interview {fmtDateTime(c.interview.scheduledAt)}{c.interview.mode && ` · ${c.interview.mode}`}{c.interview.location && ` · ${c.interview.location}`}
          <Badge status={c.interview.status || "Scheduled"} />
        </p>
      )}
      {c.stage === "Interviewing" && !c.interview?.scheduledAt && (
        <p className="mt-4 rounded-lg bg-blue-50 px-3 py-2 text-sm text-blue-900">Interview requested. Our team will confirm the time with you and the candidate.</p>
      )}

      {(c.email || c.phone) && (
        <p className="mt-4 flex flex-wrap gap-x-5 gap-y-1 text-sm text-gray-700">
          {c.email && <a className="inline-flex items-center gap-1.5 hover:text-orange-700" href={`mailto:${c.email}`}><Mail className="h-4 w-4" />{c.email}</a>}
          {c.phone && <a className="inline-flex items-center gap-1.5 hover:text-orange-700" href={`tel:${c.phone}`}><Phone className="h-4 w-4" />{c.phone}</a>}
        </p>
      )}

      {c.stage === "Hired" && (
        <p className="mt-4 text-sm text-gray-600">
          Starts {fmtDate(c.startDate)}. Replacement cover until {fmtDate(c.replacementUntil)}.
        </p>
      )}
      {c.stage === "Rejected" && c.rejectReason && <p className="mt-4 text-sm text-gray-600">Reason: {c.rejectReason}</p>}
      {c.clientFeedback && <p className="mt-4 text-sm text-gray-600"><span className="font-medium text-gray-900">Your feedback:</span> {c.clientFeedback}</p>}

      {canAct && (
        <div className="mt-5 flex flex-wrap gap-2 border-t border-gray-100 pt-4">
          {c.stage === "Submitted" && <button className={`${btnPrimary} ${btnSmall}`} onClick={() => onAct(c, "interview")}>Request interview</button>}
          {c.stage === "Interviewing" && <button className={`${btnPrimary} ${btnSmall}`} onClick={() => onAct(c, "offer")}>Make offer</button>}
          {["Submitted", "Interviewing", "Offered"].includes(c.stage) && (
            <button className={`${c.stage === "Offered" ? btnPrimary : btnGhost} ${btnSmall}`} onClick={() => onAct(c, "hire")}>{c.stage === "Offered" ? "Confirm hire" : "Hire"}</button>
          )}
          {open && <button className={`${btnGhost} ${btnSmall}`} onClick={() => onAct(c, "feedback")}>Add feedback</button>}
          {open && <button className={`${btnGhost} ${btnSmall} !text-red-700`} onClick={() => onAct(c, "reject")}>Not a fit</button>}
          {c.canReplace && <button className={`${btnGhost} ${btnSmall}`} onClick={() => onReplace(c)}><RefreshCw className="h-3.5 w-3.5" />Request replacement</button>}
        </div>
      )}
    </article>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */
export default function RecruitmentDetailPage() {
  const { id } = useParams();
  const location = useLocation();
  const [data, setData] = useState(null);
  const [cat, setCat] = useState(null);
  const [tab, setTab] = useState(location.state?.justOrdered ? "payments" : "overview");
  const [error, setError] = useState("");

  const [decision, setDecision] = useState(null);   // { cand, kind }
  const [replace, setReplace] = useState(null);     // candidate
  const [changing, setChanging] = useState(false);
  const [proof, setProof] = useState(null);         // payment

  const load = useCallback(async () => {
    try { setData(await recruitmentApi.myRequest(id)); setError(""); } catch (e) { setError(apiError(e)); }
  }, [id]);
  useEffect(() => { load(); recruitmentApi.catalog().then(setCat).catch(() => {}); }, [load]);

  const r = data?.request;
  const pendingPayments = useMemo(() => (data?.payments || []).filter((p) => p.status === "Pending"), [data]);
  const toPay = pendingPayments.filter((p) => !p.submittedAt);
  const toReview = (r?.candidates || []).filter((c) => c.stage === "Submitted").length;

  if (error && !data) return <div className="mx-auto max-w-3xl p-6"><Notice tone="error">{error}</Notice></div>;
  if (!data) return <Spinner />;

  const canAct = ["Active", "Completed"].includes(r.status);
  const tabs = [
    { key: "overview", label: "Overview" },
    { key: "candidates", label: "Candidates", count: toReview },
    { key: "payments", label: "Payments", count: toPay.length },
    { key: "changes", label: "Changes and replacements" },
    { key: "documents", label: "Documents", count: 0 },
    { key: "activity", label: "Activity" },
  ];
  const limits = r.planSnapshot?.limits || {};
  const hired = r.candidates.filter((c) => c.stage === "Hired").length;
  const submitted = r.candidates.length;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <Link to="/employer/recruitment/requests" className="mb-4 inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900"><ArrowLeft className="h-4 w-4" /> My requests</Link>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">{r.jobTitle}</h1>
          <p className="mt-1 text-sm text-gray-500">{r.reference} · {r.planName} package{r.location && ` · ${r.location}`}</p>
        </div>
        <Badge status={r.status} />
      </div>

      {error && <div className="mb-4"><Notice tone="error">{error}</Notice></div>}
      {r.status === "AwaitingPayment" && (
        <div className="mb-6"><Notice tone="warn">
          Recruitment starts once we confirm your payment of <strong>{money(r.fees.upfront, r.fees.currency)}</strong>.{" "}
          <button className="font-medium underline" onClick={() => setTab("payments")}>Go to payment details</button>
        </Notice></div>
      )}
      {r.status === "Suspended" && <div className="mb-6"><Notice tone="warn">This request is on hold.{r.statusReason && ` ${r.statusReason}`}</Notice></div>}
      {r.status === "Cancelled" && <div className="mb-6"><Notice tone="error">This request was cancelled.{r.statusReason && ` ${r.statusReason}`}</Notice></div>}
      {toReview > 0 && <div className="mb-6"><Notice tone="success">
        {toReview} verified candidate{toReview > 1 ? "s are" : " is"} ready for your review.{" "}
        <button className="font-medium underline" onClick={() => setTab("candidates")}>Review candidates</button>
      </Notice></div>}

      <Tabs tabs={tabs} value={tab} onChange={setTab} />

      {/* ---------------- overview ---------------- */}
      {tab === "overview" && (
        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <Panel title="Role details">
            <dl className="space-y-4 text-sm">
              <div><dt className="font-medium text-gray-900">Description</dt><dd className="mt-1 whitespace-pre-line text-gray-700">{r.description}</dd></div>
              {r.qualifications && <div><dt className="font-medium text-gray-900">Qualifications</dt><dd className="mt-1 whitespace-pre-line text-gray-700">{r.qualifications}</dd></div>}
              {r.skills?.length > 0 && <div><dt className="font-medium text-gray-900">Skills</dt><dd className="mt-1 flex flex-wrap gap-2">{r.skills.map((s) => <span key={s} className="rounded-full bg-gray-100 px-2.5 py-1 text-xs text-gray-700">{s}</span>)}</dd></div>}
              <div className="grid gap-4 sm:grid-cols-3">
                <div><dt className="font-medium text-gray-900">Experience</dt><dd className="text-gray-700">{r.experience || "Not specified"}</dd></div>
                <div><dt className="font-medium text-gray-900">Type</dt><dd className="text-gray-700">{r.employmentType}</dd></div>
                <div><dt className="font-medium text-gray-900">Salary</dt><dd className="text-gray-700">{r.annualSalary ? money(r.annualSalary) : "Not specified"}</dd></div>
              </div>
            </dl>
          </Panel>
          <div className="space-y-6">
            <Panel title="Progress">
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between"><dt className="text-gray-600">Hired</dt><dd className="font-medium">{hired} of {limits.hireTarget}</dd></div>
                <div className="flex justify-between"><dt className="text-gray-600">Candidates shared</dt><dd className="font-medium">{submitted} of up to {limits.shortlistMax}</dd></div>
                <div className="flex justify-between"><dt className="text-gray-600">Started</dt><dd className="font-medium">{fmtDate(r.commencedAt)}</dd></div>
                <div className="flex justify-between"><dt className="text-gray-600">Target date</dt><dd className="font-medium">{fmtDate(r.dueDate)}</dd></div>
                <div className="flex justify-between"><dt className="text-gray-600">Replacements left</dt><dd className="font-medium">{data.quota.remaining} of {data.quota.allowed}</dd></div>
              </dl>
            </Panel>
            <Panel title="Fees">
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between"><dt className="text-gray-600">Package</dt><dd>{money(r.fees.base, r.fees.currency)}</dd></div>
                {r.fees.engagement > 0 && <div className="flex justify-between"><dt className="text-gray-600">Hiring process</dt><dd>{money(r.fees.engagement, r.fees.currency)}</dd></div>}
                <div className="flex justify-between border-t border-gray-100 pt-2 font-semibold"><dt>Total</dt><dd>{money(r.fees.total, r.fees.currency)}</dd></div>
                <div className="flex justify-between"><dt className="text-gray-600">Paid so far</dt><dd>{money(r.fees.paid, r.fees.currency)}</dd></div>
              </dl>
              {r.planSnapshot?.paymentTerms?.label && <p className="mt-3 text-xs text-gray-500">{r.planSnapshot.paymentTerms.label}</p>}
            </Panel>
            {r.status === "AwaitingPayment" && <button className={`${btnGhost} w-full`} onClick={async () => { if (window.confirm("Cancel this request? You have not paid yet, so nothing is charged.")) { try { await recruitmentApi.cancelRequest(r._id); load(); } catch (e) { setError(apiError(e)); } } }}>Cancel request</button>}
          </div>
        </div>
      )}

      {/* ---------------- candidates ---------------- */}
      {tab === "candidates" && (
        r.candidates.length === 0 ? (
          <Empty
            title="No candidates to review yet"
            text={r.status === "AwaitingPayment" ? "We start sourcing as soon as your payment is confirmed." : "Our team is sourcing, interviewing and verifying candidates. We will email you when the first profile is ready."}
          />
        ) : (
          <div className="space-y-4">
            {r.candidates.map((c) => (
              <CandidateCard key={c._id} c={c} canAct={canAct} onAct={(cand, kind) => setDecision({ cand, kind })} onReplace={setReplace} />
            ))}
          </div>
        )
      )}

      {/* ---------------- payments ---------------- */}
      {tab === "payments" && (
        <div className="space-y-6">
          {toPay.length > 0 && (
            <Panel title="How to pay">
              {data.bank.accountNumber ? (
                <dl className="grid gap-4 text-sm sm:grid-cols-3">
                  <div><dt className="text-gray-500">Bank</dt><dd className="font-medium text-gray-900">{data.bank.bankName}</dd></div>
                  <div><dt className="text-gray-500">Account name</dt><dd className="font-medium text-gray-900">{data.bank.accountName}</dd></div>
                  <div><dt className="text-gray-500">Account number</dt><dd className="font-mono font-medium text-gray-900">{data.bank.accountNumber}</dd></div>
                </dl>
              ) : <p className="text-sm text-gray-700">Our team will send you the bank details for the transfer.</p>}
              <p className="mt-4 text-sm text-gray-600">Use <strong>{r.reference}</strong> as the transfer narration, then tell us you have paid. We confirm payments within one business day.</p>
            </Panel>
          )}
          <Panel title="Payments">
            {data.payments.length === 0 ? <p className="text-sm text-gray-500">No payments yet.</p> : (
              <ul className="divide-y divide-gray-100">
                {data.payments.map((p) => (
                  <li key={p._id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                    <div>
                      <p className="font-medium text-gray-900">{p.kind === "upfront" ? (r.planSnapshot?.paymentTerms?.upfrontPct < 100 ? "Upfront payment" : "Package fee") : p.kind === "balance" ? "Balance on hire" : "Change request fee"}</p>
                      <p className="text-sm text-gray-500">{money(p.amount, p.currency)}{p.paidAt && ` · paid ${fmtDate(p.paidAt)}`}{p.reference && ` · ref ${p.reference}`}</p>
                      {p.status === "Failed" && p.adminNote && <p className="mt-1 text-sm text-red-700">{p.adminNote}</p>}
                      {p.status === "Pending" && p.adminNote && <p className="mt-1 text-sm text-red-700">{p.adminNote}</p>}
                    </div>
                    <div className="flex items-center gap-3">
                      {p.status === "Pending" && p.submittedAt ? <Badge tone="blue">Awaiting confirmation</Badge> : <Badge status={p.status} />}
                      {p.status === "Pending" && !p.submittedAt && <button className={`${btnPrimary} ${btnSmall}`} onClick={() => setProof(p)}>I have paid</button>}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      )}

      {/* ---------------- changes & replacements ---------------- */}
      {tab === "changes" && (
        <div className="space-y-6">
          <Panel title="Change requests" action={canAct && <button className={`${btnGhost} ${btnSmall}`} onClick={() => setChanging(true)}>Request a change</button>}>
            <p className="mb-4 text-sm text-gray-600">Changing the job description, requirements or number of positions after recruitment has started adds {cat?.changeFeePct ?? 15}% of the package fee.</p>
            {data.changes.length === 0 ? <p className="text-sm text-gray-500">No change requests.</p> : (
              <ul className="divide-y divide-gray-100">
                {data.changes.map((c) => (
                  <li key={c._id} className="flex flex-wrap items-start justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <p className="font-medium text-gray-900">{cat?.changeTypes.find((t) => t.value === c.type)?.label || humanize(c.type)}</p>
                      <p className="text-sm text-gray-600">{c.description}</p>
                      <p className="mt-1 text-sm text-gray-500">Fee {money(c.fee)}{c.adminNote && ` · ${c.adminNote}`}</p>
                    </div>
                    <Badge status={c.status} />
                  </li>
                ))}
              </ul>
            )}
          </Panel>
          <Panel title="Replacement requests">
            <p className="mb-4 text-sm text-gray-600">Start a replacement from a hired candidate on the Candidates tab. {data.quota.allowed} replacement{data.quota.allowed > 1 ? "s are" : " is"} included in your package.</p>
            {data.replacements.length === 0 ? <p className="text-sm text-gray-500">No replacement requests.</p> : (
              <ul className="divide-y divide-gray-100">
                {data.replacements.map((x) => (
                  <li key={x._id} className="flex flex-wrap items-start justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <p className="font-medium text-gray-900">{x.candidateName}</p>
                      <p className="text-sm text-gray-600">{x.reasonLabel}</p>
                      {x.adminNote && <p className="mt-1 text-sm text-gray-500">{x.adminNote}</p>}
                    </div>
                    <Badge status={x.status} />
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      )}

      {/* ---------------- documents ---------------- */}
      {tab === "documents" && (
        r.documents?.length ? (
          <ul className="space-y-3">
            {r.documents.map((d) => (
              <li key={d._id}>
                <a href={d.url} target="_blank" rel="noreferrer" className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white p-4 hover:border-orange-300">
                  <span className="flex items-center gap-3"><FileText className="h-5 w-5 text-orange-600" /><span><span className="block font-medium text-gray-900">{d.name}</span><span className="text-xs text-gray-500">{d.type} · {fmtDate(d.createdAt)}</span></span></span>
                  <span className="text-sm font-medium text-orange-700">Open</span>
                </a>
              </li>
            ))}
          </ul>
        ) : <Empty title="No documents yet" text="Screening and verification reports from our team will appear here." />
      )}

      {/* ---------------- activity ---------------- */}
      {tab === "activity" && (
        <Panel title="Activity">
          <ol className="space-y-4">
            {r.timeline.map((t, i) => (
              <li key={i} className="flex gap-3 text-sm">
                <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-orange-500" aria-hidden />
                <div><p className="text-gray-800">{t.text}</p><p className="text-xs text-gray-500">{fmtDateTime(t.at)}{t.actor === "client" ? " · You" : t.actor === "admin" ? " · Recruitment team" : ""}</p></div>
              </li>
            ))}
          </ol>
        </Panel>
      )}

      {/* ---------------- modals ---------------- */}
      <DecisionModal state={decision} request={r} onClose={() => setDecision(null)} onDone={() => { setDecision(null); load(); }} />
      <ReplacementModal cand={replace} request={r} cat={cat} onClose={() => setReplace(null)} onDone={() => { setReplace(null); setTab("changes"); load(); }} />
      <ChangeModal open={changing} request={r} cat={cat} onClose={() => setChanging(false)} onDone={() => { setChanging(false); load(); }} />
      <ProofModal payment={proof} request={r} onClose={() => setProof(null)} onDone={() => { setProof(null); load(); }} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Modals                                                              */
/* ------------------------------------------------------------------ */
const DECISION_COPY = {
  interview: { title: "Request an interview", cta: "Request interview", note: "Preferred times or anything we should know (optional)", required: false },
  offer: { title: "Make an offer", cta: "Mark as offered", note: "Notes about the offer (optional)", required: false },
  hire: { title: "Confirm hire", cta: "Confirm hire", note: "Notes (optional)", required: false, date: true },
  reject: { title: "This candidate is not a fit", cta: "Reject candidate", note: "Why are you not taking this candidate forward?", required: true, danger: true },
  feedback: { title: "Add feedback", cta: "Save feedback", note: "Your feedback helps us refine the search", required: true },
};

function useSubmit(action, onDone) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const run = async () => {
    setBusy(true); setErr("");
    try { await action(); onDone(); } catch (e) { setErr(apiError(e)); } finally { setBusy(false); }
  };
  return { busy, err, run, setErr };
}

function DecisionModal({ state, request, onClose, onDone }) {
  const [note, setNote] = useState("");
  const [startDate, setStartDate] = useState("");
  const copy = state ? DECISION_COPY[state.kind] : null;
  useEffect(() => { setNote(""); setStartDate(""); }, [state]);
  const { busy, err, run } = useSubmit(
    () => recruitmentApi.decide(request._id, state.cand._id, { decision: state.kind, note, startDate }), onDone,
  );
  if (!state) return null;
  const invalid = (copy.required && note.trim().length < 3) || (copy.date && !startDate);
  return (
    <Modal open title={`${copy.title}: ${state.cand.name}`} onClose={onClose}
      footer={<><button className={btnGhost} onClick={onClose}>Cancel</button><button className={copy.danger ? btnDanger : btnPrimary} disabled={busy || invalid} onClick={run}>{busy ? "Saving" : copy.cta}</button></>}>
      {err && <Notice tone="error">{err}</Notice>}
      {copy.date && <Field label="Start date"><input type="date" className={inputCls} value={startDate} onChange={(e) => setStartDate(e.target.value)} /></Field>}
      <Field label={copy.note}><textarea className={inputCls} rows={4} value={note} onChange={(e) => setNote(e.target.value)} maxLength={1000} /></Field>
      {copy.date && <p className="text-xs text-gray-500">Replacement cover runs from the start date. Please enter the date the candidate actually starts work.</p>}
    </Modal>
  );
}

function ReplacementModal({ cand, request, cat, onClose, onDone }) {
  const [code, setCode] = useState("");
  const [details, setDetails] = useState("");
  const [revised, setRevised] = useState(false);
  const [accept, setAccept] = useState(false);
  useEffect(() => { setCode(""); setDetails(""); setRevised(false); setAccept(false); }, [cand]);
  const { busy, err, run } = useSubmit(
    () => recruitmentApi.createReplacement(request._id, { candidateId: cand._id, reasonCode: code, details, revisedRequirements: revised, acceptFee: accept }), onDone,
  );
  if (!cand) return null;
  const reason = cat?.replacementReasons.find((x) => x.code === code);
  const blocked = reason?.eligible === false;
  const fee = Math.round(((request.fees.base || 0) * (cat?.changeFeePct ?? 15)) / 100);
  return (
    <Modal open title={`Request a replacement for ${cand.name}`} onClose={onClose}
      footer={<><button className={btnGhost} onClick={onClose}>Cancel</button>
        <button className={btnPrimary} disabled={busy || !code || blocked || (reason?.eligible === "review" && details.trim().length < 10) || (revised && !accept)} onClick={run}>{busy ? "Sending" : "Submit request"}</button></>}>
      {err && <Notice tone="error">{err}</Notice>}
      <Field label="What happened?">
        <select className={inputCls} value={code} onChange={(e) => setCode(e.target.value)}>
          <option value="">Choose a reason</option>
          {cat?.replacementReasons.map((x) => <option key={x.code} value={x.code}>{x.label}</option>)}
        </select>
      </Field>
      {blocked && <Notice tone="warn">{reason.explain}</Notice>}
      {!blocked && code && (
        <>
          <Field label="Details" hint={reason?.eligible === "review" ? "Required. Our team will review what happened." : "Optional"}>
            <textarea className={inputCls} rows={4} value={details} onChange={(e) => setDetails(e.target.value)} maxLength={2000} />
          </Field>
          <label className="flex cursor-pointer gap-3 text-sm text-gray-700">
            <input type="checkbox" className="mt-0.5 h-4 w-4 rounded border-gray-300 text-orange-600" checked={revised} onChange={(e) => setRevised(e.target.checked)} />
            <span>The requirements for the replacement are different from the original role. This adds a {cat?.changeFeePct ?? 15}% fee ({money(fee)}).</span>
          </label>
          {revised && (
            <label className="flex cursor-pointer gap-3 text-sm text-gray-700">
              <input type="checkbox" className="mt-0.5 h-4 w-4 rounded border-gray-300 text-orange-600" checked={accept} onChange={(e) => setAccept(e.target.checked)} />
              <span>I accept the fee of {money(fee)} for revised requirements.</span>
            </label>
          )}
        </>
      )}
    </Modal>
  );
}

function ChangeModal({ open, request, cat, onClose, onDone }) {
  const [type, setType] = useState("");
  const [description, setDescription] = useState("");
  const [accept, setAccept] = useState(false);
  useEffect(() => { if (open) { setType(""); setDescription(""); setAccept(false); } }, [open]);
  const { busy, err, run } = useSubmit(() => recruitmentApi.createChange(request._id, { type, description, acceptFee: accept }), onDone);
  const fee = Math.round(((request.fees.base || 0) * (cat?.changeFeePct ?? 15)) / 100);
  return (
    <Modal open={open} title="Request a change" onClose={onClose}
      footer={<><button className={btnGhost} onClick={onClose}>Cancel</button><button className={btnPrimary} disabled={busy || !type || description.trim().length < 10 || !accept} onClick={run}>{busy ? "Sending" : "Submit change"}</button></>}>
      {err && <Notice tone="error">{err}</Notice>}
      <Field label="What would you like to change?">
        <select className={inputCls} value={type} onChange={(e) => setType(e.target.value)}>
          <option value="">Choose one</option>
          {cat?.changeTypes.filter((t) => t.value !== "revised_requirements").map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
      </Field>
      <Field label="Describe the change"><textarea className={inputCls} rows={4} value={description} onChange={(e) => setDescription(e.target.value)} maxLength={2000} /></Field>
      <Notice>The change request fee is <strong>{money(fee)}</strong> ({cat?.changeFeePct ?? 15}% of your package fee). Our team reviews the request first, then you pay the fee before the extra work starts.</Notice>
      <label className="flex cursor-pointer gap-3 text-sm text-gray-700">
        <input type="checkbox" className="mt-0.5 h-4 w-4 rounded border-gray-300 text-orange-600" checked={accept} onChange={(e) => setAccept(e.target.checked)} />
        <span>I accept the fee of {money(fee)}.</span>
      </label>
    </Modal>
  );
}

function ProofModal({ payment, request, onClose, onDone }) {
  const [reference, setReference] = useState("");
  const [proofUrl, setProofUrl] = useState("");
  const [note, setNote] = useState("");
  useEffect(() => { setReference(""); setProofUrl(""); setNote(""); }, [payment]);
  const { busy, err, run } = useSubmit(() => recruitmentApi.submitProof(request._id, payment._id, { reference, proofUrl, note }), onDone);
  if (!payment) return null;
  return (
    <Modal open title="Tell us you have paid" onClose={onClose}
      footer={<><button className={btnGhost} onClick={onClose}>Cancel</button><button className={btnPrimary} disabled={busy || reference.trim().length < 3} onClick={run}>{busy ? "Sending" : "Submit for confirmation"}</button></>}>
      {err && <Notice tone="error">{err}</Notice>}
      <p className="text-sm text-gray-700">Amount transferred: <strong>{money(payment.amount, payment.currency)}</strong></p>
      <Field label="Transfer reference or sender name" hint="As shown on your bank receipt."><input className={inputCls} value={reference} onChange={(e) => setReference(e.target.value)} maxLength={120} /></Field>
      <Field label="Link to proof of payment" hint="Optional. A link to your receipt, if you have one."><input className={inputCls} type="url" value={proofUrl} onChange={(e) => setProofUrl(e.target.value)} placeholder="https://" /></Field>
      <Field label="Note" hint="Optional"><textarea className={inputCls} rows={2} value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} /></Field>
    </Modal>
  );
}