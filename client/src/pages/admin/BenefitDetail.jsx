// import { useCallback, useEffect, useState } from "react";
// import { Link, useParams } from "react-router-dom";
// import { toast } from "sonner";
// import { Loader2 } from "lucide-react";

// import { benefitApi, getError } from "../../api";
// import {
//   CATEGORY_LABELS,
//   Card,
//   Checklist,
//   EmptyState,
//   PageHeader,
//   Spinner,
//   StatusBadge,
//   dangerBtn,
//   fmtDate,
//   fullName,
//   ghostBtn,
//   inputCls,
//   naira,
//   primaryBtn,
// } from "../../components/benefits/shared";

// const LIST_PATH = "/admin/benefits"; // change to match your router

// const hasValue = (v) => v && String(v).trim() && String(v).toLowerCase() !== "none";
// const isLink = (v) => /^(https?:\/\/|data:image)/i.test(String(v));

// function Row({ label, children }) {
//   return (
//     <div className="flex flex-col gap-0.5 py-2.5 sm:flex-row sm:gap-4">
//       <dt className="w-44 shrink-0 text-sm text-slate-500">{label}</dt>
//       <dd className="min-w-0 break-words text-sm text-slate-900">{children}</dd>
//     </div>
//   );
// }

// // Shows a link or image for uploaded documents, plain text otherwise
// function Doc({ value, image = false }) {
//   if (!hasValue(value)) return <span className="text-slate-400">Not provided</span>;
//   if (!isLink(value)) return <span>{value}</span>;
//   return image ? (
//     <a href={value} target="_blank" rel="noreferrer">
//       <img src={value} alt="Face verification" className="h-24 w-24 rounded-lg border border-slate-200 object-cover" />
//     </a>
//   ) : (
//     <a href={value} target="_blank" rel="noreferrer" className="font-medium text-primary-700 underline-offset-4 hover:underline">
//       Open document
//     </a>
//   );
// }

// export default function BenefitDetail() {
//   const { id } = useParams();
//   const [data, setData] = useState(null);
//   const [error, setError] = useState("");
//   const [mode, setMode] = useState(null); // "approve" | "reject" | "pay"
//   const [busy, setBusy] = useState(false);
//   const [approvedAmount, setApprovedAmount] = useState("");
//   const [adminNote, setAdminNote] = useState("");
//   const [reason, setReason] = useState("");
//   const [reference, setReference] = useState("");

//   const load = useCallback(() => {
//     benefitApi.admin
//       .get(id)
//       .then(({ data }) => {
//         setData(data);
//         setApprovedAmount(String(data.benefit.approvedAmount || data.benefit.amount));
//       })
//       .catch((err) => setError(getError(err)));
//   }, [id]);

//   useEffect(load, [load]);

//   const run = async (action, success) => {
//     setBusy(true);
//     try {
//       await action();
//       toast.success(success);
//       setMode(null);
//       load();
//     } catch (err) {
//       const missing = err?.response?.data?.missing;
//       toast.error(missing?.length ? `${getError(err)}: ${missing.map((m) => m.label).join(", ")}` : getError(err));
//     } finally {
//       setBusy(false);
//     }
//   };

//   if (error) return <div className="mx-auto max-w-3xl px-4 py-8"><EmptyState title="Couldn't load this request" text={error} action={<Link to={LIST_PATH} className={ghostBtn}>Back to requests</Link>} /></div>;
//   if (!data) return <Spinner />;

//   const { benefit: b, applicant: a, requirements, attendance } = data;
//   const allMet = requirements.every((r) => r.met);
//   const nin = a.identityVerification?.nin;
//   const canApprove = b.status === "pending" && allMet && !a.isBlacklisted;

//   return (
//     <div className="mx-auto max-w-5xl space-y-6 px-4 py-8 sm:px-6">
//       <PageHeader
//         title={b.title}
//         text={`${b.requestRef} · Benefit number ${b.benefitNumber}`}
//         action={
//           <div className="flex items-center gap-3">
//             <StatusBadge status={b.status} />
//             <Link to={LIST_PATH} className="text-sm font-medium text-slate-600 underline-offset-4 hover:underline">
//               All requests
//             </Link>
//           </div>
//         }
//       />

