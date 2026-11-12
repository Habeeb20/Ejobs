import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { hrApi } from "./hrApi";
import MediaUpload from "../../utils/MediaUpload";
import { Btn, Field, inputCls, toastErr, today, iso } from "./hrUi";

const TYPES = ["Full-time", "Part-time", "Contract", "Intern", "Casual"];
const blank = {
  firstName: "", middleName: "", lastName: "", email: "", phone: "", gender: "", dateOfBirth: "", maritalStatus: "", state: "", localGovernment: "", address: "", photo: "",
  jobTitle: "", department: "", employmentType: "Full-time", workLocation: "", hireDate: today(), probationEndDate: "", contractEndDate: "",
  basic: "", allowances: [], annualRent: "", bankName: "", accountName: "", accountNumber: "", taxId: "", pensionNumber: "", nhfNumber: "",
  ecName: "", ecRelationship: "", ecPhone: "", ecAddress: "", notes: "",
};
const fromEmployee = (e) => ({
  ...blank, ...Object.fromEntries(["firstName", "middleName", "lastName", "email", "phone", "gender", "maritalStatus", "state", "localGovernment", "address", "photo", "jobTitle", "department", "employmentType", "workLocation", "notes"].map((k) => [k, e[k] ?? ""])),
  dateOfBirth: iso(e.dateOfBirth), hireDate: iso(e.hireDate), probationEndDate: iso(e.probationEndDate), contractEndDate: iso(e.contractEndDate),
  basic: e.compensation?.basic ?? "", annualRent: e.compensation?.annualRent || "", allowances: (e.compensation?.allowances || []).map((a) => ({ name: a.name, amount: a.amount, pensionable: !!a.pensionable })),
  bankName: e.compensation?.bank?.name || "", accountName: e.compensation?.bank?.accountName || "", accountNumber: e.compensation?.bank?.accountNumber || "",
  taxId: e.compensation?.taxId || "", pensionNumber: e.compensation?.pensionNumber || "", nhfNumber: e.compensation?.nhfNumber || "",
  ecName: e.emergencyContact?.name || "", ecRelationship: e.emergencyContact?.relationship || "", ecPhone: e.emergencyContact?.phone || "", ecAddress: e.emergencyContact?.address || "",
});
const toPayload = (f) => ({
  firstName: f.firstName, middleName: f.middleName, lastName: f.lastName, email: f.email, phone: f.phone, gender: f.gender, dateOfBirth: f.dateOfBirth || undefined,
  maritalStatus: f.maritalStatus, state: f.state, localGovernment: f.localGovernment, address: f.address, photo: f.photo,
  jobTitle: f.jobTitle, department: f.department, employmentType: f.employmentType, workLocation: f.workLocation, hireDate: f.hireDate,
  probationEndDate: f.probationEndDate, contractEndDate: f.contractEndDate, notes: f.notes,
  emergencyContact: { name: f.ecName, relationship: f.ecRelationship, phone: f.ecPhone, address: f.ecAddress },
  compensation: {
    basic: f.basic === "" ? 0 : Number(f.basic), annualRent: f.annualRent === "" ? 0 : Number(f.annualRent), allowances: f.allowances.map((a) => ({ ...a, amount: Number(a.amount) || 0 })),
    taxId: f.taxId, pensionNumber: f.pensionNumber, nhfNumber: f.nhfNumber, bank: { name: f.bankName, accountName: f.accountName, accountNumber: f.accountNumber },
  },
});

const Section = ({ title, children }) => (<fieldset className="space-y-4"><legend className="mb-1 text-sm font-bold uppercase tracking-wide text-slate-400">{title}</legend>{children}</fieldset>);

/**
 * mode "create": add a staff member by hand
 * mode "edit":   change an existing record (initial = the employee)
 * mode "hire":   turn an applicant with an offer into staff (applicationId); their profile is filled in for you
 */
