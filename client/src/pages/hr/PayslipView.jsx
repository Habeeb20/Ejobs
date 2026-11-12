import { Printer } from "lucide-react";
import { Btn, Modal, money, monthLabel, fmtDate } from "./HrUi";

const Row = ({ label, value, bold, tone }) => (
    <div className={`flex justify-between py-1.5 text-sm ${bold ? "font-bold" : ""} ${tone === "neg" ? "text-red-600" : ""}`}><span>{label}</span><span>{value}</span></div>
);

/** A payslip you can read and print (Print -> Save as PDF). Used by the employer and the employee. */
export default function PayslipView({ payslip: p, company, onClose }) {
    if (!p) return null;
    const c = p.currency;
    const extras = (p.adjustments || []).filter((a) => a.kind !== "deduction");
    const deductions = (p.adjustments || []).filter((a) => a.kind === "deduction");
    return (
        <Modal open onClose={onClose} title={`Payslip: ${monthLabel(p.month)}`} wide>
            <style>{`@media print { body * { visibility: hidden !important; } #payslip-print, #payslip-print * { visibility: visible !important; } #payslip-print { position: absolute; left: 0; top: 0; width: 100%; padding: 24px; } }`}</style>
            <div id="payslip-print" className="text-slate-900">
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 pb-4">
                    <div><h3 className="text-xl font-extrabold text-orange-700">{company?.companyName || "Payslip"}</h3>{company?.address && <p className="text-sm text-slate-500">{company.address}</p>}</div>
                    <div className="text-right text-sm"><p className="font-bold">{monthLabel(p.month)}</p><p className="text-slate-500">{p.status}{p.paidAt ? `, paid ${fmtDate(p.paidAt)}` : ""}</p></div>
                </div>
                <div className="grid gap-x-6 gap-y-1 py-4 text-sm sm:grid-cols-2">
                    <p><span className="text-slate-500">Employee: </span><strong>{p.snapshot?.fullName}</strong></p>
                    <p><span className="text-slate-500">Staff ID: </span>{p.snapshot?.staffId}</p>
                    <p><span className="text-slate-500">Role: </span>{p.snapshot?.jobTitle}</p>
                    <p><span className="text-slate-500">Department: </span>{p.snapshot?.department || "-"}</p>
                    {p.snapshot?.bank?.accountNumber && <p className="sm:col-span-2"><span className="text-slate-500">Paid to: </span>{p.snapshot.bank.name} · {p.snapshot.bank.accountNumber}</p>}
                </div>
                <div className="grid gap-6 sm:grid-cols-2">
                    <div>
                        <h4 className="mb-1 border-b border-slate-200 pb-1 text-xs font-bold uppercase tracking-wide text-slate-500">Earnings</h4>
                        <Row label="Basic salary" value={money(p.basic, c)} />
                        {(p.allowances || []).map((a) => <Row key={a.name} label={a.name} value={money(a.amount, c)} />)}
                        {extras.map((a, i) => <Row key={i} label={`${a.name} (${a.kind})`} value={money(a.amount, c)} />)}
                        {p.unpaidLeaveDeduction > 0 && <Row label={`Unpaid days (${p.unpaidLeaveDays})`} value={`- ${money(p.unpaidLeaveDeduction, c)}`} tone="neg" />}
                        <Row label="Gross pay" value={money(p.gross, c)} bold />
                    </div>
                    <div>
                        <h4 className="mb-1 border-b border-slate-200 pb-1 text-xs font-bold uppercase tracking-wide text-slate-500">Deductions</h4>
                        <Row label="Pension (employee)" value={money(p.pension, c)} />
                        {p.nhf > 0 && <Row label="National Housing Fund" value={money(p.nhf, c)} />}
                        <Row label="PAYE tax" value={money(p.paye, c)} />
                        {deductions.map((a, i) => <Row key={i} label={a.name} value={money(a.amount, c)} />)}
                        <Row label="Total deductions" value={money(p.totalDeductions, c)} bold />
                    </div>
                </div>
                <div className="mt-4 flex items-center justify-between rounded-2xl bg-orange-50 px-4 py-3">
                    <span className="font-bold">Net pay</span><span className="text-2xl font-extrabold text-orange-700">{money(p.net, c)}</span>
                </div>
                <p className="mt-3 text-xs text-slate-400">Employer pension contribution: {money(p.employerPension, c)}. PAYE is an estimate based on the tax bands set by your employer.</p>
            </div>
            <div className="mt-4 flex justify-end print:hidden"><Btn variant="outline" onClick={() => window.print()}><Printer size={16} /> Print or save as PDF</Btn></div>
        </Modal>
    );
}