//       {/* Decision */}
//       <Card title="Decision">
//         {b.status === "pending" && (
//           <>
//             {!allMet && (
//               <p className="mb-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
//                 This applicant hasn't met every requirement, so the request can't be approved yet.
//               </p>
//             )}
//             {a.isBlacklisted && (
//               <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
//                 This applicant is blacklisted, so the request can't be approved.
//               </p>
//             )}
//           </>
//         )}

//         {b.status === "rejected" && <p className="text-sm text-slate-700">Rejected: {b.rejectionReason}</p>}
//         {b.status === "paid" && (
//           <p className="text-sm text-slate-700">
//             Paid {naira(b.approvedAmount)} on {fmtDate(b.paidAt, true)}. Reference {b.paymentReference}.
//           </p>
//         )}

//         {mode === null && (b.status === "pending" || b.status === "approved") && (
//           <div className="flex flex-wrap gap-3">
//             {b.status === "pending" && (
//               <>
//                 <button type="button" className={primaryBtn} disabled={!canApprove} onClick={() => setMode("approve")}>
//                   Approve
//                 </button>
//                 <button type="button" className={ghostBtn} onClick={() => setMode("reject")}>
//                   Reject
//                 </button>
//               </>
//             )}
//             {b.status === "approved" && (
//               <>
//                 <p className="w-full text-sm text-slate-600">
//                   Approved for {naira(b.approvedAmount)}. Mark it as paid once the money has been sent.
//                 </p>
//                 <button type="button" className={primaryBtn} onClick={() => setMode("pay")}>
//                   Mark as paid
//                 </button>
//               </>
//             )}
//           </div>
//         )}

//         {mode === "approve" && (
//           <form
//             className="max-w-md space-y-4"
//             onSubmit={(e) => {
//               e.preventDefault();
//               run(() => benefitApi.admin.approve(id, { approvedAmount: Number(approvedAmount), adminNote }), "Request approved");
//             }}
//           >
//             <div>
//               <label htmlFor="approvedAmount" className="mb-1.5 block text-sm font-medium text-slate-700">
//                 Amount to approve (₦)
//               </label>
//               <input id="approvedAmount" type="number" min="1" max={b.amount} value={approvedAmount} onChange={(e) => setApprovedAmount(e.target.value)} className={inputCls} />
//               <p className="mt-1.5 text-xs text-slate-500">Requested {naira(b.amount)}. You can approve less, not more.</p>
//             </div>
//             <div>
//               <label htmlFor="adminNote" className="mb-1.5 block text-sm font-medium text-slate-700">
//                 Note <span className="font-normal text-slate-400">(optional)</span>
//               </label>
//               <textarea id="adminNote" rows={2} value={adminNote} onChange={(e) => setAdminNote(e.target.value)} className={inputCls} />
//             </div>
//             <div className="flex gap-3">
//               <button type="submit" disabled={busy} className={primaryBtn}>
//                 {busy && <Loader2 className="h-4 w-4 animate-spin" />} Approve request
//               </button>
//               <button type="button" className={ghostBtn} onClick={() => setMode(null)}>Cancel</button>
//             </div>
//           </form>
//         )}

//         {mode === "reject" && (
//           <form
//             className="max-w-md space-y-4"
//             onSubmit={(e) => {
//               e.preventDefault();
//               run(() => benefitApi.admin.reject(id, reason), "Request rejected");
//             }}
//           >
//             <div>
//               <label htmlFor="reason" className="mb-1.5 block text-sm font-medium text-slate-700">
//                 Reason for rejection
//               </label>
//               <textarea id="reason" rows={3} required value={reason} onChange={(e) => setReason(e.target.value)} placeholder="The applicant will see this." className={inputCls} />
//             </div>
//             <div className="flex gap-3">
//               <button type="submit" disabled={busy || reason.trim().length < 3} className={dangerBtn}>
//                 {busy && <Loader2 className="h-4 w-4 animate-spin" />} Reject request
//               </button>
//               <button type="button" className={ghostBtn} onClick={() => setMode(null)}>Cancel</button>
//             </div>
//           </form>
//         )}

