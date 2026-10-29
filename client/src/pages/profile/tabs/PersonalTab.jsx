import FileUpload from "../components/FileUpload";
import { FormShell, SelectField, TextField } from "../components/fields";
import useTabForm from "../useTabForm";
import { GENDERS, MARITAL } from "../profileOptions";

const BASE = ["avatar", "firstName", "lastName", "gender", "phoneNumber", "whatsappNumber"];
const SEEKER = [...BASE, "middleName", "dateOfBirth", "maritalStatus"];

export default function PersonalTab({ user, onSave }) {
  const seeker = user.role === "jobseeker";
  const f = useTabForm(seeker ? SEEKER : BASE, user, onSave);

  return (
    <FormShell form={f} title="Personal details" description="Tell us who you are.">
      <FileUpload variant="avatar" label="Profile photo" className="sm:col-span-2" {...f.bind("avatar")} />
      <TextField label="First name" autoComplete="given-name" {...f.bind("firstName")} />
      <TextField label="Last name" autoComplete="family-name" {...f.bind("lastName")} />
      {seeker && <TextField label="Middle name" {...f.bind("middleName")} />}
      <SelectField label="Gender" options={GENDERS} {...f.bind("gender")} />
      {seeker && (
        <TextField
          type="date"
          label="Date of birth"
          max={new Date().toISOString().slice(0, 10)}
          {...f.bind("dateOfBirth")}
          value={(f.values.dateOfBirth || "").slice(0, 10)}
        />
      )}
      {seeker && <SelectField label="Marital status" options={MARITAL} {...f.bind("maritalStatus")} />}
      <TextField type="tel" label="Phone number" autoComplete="tel" placeholder="08012345678" {...f.bind("phoneNumber")} />
      <TextField type="tel" label="WhatsApp number" placeholder="Optional" {...f.bind("whatsappNumber")} />
    </FormShell>
  );
}