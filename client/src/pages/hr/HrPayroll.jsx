import { useState } from "react";
import { Wand2, Send, BadgeCheck, Eye, Pencil, RefreshCw, Trash2, Download, Plus } from "lucide-react";
import { toast } from "sonner";
import { hrApi } from "../../api";
import { Btn, Card, Kpi, StatusBadge, Modal, Spinner, Empty, Field, inputCls, useAsync, useHrEvents, money, monthLabel, thisMonth, toastErr, csv } from "./hrUi";
import PayslipView from "./PayslipView";

const KINDS = [["bonus", "Bonus"], ["overtime", "Overtime"], ["reimbursement", "Reimbursement"], ["deduction", "Deduction"]];

export default function HrPayroll({ user }) {
  const [month, setMonth] = useState(thisMonth());
  const [busy, setBusy] = useState("");
  const [edit, setEdit] = useState(null);
  const [view, setView] = useState(null);
  const [paying, setPaying] = useState(false);
  const [ref, setRef] = useState("");
  const { data, loading, reload } = useAsync(() => hrApi.payroll(month), [month]);
  useHrEvents(["payroll"], reload);
  const company = { companyName: user?.companyName, address: user?.address };

  const run = async (key, fn, ok) => { setBusy(key); try { const r = await fn(); toast.success(typeof ok === "function" ? ok(r.data) : ok); reload(); } catch (e) { toastErr(e); } finally { setBusy(""); } };
  const drafts = data?.statusCounts?.Draft || 0, published = data?.statusCounts?.Published || 0;
  const t = data?.totals;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white p-4 shadow-sm sm:p-5">
        <div className="flex items-center gap-3"><h2 className="text-lg font-bold">Payroll</h2><input type="month" max={thisMonth()} value={month} onChange={(e) => setMonth(e.target.value || thisMonth())} className="rounded-xl border border-slate-300 px-3 py-2 text-sm" aria-label="Month" /></div>
        <div className="flex flex-wrap gap-2">
          <Btn variant="outline" loading={busy === "gen"} onClick={() => run("gen", () => hrApi.generatePayroll(month), (d) => `${d.created} draft payslip${d.created === 1 ? "" : "s"} created`)}><Wand2 size={16} /> Generate{data?.waitingForPayslip ? ` (${data.waitingForPayslip})` : ""}</Btn>
          <Btn disabled={!drafts} loading={busy === "pub"} onClick={() => window.confirm(`Publish ${drafts} draft payslip(s)? Each employee is notified instantly and by email.`) && run("pub", () => hrApi.publishPayroll(month), (d) => `${d.published} payslip(s) published`)}><Send size={16} /> Publish {drafts || ""}</Btn>
          <Btn variant="success" disabled={!published} onClick={() => setPaying(true)}><BadgeCheck size={16} /> Mark paid {published || ""}</Btn>
        </div>
      </div>

      {loading ? <Spinner label="Loading payroll…" /> : !data?.payslips?.length ? (
        <Empty icon={Wand2} title={`No payslips for ${monthLabel(month)}`} text="Generate creates a draft payslip for everyone with a salary: pension, NHF and PAYE tax are worked out for you, and unpaid leave is deducted. Review, adjust, then publish.">
          <Btn loading={busy === "gen"} onClick={() => run("gen", () => hrApi.generatePayroll(month), (d) => `${d.created} draft payslip(s) created`)}><Wand2 size={16} /> Generate payroll</Btn>
        </Empty>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
            <Kpi label="Payslips" value={t.count} hint={`${drafts} draft · ${published} published · ${data.statusCounts.Paid} paid`} />
            <Kpi label="Gross pay" value={money(t.gross)} /><Kpi label="Net pay" value={money(t.net)} tone="green" />
            <Kpi label="PAYE tax" value={money(t.paye)} hint="Remit to your state tax authority" /><Kpi label="Pension" value={money(t.pension + t.nhf)} hint={`Employer adds ${money(t.employerPension)}`} />
          </div>
          <Card title={monthLabel(month)} action={<Btn variant="outline" onClick={() => csv(`bank-schedule-${month}.csv`, [["Staff ID", "Name", "Bank", "Account name", "Account number", "Net pay", "Status"], ...data.payslips.map((p) => [p.snapshot?.staffId, p.snapshot?.fullName, p.snapshot?.bank?.name, p.snapshot?.bank?.accountName, p.snapshot?.bank?.accountNumber, p.net, p.status])])}><Download size={15} /> Bank schedule</Btn>}>
            <div className="overflow-x-auto"><table className="w-full min-w-[44rem] text-sm"><thead><tr className="border-b border-slate-100 text-left text-xs text-slate-400"><th className="py-2">Employee</th><th className="text-right">Gross</th><th className="text-right">Deductions</th><th className="text-right">Net</th><th className="text-center">Status</th><th /></tr></thead>
              <tbody>{data.payslips.map((p) => (
                <tr key={p._id} className="border-b border-slate-50"><td className="py-2.5"><p className="font-semibold">{p.snapshot?.fullName}</p><p className="text-xs text-slate-400">{p.snapshot?.staffId} · {p.snapshot?.jobTitle}</p></td>
                  <td className="text-right">{money(p.gross, p.currency)}</td><td className="text-right text-slate-500">{money(p.totalDeductions, p.currency)}</td><td className="text-right font-bold">{money(p.net, p.currency)}</td><td className="text-center"><StatusBadge status={p.status} /></td>
                  <td className="whitespace-nowrap text-right"><button aria-label="View" onClick={() => setView(p)} className="rounded-lg p-2 hover:bg-slate-100"><Eye size={16} /></button>
                    {p.status === "Draft" && <><button aria-label="Edit" onClick={() => setEdit(p)} className="rounded-lg p-2 hover:bg-slate-100"><Pencil size={16} /></button>
                      <button aria-label="Recalculate" onClick={() => run("re" + p._id, () => hrApi.recalcPayslip(p._id), "Recalculated from the latest salary details")} className="rounded-lg p-2 hover:bg-slate-100"><RefreshCw size={16} /></button>
                      <button aria-label="Delete" onClick={() => window.confirm("Delete this draft payslip?") && run("del", () => hrApi.deletePayslip(p._id), "Draft deleted")} className="rounded-lg p-2 text-red-600 hover:bg-red-50"><Trash2 size={16} /></button></>}</td></tr>))}</tbody></table></div>
            <p className="mt-3 text-xs text-slate-400">PAYE is an estimate from the tax bands in HR settings. Check the figures with your accountant before paying.</p>
          </Card>
        </>
      )}

      {edit && <EditSlip slip={edit} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); reload(); }} />}
      {view && <PayslipView payslip={view} company={company} onClose={() => setView(null)} />}
      <Modal open={paying} onClose={() => setPaying(false)} title="Mark as paid">
        <div className="space-y-4"><p className="text-sm text-slate-600">{published} published payslip(s) for {monthLabel(month)} will be marked paid and each employee is told their salary was paid.</p>
          <Field label="Payment reference (optional)"><input className={inputCls} value={ref} onChange={(e) => setRef(e.target.value)} placeholder="Bulk transfer ref" /></Field>
          <div className="flex justify-end gap-2"><Btn variant="ghost" onClick={() => setPaying(false)}>Cancel</Btn><Btn variant="success" loading={busy === "paid"} onClick={async () => { await run("paid", () => hrApi.markPaid(month, ref), (d) => `${d.paid} marked as paid`); setPaying(false); setRef(""); }}>Confirm</Btn></div></div>
      </Modal>
    </div>
  );
}