//         {mode === "pay" && (
//           <form
//             className="max-w-md space-y-4"
//             onSubmit={(e) => {
//               e.preventDefault();
//               run(() => benefitApi.admin.pay(id, reference), "Marked as paid");
//             }}
//           >
//             <div>
//               <label htmlFor="reference" className="mb-1.5 block text-sm font-medium text-slate-700">
//                 Payment reference <span className="font-normal text-slate-400">(optional)</span>
//               </label>
//               <input id="reference" value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Transfer or receipt number" className={inputCls} />
//               <p className="mt-1.5 text-xs text-slate-500">
//                 {naira(b.approvedAmount)} will be added to the applicant's account balance.
//               </p>
//             </div>
//             <div className="flex gap-3">
//               <button type="submit" disabled={busy} className={primaryBtn}>
//                 {busy && <Loader2 className="h-4 w-4 animate-spin" />} Confirm payment
//               </button>
//               <button type="button" className={ghostBtn} onClick={() => setMode(null)}>Cancel</button>
//             </div>
//           </form>
//         )}
//       </Card>

//       <div className="grid gap-6 lg:grid-cols-5">
//         <Card title="Qualification requirements" className="lg:col-span-2 lg:self-start">
//           <Checklist items={requirements} />
//         </Card>

//         <Card title="Request" className="lg:col-span-3">
//           <dl className="divide-y divide-slate-100">
//             <Row label="Amount requested">{naira(b.amount)}</Row>
//             <Row label="Category">{CATEGORY_LABELS[b.category] || b.category}</Row>
//             <Row label="Needed by">{fmtDate(b.neededBy)}</Row>
//             <Row label="Submitted">{fmtDate(b.createdAt, true)}</Row>
//             <Row label="Description"><span className="whitespace-pre-wrap">{b.description}</span></Row>
//             {b.adminNote && <Row label="Admin note">{b.adminNote}</Row>}
//             {b.nextAttendanceDue && <Row label="Next venue visit due">{fmtDate(b.nextAttendanceDue)}{b.absenceFlagged ? " (missed)" : ""}</Row>}
//           </dl>
//         </Card>
//       </div>

//       <div className="grid gap-6 md:grid-cols-2">
//         <Card title="Applicant">
//           <dl className="divide-y divide-slate-100">
//             <Row label="Name">{fullName(a)}</Row>
//             <Row label="Email">{a.email || "—"}</Row>
//             <Row label="Phone">{hasValue(a.phoneNumber) ? a.phoneNumber : "—"}</Row>
//             <Row label="Date of birth">{a.dateOfBirth || "—"}</Row>
//             <Row label="Address">
//               {[a.address, a.localGovernment, a.state, a.country].filter(hasValue).join(", ") || "—"}
//             </Row>
//             <Row label="Face"><Doc value={a.faceData} image /></Row>
//           </dl>
//         </Card>

//         <Card title="Documents and identity">
//           <dl className="divide-y divide-slate-100">
//             <Row label="NIN">
//               {a.isNINVerified || nin?.verified
//                 ? `Verified${nin?.matchedName ? ` as ${nin.matchedName}` : ""}${nin?.last4 ? ` (ends ${nin.last4})` : ""}`
//                 : "Not verified"}
//             </Row>
//             <Row label="TIN">{hasValue(a.TIN) ? a.TIN : <span className="text-slate-400">Not provided</span>}</Row>
//             <Row label="Tenancy agreement"><Doc value={a.tenancyAgreement} /></Row>
//             <Row label="Residence evidence"><Doc value={a.scanningEvidence} /></Row>
//             <Row label="Residential card"><Doc value={a.residentialCard} /></Row>
//           </dl>
//         </Card>

