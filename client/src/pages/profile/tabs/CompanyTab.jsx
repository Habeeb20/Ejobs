import FileUpload from "../components/FileUpload";
import { FormShell, SelectField, TextAreaField, TextField } from "../components/fields";
import useTabForm from "../useTabForm";
import { COMPANY_SIZES, EMPLOYER_TYPES } from "../profileOptions";

const FIELDS = ["avatar", "companyName", "employerType", "size", "yearOfEstablishment", "aboutUs"];

export default function CompanyTab({ user, onSave }) {
  const f = useTabForm(FIELDS, user, onSave);

  return (
    <FormShell form={f} title="Company" description="This is what candidates see on your listings.">
      <FileUpload variant="avatar" label="Company logo" hint="Square image works best" className="sm:col-span-2" {...f.bind("avatar")} />
      <TextField label="Company name" {...f.bind("companyName")} />
      <SelectField label="Employer type" options={EMPLOYER_TYPES} {...f.bind("employerType")} />
      <SelectField label="Company size" options={COMPANY_SIZES} {...f.bind("size")} />
      <TextField type="number" label="Year established" min="1800" max={new Date().getFullYear()} {...f.bind("yearOfEstablishment")} />
      <TextAreaField className="sm:col-span-2" label="About us" maxLength={1000} placeholder="Tell candidates what your company does…" {...f.bind("aboutUs")} />
    </FormShell>
  );
}