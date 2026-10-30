import { School } from "lucide-react";
import SectionManager from "../components/SectionManager";
import FileUpload from "../components/FileUpload";
import { TextField, ToggleField } from "../components/fields";
import { sectionsApi } from "../../../api";
import { fmtPeriod } from "../cvFormat";

const BLANK = {
  institution: "", qualification: "", fieldOfStudy: "", grade: "",
  startDate: "", endDate: "", isCurrent: false, certificateUrl: "",
};
const LEVELS = ["SSCE / WAEC", "NECO", "OND", "NCE", "HND", "B.Sc", "B.A", "B.Eng", "PGD", "M.Sc", "MBA", "PhD", "Vocational / Trade"];

export default function EducationTab({ onCompletion }) {
  return (
    <SectionManager
      title="Education" description="Schools and qualifications, newest first." noun="education" icon={School}
      api={sectionsApi.education} limit={10} blank={BLANK} onCompletion={onCompletion}
      renderItem={(e) => (
        <>
          <p className="font-bold text-slate-900">{e.qualification}{e.fieldOfStudy ? ` in ${e.fieldOfStudy}` : ""}</p>
          <p className="text-sm text-slate-600">{e.institution}</p>
          <p className="mt-1 text-sm text-slate-500">
            {[fmtPeriod(e.startDate, e.endDate, e.isCurrent), e.grade].filter(Boolean).join(" · ")}
          </p>
          {e.certificateUrl && (
            <a href={e.certificateUrl} target="_blank" rel="noreferrer" className="mt-1 inline-block text-sm font-semibold text-orange-700 hover:underline">View certificate</a>
          )}
        </>
      )}
      renderForm={({ bind, draft, set }) => (
        <>
          <TextField className="sm:col-span-2" label="School / institution" {...bind("institution")} />
          <TextField label="Qualification" list="edu-levels" placeholder="e.g. B.Sc" {...bind("qualification")} />
          <datalist id="edu-levels">{LEVELS.map((l) => <option key={l} value={l} />)}</datalist>
          <TextField label="Course / field of study" {...bind("fieldOfStudy")} />
          <TextField label="Grade (optional)" placeholder="e.g. Second Class Upper" {...bind("grade")} />
          <div className="hidden sm:block" />
          <TextField type="month" label="Start" {...bind("startDate")} />
          <TextField type="month" label="End" disabled={draft.isCurrent} {...bind("endDate")} />
          <ToggleField className="sm:col-span-2" label="I'm still studying here" value={draft.isCurrent}
            onChange={(v) => { set("isCurrent", v); if (v) set("endDate", ""); }} />
          <FileUpload className="sm:col-span-2" label="Certificate or transcript (optional)" {...bind("certificateUrl")} />
        </>
      )}
    />
  );
}