//         <Card title="Bank account">
//           <dl className="divide-y divide-slate-100">
//             <Row label="Bank">{hasValue(a.bankName) ? a.bankName : "—"}</Row>
//             <Row label="Account name">{hasValue(a.bankAcctName) ? a.bankAcctName : "—"}</Row>
//             <Row label="Account number">{hasValue(a.bankAcctNum) ? a.bankAcctNum : "—"}</Row>
//           </dl>
//         </Card>

//         <Card title="Next of kin">
//           <dl className="divide-y divide-slate-100">
//             <Row label="Name">{hasValue(a.nextOfKin) ? a.nextOfKin : "—"}</Row>
//             <Row label="Relationship">{hasValue(a.nextOfKinRelationship) ? a.nextOfKinRelationship : "—"}</Row>
//             <Row label="Phone">{hasValue(a.nextOfKinNumber) ? a.nextOfKinNumber : "—"}</Row>
//             <Row label="Address">{hasValue(a.nextOfKinAddress) ? a.nextOfKinAddress : "—"}</Row>
//           </dl>
//         </Card>
//       </div>

//       <Card title={`Guarantors${a.guarantorVerified ? " (verified)" : ""}`}>
//         {a.guarantors?.length ? (
//           <ul className="grid gap-3 sm:grid-cols-2">
//             {a.guarantors.map((g, i) => (
//               <li key={g._id || i} className="rounded-xl border border-slate-200 p-4 text-sm">
//                 {/* Shows whatever fields your guarantorModel holds */}
//                 {Object.entries(g)
//                   .filter(([k, v]) => !["_id", "__v", "createdAt", "updatedAt", "user"].includes(k) && hasValue(v) && typeof v !== "object")
//                   .map(([k, v]) => (
//                     <p key={k} className="flex justify-between gap-3 py-0.5">
//                       <span className="capitalize text-slate-500">{k.replace(/([A-Z])/g, " $1")}</span>
//                       <span className="break-words text-right text-slate-900">{isLink(v) ? <Doc value={v} /> : String(v)}</span>
//                     </p>
//                   ))}
//               </li>
//             ))}
//           </ul>
//         ) : (
//           <p className="text-sm text-slate-500">No guarantor details provided.</p>
//         )}
//       </Card>

//       <Card title="Venue visits">
//         {attendance.length === 0 ? (
//           <p className="text-sm text-slate-500">No venue visits recorded yet.</p>
//         ) : (
//           <ul className="flex flex-wrap gap-2">
//             {attendance.map((r) => (
//               <li key={r._id} className="rounded-md bg-slate-100 px-2.5 py-1 text-xs text-slate-700">
//                 {fmtDate(r.checkedInAt, true)}
//               </li>
//             ))}
//           </ul>
//         )}
//       </Card>
//     </div>
//   );
// }





