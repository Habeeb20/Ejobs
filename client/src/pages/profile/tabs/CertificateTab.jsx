import { Award } from "lucide-react";
import SectionManager from "../components/SectionManager";
import FileUpload from "../components/FileUpload";
import { TextField } from "../components/fields";
import { sectionsApi } from "../../../api";
import { fmtMonth } from "../cvFormat";

const BLANK = { name: "", issuer: "", issueDate: "", expiryDate: "", credentialId: "", credentialUrl: "", file: "" };

export default function CertificatesTab({ onCompletion }) {
  return (
    <SectionManager
      title="Certificates" description="Professional certificates and training." noun="certificate" icon={Award}
      api={sectionsApi.certificates} limit={20} blank={BLANK} onCompletion={onCompletion}
      renderItem={(c) => (
        <>
          <p className="font-bold text-slate-900">{c.name}</p>
          <p className="text-sm text-slate-600">{c.issuer}</p>
          <p className="mt-1 text-sm text-slate-500">
            {[c.issueDate && `Issued ${fmtMonth(c.issueDate)}`, c.expiryDate && `Expires ${fmtMonth(c.expiryDate)}`].filter(Boolean).join(" · ")}
          </p>
          <div className="mt-1 flex flex-wrap gap-x-4 text-sm font-semibold text-orange-700">
            {c.file && <a href={c.file} target="_blank" rel="noreferrer" className="hover:underline">View file</a>}
            {c.credentialUrl && <a href={c.credentialUrl} target="_blank" rel="noreferrer" className="hover:underline">Verify online</a>}
          </div>
        </>
      )}
      renderForm={({ bind }) => (
        <>
          <TextField label="Certificate name" {...bind("name")} />
          <TextField label="Issued by" placeholder="e.g. Google, ICAN" {...bind("issuer")} />
          <TextField type="month" label="Issue date" {...bind("issueDate")} />
          <TextField type="month" label="Expiry date (if any)" {...bind("expiryDate")} />
          <TextField label="Credential ID (optional)" {...bind("credentialId")} />
          <TextField type="url" label="Verification link (optional)" placeholder="https://…" {...bind("credentialUrl")} />
          <FileUpload className="sm:col-span-2" label="Certificate file" {...bind("file")} />
        </>
      )}
    />
  );
}