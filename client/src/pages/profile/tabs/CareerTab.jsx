import FileUpload from "../components/FileUpload";
import { Field, FormShell, SelectField, TextField, ToggleField } from "../components/fields";
import useTabForm from "../useTabForm";
import { EDUCATION, JOB_MODES } from "../profileOptions";

const FIELDS = ["educationLevel", "job", "jobMode", "minimumSalary", "jobChoice", "availabilityForUrgentWork", "resume"];

export default function CareerTab({ user, onSave }) {
  const f = useTabForm(FIELDS, user, onSave);
  const choices = [0, 1, 2].map((i) => f.values.jobChoice?.[i] || "");

  const setChoice = (i) => (e) => {
    const next = [...choices];
    next[i] = e.target.value;
    f.set("jobChoice")(next);
  };

  return (
    <FormShell form={f} title="Career" description="Help employers find the right fit.">
      <SelectField label="Education level" options={EDUCATION} {...f.bind("educationLevel")} />
      <TextField label="Current or most recent job" {...f.bind("job")} />
      <SelectField label="Preferred job type" options={JOB_MODES} {...f.bind("jobMode")} />
      <TextField label="Minimum monthly salary (₦)" inputMode="numeric" placeholder="150000" {...f.bind("minimumSalary")} />

      <Field label="Job choices (up to 3)" error={f.fieldErrors.jobChoice} className="sm:col-span-2">
        <div className="grid gap-3 sm:grid-cols-3">
          {choices.map((c, i) => (
            <TextField key={i} aria-label={`Job choice ${i + 1}`} placeholder={`Choice ${i + 1}`} value={c} onChange={setChoice(i)} />
          ))}
        </div>
      </Field>

      <ToggleField
        className="sm:col-span-2"
        label="Available for urgent work"
        hint="Employers can contact you for short-notice jobs."
        {...f.bind("availabilityForUrgentWork")}
      />
      <FileUpload
        className="sm:col-span-2"
        label="Résumé / CV"
        hint="PDF, DOC or image, up to 5MB"
        accept=".pdf,.doc,.docx,image/*"
        multiple
        max={2}
        {...f.bind("resume")}
      />
    </FormShell>
  );
}