import { useCallback, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import { benefitApi, getError } from "../../api";
import {
  CATEGORY_LABELS,
  Card,
  Checklist,
  EmptyState,
  PageHeader,
  Spinner,
  StatusBadge,
  dangerBtn,
  fmtDate,
  fullName,
  ghostBtn,
  inputCls,
  naira,
  primaryBtn,
} from "../../components/benefits/shared";

const LIST_PATH = "/dashboard?tab=benefitRequests";

const hasValue = (v) => v && String(v).trim() && String(v).toLowerCase() !== "none";
const isLink = (v) => /^(https?:\/\/|data:image)/i.test(String(v));

function Row({ label, children }) {
  return (
    <div className="flex flex-col gap-0.5 py-2.5 sm:flex-row sm:gap-4">
      <dt className="w-44 shrink-0 text-sm text-slate-500">{label}</dt>
      <dd className="min-w-0 break-words text-sm text-slate-900">{children}</dd>
    </div>
  );
}

// Shows a link or image for uploaded documents, plain text otherwise
function Doc({ value, image = false }) {
  if (!hasValue(value)) return <span className="text-slate-400">Not provided</span>;
  if (!isLink(value)) return <span>{value}</span>;
  return image ? (
    <a href={value} target="_blank" rel="noreferrer">
      <img src={value} alt="Face verification" className="h-24 w-24 rounded-lg border border-slate-200 object-cover" />
    </a>
  ) : (
    <a href={value} target="_blank" rel="noreferrer" className="font-medium text-primary-700 underline-offset-4 hover:underline">
      Open document
    </a>
  );
}

export default function BenefitDetail() {
  const [params] = useSearchParams();
  const id = params.get("id");
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [mode, setMode] = useState(null); // "approve" | "reject" | "pay"
  const [busy, setBusy] = useState(false);
  const [approvedAmount, setApprovedAmount] = useState("");
  const [adminNote, setAdminNote] = useState("");
  const [reason, setReason] = useState("");
  const [reference, setReference] = useState("");

  const load = useCallback(() => {
    if (!id) {
      setError("No request was selected. Go back to the list and choose one.");
      return;
    }
    benefitApi.admin
      .get(id)
      .then(({ data }) => {
        setData(data);
        setApprovedAmount(String(data.benefit.approvedAmount || data.benefit.amount));
      })
      .catch((err) => setError(getError(err)));
  }, [id]);

  useEffect(load, [load]);

  const run = async (action, success) => {
    setBusy(true);
    try {
      await action();
      toast.success(success);
      setMode(null);
      load();
    } catch (err) {
      const missing = err?.response?.data?.missing;
      toast.error(missing?.length ? `${getError(err)}: ${missing.map((m) => m.label).join(", ")}` : getError(err));
    } finally {
      setBusy(false);
    }
  };

  if (error) return <div className="mx-auto max-w-3xl px-4 py-8"><EmptyState title="Couldn't load this request" text={error} action={<Link to={LIST_PATH} className={ghostBtn}>Back to requests</Link>} /></div>;
  if (!data) return <Spinner />;

  const { benefit: b, applicant: a, requirements, attendance } = data;
  const allMet = requirements.every((r) => r.met);
  const nin = a.identityVerification?.nin;
  const canApprove = b.status === "pending" && allMet && !a.isBlacklisted;

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-8 sm:px-6">
      <PageHeader
        title={b.title}
        text={`${b.requestRef} · Benefit number ${b.benefitNumber}`}
        action={
          <div className="flex items-center gap-3">
            <StatusBadge status={b.status} />
            <Link to={LIST_PATH} className="text-sm font-medium text-slate-600 underline-offset-4 hover:underline">
              All requests
            </Link>
          </div>
        }
      />

      {/* Decision */}
      <Card title="Decision">
        {b.status === "pending" && (
          <>
            {!allMet && (
              <p className="mb-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
                This applicant hasn't met every requirement, so the request can't be approved yet.
              </p>
            )}
            {a.isBlacklisted && (
              <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                This applicant is blacklisted, so the request can't be approved.
              </p>
            )}
          </>
        )}

        {b.status === "rejected" && <p className="text-sm text-slate-700">Rejected: {b.rejectionReason}</p>}
        {b.status === "paid" && (
          <p className="text-sm text-slate-700">
            Paid {naira(b.approvedAmount)} on {fmtDate(b.paidAt, true)}. Reference {b.paymentReference}.
          </p>
        )}

        {mode === null && (b.status === "pending" || b.status === "approved") && (
          <div className="flex flex-wrap gap-3">
            {b.status === "pending" && (
              <>
                <button type="button" className={primaryBtn} disabled={!canApprove} onClick={() => setMode("approve")}>
                  Approve
                </button>
                <button type="button" className={ghostBtn} onClick={() => setMode("reject")}>
                  Reject
                </button>
              </>
            )}
            {b.status === "approved" && (
              <>
                <p className="w-full text-sm text-slate-600">
                  Approved for {naira(b.approvedAmount)}. Mark it as paid once the money has been sent.
                </p>
                <button type="button" className={primaryBtn} onClick={() => setMode("pay")}>
                  Mark as paid
                </button>
              </>
            )}
          </div>
        )}

        {mode === "approve" && (
          <form
            className="max-w-md space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              run(() => benefitApi.admin.approve(id, { approvedAmount: Number(approvedAmount), adminNote }), "Request approved");
            }}
          >
            <div>
              <label htmlFor="approvedAmount" className="mb-1.5 block text-sm font-medium text-slate-700">
                Amount to approve (₦)
              </label>
              <input id="approvedAmount" type="number" min="1" max={b.amount} value={approvedAmount} onChange={(e) => setApprovedAmount(e.target.value)} className={inputCls} />
              <p className="mt-1.5 text-xs text-slate-500">Requested {naira(b.amount)}. You can approve less, not more.</p>
            </div>
            <div>
              <label htmlFor="adminNote" className="mb-1.5 block text-sm font-medium text-slate-700">
                Note <span className="font-normal text-slate-400">(optional)</span>
              </label>
              <textarea id="adminNote" rows={2} value={adminNote} onChange={(e) => setAdminNote(e.target.value)} className={inputCls} />
            </div>
            <div className="flex gap-3">
              <button type="submit" disabled={busy} className={primaryBtn}>
                {busy && <Loader2 className="h-4 w-4 animate-spin" />} Approve request
              </button>
              <button type="button" className={ghostBtn} onClick={() => setMode(null)}>Cancel</button>
            </div>
          </form>
        )}

        {mode === "reject" && (
          <form
            className="max-w-md space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              run(() => benefitApi.admin.reject(id, reason), "Request rejected");
            }}
          >
            <div>
              <label htmlFor="reason" className="mb-1.5 block text-sm font-medium text-slate-700">
                Reason for rejection
              </label>
              <textarea id="reason" rows={3} required value={reason} onChange={(e) => setReason(e.target.value)} placeholder="The applicant will see this." className={inputCls} />
            </div>
            <div className="flex gap-3">
              <button type="submit" disabled={busy || reason.trim().length < 3} className={dangerBtn}>
                {busy && <Loader2 className="h-4 w-4 animate-spin" />} Reject request
              </button>
              <button type="button" className={ghostBtn} onClick={() => setMode(null)}>Cancel</button>
            </div>
          </form>
        )}

        {mode === "pay" && (
          <form
            className="max-w-md space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              run(() => benefitApi.admin.pay(id, reference), "Marked as paid");
            }}
          >
            <div>
              <label htmlFor="reference" className="mb-1.5 block text-sm font-medium text-slate-700">
                Payment reference <span className="font-normal text-slate-400">(optional)</span>
              </label>
              <input id="reference" value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Transfer or receipt number" className={inputCls} />
              <p className="mt-1.5 text-xs text-slate-500">
                {naira(b.approvedAmount)} will be added to the applicant's account balance.
              </p>
            </div>
            <div className="flex gap-3">
              <button type="submit" disabled={busy} className={primaryBtn}>
                {busy && <Loader2 className="h-4 w-4 animate-spin" />} Confirm payment
              </button>
              <button type="button" className={ghostBtn} onClick={() => setMode(null)}>Cancel</button>
            </div>
          </form>
        )}
      </Card>

      <div className="grid gap-6 lg:grid-cols-5">
        <Card title="Qualification requirements" className="lg:col-span-2 lg:self-start">
          <Checklist items={requirements} />
        </Card>

        <Card title="Request" className="lg:col-span-3">
          <dl className="divide-y divide-slate-100">
            <Row label="Amount requested">{naira(b.amount)}</Row>
            <Row label="Category">{CATEGORY_LABELS[b.category] || b.category}</Row>
            <Row label="Needed by">{fmtDate(b.neededBy)}</Row>
            <Row label="Submitted">{fmtDate(b.createdAt, true)}</Row>
            <Row label="Description"><span className="whitespace-pre-wrap">{b.description}</span></Row>
            {b.adminNote && <Row label="Admin note">{b.adminNote}</Row>}
            {b.nextAttendanceDue && <Row label="Next venue visit due">{fmtDate(b.nextAttendanceDue)}{b.absenceFlagged ? " (missed)" : ""}</Row>}
          </dl>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card title="Applicant">
          <dl className="divide-y divide-slate-100">
            <Row label="Name">{fullName(a)}</Row>
            <Row label="Email">{a.email || "—"}</Row>
            <Row label="Phone">{hasValue(a.phoneNumber) ? a.phoneNumber : "—"}</Row>
            <Row label="Date of birth">{a.dateOfBirth || "—"}</Row>
            <Row label="Address">
              {[a.address, a.localGovernment, a.state, a.country].filter(hasValue).join(", ") || "—"}
            </Row>
            <Row label="Face"><Doc value={a.faceData} image /></Row>
          </dl>
        </Card>

        <Card title="Documents and identity">
          <dl className="divide-y divide-slate-100">
            <Row label="NIN">
              {a.isNINVerified || nin?.verified
                ? `Verified${nin?.matchedName ? ` as ${nin.matchedName}` : ""}${nin?.last4 ? ` (ends ${nin.last4})` : ""}`
                : "Not verified"}
            </Row>
            <Row label="TIN">{hasValue(a.TIN) ? a.TIN : <span className="text-slate-400">Not provided</span>}</Row>
            <Row label="Tenancy agreement"><Doc value={a.tenancyAgreement} /></Row>
            <Row label="Residence evidence"><Doc value={a.scanningEvidence} /></Row>
            <Row label="Residential card"><Doc value={a.residentialCard} /></Row>
          </dl>
        </Card>

        <Card title="Bank account">
          <dl className="divide-y divide-slate-100">
            <Row label="Bank">{hasValue(a.bankName) ? a.bankName : "—"}</Row>
            <Row label="Account name">{hasValue(a.bankAcctName) ? a.bankAcctName : "—"}</Row>
            <Row label="Account number">{hasValue(a.bankAcctNum) ? a.bankAcctNum : "—"}</Row>
          </dl>
        </Card>

        <Card title="Next of kin">
          <dl className="divide-y divide-slate-100">
            <Row label="Name">{hasValue(a.nextOfKin) ? a.nextOfKin : "—"}</Row>
            <Row label="Relationship">{hasValue(a.nextOfKinRelationship) ? a.nextOfKinRelationship : "—"}</Row>
            <Row label="Phone">{hasValue(a.nextOfKinNumber) ? a.nextOfKinNumber : "—"}</Row>
            <Row label="Address">{hasValue(a.nextOfKinAddress) ? a.nextOfKinAddress : "—"}</Row>
          </dl>
        </Card>
      </div>

      <Card title={`Guarantors${a.guarantorVerified ? " (verified)" : ""}`}>
        {a.guarantors?.length ? (
          <ul className="grid gap-3 sm:grid-cols-2">
            {a.guarantors.map((g, i) => (
              <li key={g._id || i} className="rounded-xl border border-slate-200 p-4 text-sm">
                {/* Shows whatever fields your guarantorModel holds */}
                {Object.entries(g)
                  .filter(([k, v]) => !["_id", "__v", "createdAt", "updatedAt", "user"].includes(k) && hasValue(v) && typeof v !== "object")
                  .map(([k, v]) => (
                    <p key={k} className="flex justify-between gap-3 py-0.5">
                      <span className="capitalize text-slate-500">{k.replace(/([A-Z])/g, " $1")}</span>
                      <span className="break-words text-right text-slate-900">{isLink(v) ? <Doc value={v} /> : String(v)}</span>
                    </p>
                  ))}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-slate-500">No guarantor details provided.</p>
        )}
      </Card>

      <Card title="Venue visits">
        {attendance.length === 0 ? (
          <p className="text-sm text-slate-500">No venue visits recorded yet.</p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {attendance.map((r) => (
              <li key={r._id} className="rounded-md bg-slate-100 px-2.5 py-1 text-xs text-slate-700">
                {fmtDate(r.checkedInAt, true)}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}