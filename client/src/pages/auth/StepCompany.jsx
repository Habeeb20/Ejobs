import { useState } from "react";
import { Input, Select, Button } from "../../components/ui";
import StateLgaSelect from "../../components/StateLgaSelect";
import { COMPANY_SIZES } from "../../data/options";

export default function StepCompany({ onSubmit, loading }) {
  const [f, setF] = useState({
    companyName: "", address: "", yearOfEstablishment: "", size: "",
    state: "", localGovernment: "", companyPhone: "",
  });
  const [errors, setErrors] = useState({});
  const set = (k) => (e) => setF((d) => ({ ...d, [k]: e.target.value }));
  const thisYear = new Date().getFullYear();

  const submit = (e) => {
    e.preventDefault();
    const err = {};
    if (!f.companyName.trim()) err.companyName = "Enter your company name";
    if (!f.address.trim()) err.address = "Enter the company address";
    const y = Number(f.yearOfEstablishment);
    if (!Number.isInteger(y) || y < 1800 || y > thisYear) err.yearOfEstablishment = `Enter a year between 1800 and ${thisYear}`;
    if (!f.size) err.size = "Select company size";
    if (!f.state) err.state = "Select a state";
    if (!f.localGovernment) err.localGovernment = "Select an LGA";
    if (f.companyPhone.replace(/\D/g, "").length < 10) err.companyPhone = "Enter a valid phone number";
    setErrors(err);
    if (Object.keys(err).length === 0) onSubmit(f);
  };

  return (
    <form onSubmit={submit} noValidate className="space-y-6">
      <div>
        <h2 className="font-display text-3xl font-bold">Tell us about your company</h2>
        <p className="mt-1 text-ink-500">Candidates see these details before they accept a shortlist.</p>
      </div>

      <Input id="companyName" label="Company name" value={f.companyName} onChange={set("companyName")} error={errors.companyName} autoComplete="organization" />
      <Input id="address" label="Company address" value={f.address} onChange={set("address")} error={errors.address} />

      <div className="grid gap-4 sm:grid-cols-2">
        <Input id="year" type="number" label="Year of establishment" placeholder={String(thisYear - 5)} min="1800" max={thisYear} value={f.yearOfEstablishment} onChange={set("yearOfEstablishment")} error={errors.yearOfEstablishment} />
        <Select id="size" label="Company size" options={COMPANY_SIZES} value={f.size} onChange={set("size")} error={errors.size} />
      </div>

      <StateLgaSelect
        state={f.state}
        lga={f.localGovernment}
        errors={errors}
        onState={(v) => setF((d) => ({ ...d, state: v }))}
        onLga={(v) => setF((d) => ({ ...d, localGovernment: v }))}
      />

      <Input id="companyPhone" type="tel" label="Company phone number" value={f.companyPhone} onChange={set("companyPhone")} error={errors.companyPhone} />

      <Button type="submit" loading={loading}>Finish and start hiring</Button>
    </form>
  );
}