function EditSlip({ slip, onClose, onSaved }) {
  const [adj, setAdj] = useState((slip.adjustments || []).map((a) => ({ ...a })));
  const [unpaid, setUnpaid] = useState(slip.unpaidLeaveDays || 0);
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(slip);
  const save = async () => {
    setBusy(true);
    try { const r = await hrApi.updatePayslip(slip._id, { adjustments: adj.map((a) => ({ ...a, amount: Number(a.amount) || 0 })), unpaidLeaveDays: Number(unpaid) || 0 }); setNow(r.data.payslip); toast.success("Payslip recalculated"); onSaved(); }
    catch (e) { toastErr(e); } finally { setBusy(false); }
  };
  return (
    <Modal open onClose={onClose} title={`Edit payslip: ${slip.snapshot?.fullName}`} wide>
      <div className="grid gap-5 md:grid-cols-2">
        <div className="space-y-3">
          <p className="text-sm font-bold">Adjustments</p>
          {adj.map((a, i) => (
            <div key={i} className="flex flex-wrap items-center gap-2">
              <select className={`${inputCls} w-36`} value={a.kind} onChange={(e) => setAdj(adj.map((x, j) => (j === i ? { ...x, kind: e.target.value } : x)))}>{KINDS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
              <input className={`${inputCls} min-w-0 flex-1`} placeholder="Description" value={a.name} onChange={(e) => setAdj(adj.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} />
              <input type="number" min="0" className={`${inputCls} w-28`} placeholder="₦" value={a.amount} onChange={(e) => setAdj(adj.map((x, j) => (j === i ? { ...x, amount: e.target.value } : x)))} />
              <button aria-label="Remove" onClick={() => setAdj(adj.filter((_, j) => j !== i))} className="rounded-lg p-2 text-red-600 hover:bg-red-50"><Trash2 size={16} /></button>
            </div>))}
          <Btn variant="soft" onClick={() => setAdj([...adj, { kind: "bonus", name: "", amount: "" }])}><Plus size={15} /> Add adjustment</Btn>
          <Field label="Unpaid days" hint="Working days not paid this month (unpaid leave, late start or early exit)"><input type="number" min="0" max="31" className={inputCls} value={unpaid} onChange={(e) => setUnpaid(e.target.value)} /></Field>
        </div>
        <div className="rounded-2xl bg-slate-50 p-4 text-sm">
          <p className="mb-2 font-bold">Current figures</p>
          {[["Gross pay", now.gross], ["Pension", now.pension], ["NHF", now.nhf], ["PAYE tax", now.paye], ["Other deductions", now.otherDeductions]].map(([l, v]) => <p key={l} className="flex justify-between py-1"><span className="text-slate-500">{l}</span><span>{money(v, now.currency)}</span></p>)}
          <p className="mt-2 flex justify-between border-t border-slate-200 pt-2 text-base font-extrabold"><span>Net pay</span><span className="text-orange-700">{money(now.net, now.currency)}</span></p>
          <p className="mt-2 text-xs text-slate-400">Save to recalculate with your changes.</p>
        </div>
      </div>
      <div className="mt-5 flex justify-end gap-2"><Btn variant="ghost" onClick={onClose}>Cancel</Btn><Btn loading={busy} onClick={save}>Save and recalculate</Btn></div>
    </Modal>
  );
}