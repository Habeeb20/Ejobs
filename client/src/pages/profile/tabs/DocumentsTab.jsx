import FileUpload from "../components/FileUpload";
import { FormShell } from "../components/fields";
import useTabForm from "../useTabForm";

const DOCS = {
  jobseeker: [
    { key: "votersCard", label: "Voter's card" },
    { key: "residentialCard", label: "Residential card" },
    { key: "scanningEvidence", label: "Proof of residence", hint: "Utility bill or similar" },
    { key: "tenancyAgreement", label: "Tenancy agreement" },
  ],
  employer: [
    { key: "certificate", label: "Business registration certificate", hint: "CAC certificate (image or PDF)" },
  ],
};
const FIELDS = Object.fromEntries(Object.entries(DOCS).map(([role, docs]) => [role, docs.map((d) => d.key)]));
const NONE = [];

export default function DocumentsTab({ user, onSave }) {
  const f = useTabForm(FIELDS[user.role] || NONE, user, onSave);

  return (
    <FormShell form={f} title="Documents" description="Upload clear photos or PDFs. Files are stored securely on Cloudinary.">
      {(DOCS[user.role] || []).map((d) => (
        <FileUpload key={d.key} label={d.label} hint={d.hint} {...f.bind(d.key)} />
      ))}
    </FormShell>
  );
}