export default function EmployeeForm({ mode = "create", initial, settings, applicationId, defaults = {}, onSaved, onCancel }) {
  const [f, setF] = useState(initial ? fromEmployee(initial) : { ...blank, ...defaults });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }));
  const hire = mode === "hire";
  const departments = settings?.departments || [];

  const setAllowance = (i, patch) => setF((x) => ({ ...x, allowances: x.allowances.map((a, j) => (j === i ? { ...a, ...patch } : a)) }));

  const submit = async (e) => {
    e.preventDefault();
    const need = hire ? ["jobTitle", "hireDate"] : ["firstName", "lastName", "email", "jobTitle", "hireDate"];
    const err = {};
    need.forEach((k) => { if (!String(f[k]).trim()) err[k] = "Required"; });
    if (!hire && f.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email)) err.email = "Enter a valid email";
    setErrors(err);
    if (Object.keys(err).length) return toast.error("Please fill in the highlighted fields");

    setBusy(true);
    try {
      const payload = toPayload(f);
      if (hire) { for (const k of ["firstName", "middleName", "lastName", "email", "phone", "gender", "dateOfBirth", "maritalStatus", "state", "localGovernment", "address", "photo", "emergencyContact"]) delete payload[k]; }
      const r = mode === "edit" ? await hrApi.updateEmployee(initial._id, payload) : hire ? await hrApi.hireFromApplication(applicationId, payload) : await hrApi.addEmployee(payload);
      toast.success(mode === "edit" ? "Details saved" : "Added to your staff. They have been emailed.");
      onSaved?.(r.data.employee);
    } catch (e2) { toastErr(e2); }
    finally { setBusy(false); }
  };

  return (
    <form onSubmit={submit} className="space-y-6">
      {!hire && (
        <Section title="Personal">
          <MediaUpload value={f.photo ? { url: f.photo, type: "image" } : null} onChange={(v) => setF((x) => ({ ...x, photo: v?.url || "" }))} accept="image" folder="ejob/staff" label="Photo (optional)" />
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="First name" error={errors.firstName}><input className={inputCls} value={f.firstName} onChange={set("firstName")} /></Field>
            <Field label="Middle name"><input className={inputCls} value={f.middleName} onChange={set("middleName")} /></Field>
            <Field label="Last name" error={errors.lastName}><input className={inputCls} value={f.lastName} onChange={set("lastName")} /></Field>
            <Field label="Email" error={errors.email} hint="Used for their login link and email notices"><input type="email" className={inputCls} value={f.email} onChange={set("email")} /></Field>
            <Field label="Phone"><input className={inputCls} value={f.phone} onChange={set("phone")} /></Field>
            <Field label="Gender"><select className={inputCls} value={f.gender} onChange={set("gender")}><option value="">Select…</option><option>Female</option><option>Male</option></select></Field>
            <Field label="Date of birth"><input type="date" max={today()} className={inputCls} value={f.dateOfBirth} onChange={set("dateOfBirth")} /></Field>
            <Field label="Marital status"><select className={inputCls} value={f.maritalStatus} onChange={set("maritalStatus")}><option value="">Select…</option>{["Single", "Married", "Divorced", "Widowed"].map((s) => <option key={s}>{s}</option>)}</select></Field>
            <Field label="State"><input className={inputCls} value={f.state} onChange={set("state")} /></Field>
            <Field label="Local government"><input className={inputCls} value={f.localGovernment} onChange={set("localGovernment")} /></Field>
            <Field label="Home address" className="sm:col-span-2"><input className={inputCls} value={f.address} onChange={set("address")} /></Field>
          </div>
        </Section>
      )}

      <Section title="Job">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Job title" error={errors.jobTitle}><input className={inputCls} value={f.jobTitle} onChange={set("jobTitle")} /></Field>
          <Field label="Department"><input list="hr-depts" className={inputCls} value={f.department} onChange={set("department")} /><datalist id="hr-depts">{departments.map((d) => <option key={d} value={d} />)}</datalist></Field>
          <Field label="Employment type"><select className={inputCls} value={f.employmentType} onChange={set("employmentType")}>{TYPES.map((t) => <option key={t}>{t}</option>)}</select></Field>
          <Field label="Work location"><input className={inputCls} value={f.workLocation} onChange={set("workLocation")} placeholder="Head office, Remote ..." /></Field>
          <Field label="Hire date" error={errors.hireDate}><input type="date" className={inputCls} value={f.hireDate} onChange={set("hireDate")} /></Field>
          <Field label="Probation ends"><input type="date" className={inputCls} value={f.probationEndDate} onChange={set("probationEndDate")} /></Field>
          {f.employmentType === "Contract" && <Field label="Contract ends"><input type="date" className={inputCls} value={f.contractEndDate} onChange={set("contractEndDate")} /></Field>}
        </div>
      </Section>

      <Section title="Pay (monthly)">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Basic salary (₦)"><input type="number" min="0" className={inputCls} value={f.basic} onChange={set("basic")} /></Field>
          <Field label="Annual rent paid (₦)" hint="Used for rent relief on PAYE tax"><input type="number" min="0" className={inputCls} value={f.annualRent} onChange={set("annualRent")} /></Field>
        </div>
        <div className="space-y-2">
          <p className="text-sm font-medium text-slate-700">Allowances</p>
          {f.allowances.map((a, i) => (
            <div key={i} className="flex flex-wrap items-center gap-2">
              <input className={`${inputCls} min-w-0 flex-1`} placeholder="Housing, Transport ..." value={a.name} onChange={(e) => setAllowance(i, { name: e.target.value })} />
              <input type="number" min="0" className={`${inputCls} w-32`} placeholder="Amount" value={a.amount} onChange={(e) => setAllowance(i, { amount: e.target.value })} />
              <label className="flex items-center gap-1.5 text-xs text-slate-600"><input type="checkbox" className="accent-orange-600" checked={a.pensionable} onChange={(e) => setAllowance(i, { pensionable: e.target.checked })} /> Pensionable</label>
              <button type="button" aria-label="Remove allowance" onClick={() => setF((x) => ({ ...x, allowances: x.allowances.filter((_, j) => j !== i) }))} className="grid h-9 w-9 place-items-center rounded-lg text-red-600 hover:bg-red-50"><Trash2 size={16} /></button>
            </div>
          ))}
          <Btn type="button" variant="soft" onClick={() => setF((x) => ({ ...x, allowances: [...x.allowances, { name: "", amount: "", pensionable: false }] }))}><Plus size={15} /> Add allowance</Btn>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Bank"><input className={inputCls} value={f.bankName} onChange={set("bankName")} /></Field>
          <Field label="Account name"><input className={inputCls} value={f.accountName} onChange={set("accountName")} /></Field>
          <Field label="Account number"><input className={inputCls} inputMode="numeric" maxLength={20} value={f.accountNumber} onChange={set("accountNumber")} /></Field>
          <Field label="Tax ID (TIN)"><input className={inputCls} value={f.taxId} onChange={set("taxId")} /></Field>
          <Field label="Pension number"><input className={inputCls} value={f.pensionNumber} onChange={set("pensionNumber")} /></Field>
          <Field label="NHF number"><input className={inputCls} value={f.nhfNumber} onChange={set("nhfNumber")} /></Field>
        </div>
      </Section>

      {!hire && (
        <Section title="Emergency contact">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Name"><input className={inputCls} value={f.ecName} onChange={set("ecName")} /></Field>
            <Field label="Relationship"><input className={inputCls} value={f.ecRelationship} onChange={set("ecRelationship")} /></Field>
            <Field label="Phone"><input className={inputCls} value={f.ecPhone} onChange={set("ecPhone")} /></Field>
            <Field label="Address"><input className={inputCls} value={f.ecAddress} onChange={set("ecAddress")} /></Field>
          </div>
        </Section>
      )}

      <Section title="Private notes (only you can see these)">
        <textarea rows={3} className={inputCls} value={f.notes} onChange={set("notes")} />
      </Section>

      <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-4">
        {onCancel && <Btn type="button" variant="ghost" onClick={onCancel}>Cancel</Btn>}
        <Btn loading={busy}>{mode === "edit" ? "Save changes" : hire ? "Add to staff" : "Add employee"}</Btn>
      </div>
    </form>
  );
}