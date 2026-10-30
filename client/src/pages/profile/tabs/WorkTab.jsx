import { Briefcase } from "lucide-react";
import SectionManager from "../components/SectionManager";
import FileUpload from "../components/FileUpload";
import { SelectField, TextAreaField, TextField, ToggleField } from "../components/fields";
import { sectionsApi } from "../../../api";
import { fmtPeriod } from "../cvFormat";

const BLANK = {
  company: "", jobTitle: "", employmentType: "", location: "", startDate: "", endDate: "",
  isCurrent: false, description: "", referenceLetter: "",
};
const TYPES = ["Full-time", "Part-time", "Contract", "Internship", "Apprenticeship", "Self-employed", "Volunteer"].map((v) => ({ value: v, label: v }));

export default function WorkTab({ onCompletion }) {
  return (
    <SectionManager
      title="Work experience" description="Where you've worked, newest first." noun="job" icon={Briefcase}
      api={sectionsApi.work} limit={20} blank={BLANK} onCompletion={onCompletion}
      renderItem={(w) => (
        <>
          <p className="font-bold text-slate-900">{w.jobTitle}</p>
          <p className="text-sm text-slate-600">{[w.company, w.employmentType, w.location].filter(Boolean).join(" · ")}</p>
          <p className="mt-1 text-sm text-slate-500">{fmtPeriod(w.startDate, w.endDate, w.isCurrent)}</p>
          {w.description && <p className="mt-2 line-clamp-2 whitespace-pre-line text-sm text-slate-600">{w.description}</p>}
          {w.referenceLetter && (
            <a href={w.referenceLetter} target="_blank" rel="noreferrer" className="mt-1 inline-block text-sm font-semibold text-orange-700 hover:underline">View reference letter</a>
          )}
        </>
      )}
      renderForm={({ bind, draft, set }) => (
        <>
          <TextField label="Job title" {...bind("jobTitle")} />
          <TextField label="Company" {...bind("company")} />
          <SelectField label="Employment type" options={TYPES} {...bind("employmentType")} />
          <TextField label="Location" placeholder="e.g. Ikeja, Lagos" {...bind("location")} />
          <TextField type="month" label="Start" {...bind("startDate")} />
          <TextField type="month" label="End" disabled={draft.isCurrent} {...bind("endDate")} />
          <ToggleField className="sm:col-span-2" label="I currently work here" value={draft.isCurrent}
            onChange={(v) => { set("isCurrent", v); if (v) set("endDate", ""); }} />
          <TextAreaField className="sm:col-span-2" label="What did you do?" maxLength={2000}
            hint="One achievement per line. Each line becomes a bullet point on your CV." {...bind("description")} />
          <FileUpload className="sm:col-span-2" label="Reference letter (optional)" {...bind("referenceLetter")} />
        </>
      )}
    />
  );
}