import { useState } from "react";
import { Input, Select, Button } from "../../components/ui";
import StateLgaSelect from "../../components/StateLgaSelect";
import { GENDERS, MARITAL_STATUSES, EDUCATION_LEVELS, JOBS } from "../../data/options";

// Step 2 for agents and job seekers. Job seekers get extra education + 3 job choices.
export default function StepProfile({ role, onSubmit, loading }) {
  const isSeeker = role === "jobseeker";
  const [f, setF] = useState({
    state: "", localGovernment: "", gender: "", maritalStatus: "", address: "",
    educationLevel: "", jobChoice: ["", "", ""],
  });
  const [errors, setErrors] = useState({});

  const set = (k) => (e) => setF((d) => ({ ...d, [k]: e.target.value }));
  const setChoice = (i) => (e) =>
    setF((d) => {
      const jobChoice = d.jobChoice.slice();
      jobChoice[i] = e.target.value;
      return { ...d, jobChoice };
    });

  const submit = (e) => {
    e.preventDefault();
    const err = {};
    if (!f.state) err.state = "Select your state";
    if (!f.localGovernment) err.localGovernment = "Select your LGA";
    if (!f.gender) err.gender = "Select your gender";
    if (!f.maritalStatus) err.maritalStatus = "Select your marital status";
    if (!f.address.trim()) err.address = "Enter your address";
    if (isSeeker) {
      if (!f.educationLevel) err.educationLevel = "Select your education level";
      f.jobChoice.forEach((c, i) => { if (!c) err[`job${i}`] = "Pick a job"; });
    }
    setErrors(err);
    if (Object.keys(err).length) return;

    const payload = { ...f };
    if (!isSeeker) { delete payload.educationLevel; delete payload.jobChoice; }
    onSubmit(payload);
  };

  return (
    <form onSubmit={submit} noValidate className="space-y-6">
      <div>
        <h2 className="font-display text-3xl font-bold">{isSeeker ? "Build your job profile" : "Set up your agent profile"}</h2>
        <p className="mt-1 text-ink-500">
          {isSeeker ? "This helps us match you with the right openings." : "Tell us where you operate from."}
        </p>
      </div>

      <StateLgaSelect
        state={f.state}
        lga={f.localGovernment}
        errors={errors}
        onState={(v) => setF((d) => ({ ...d, state: v }))}
        onLga={(v) => setF((d) => ({ ...d, localGovernment: v }))}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <Select id="gender" label="Gender" options={GENDERS} value={f.gender} onChange={set("gender")} error={errors.gender} />
        <Select id="maritalStatus" label="Marital status" options={MARITAL_STATUSES} value={f.maritalStatus} onChange={set("maritalStatus")} error={errors.maritalStatus} />
      </div>

      <Input id="address" label="Home address" value={f.address} onChange={set("address")} error={errors.address} autoComplete="street-address" />

      {isSeeker && (
        <>
          <Select id="educationLevel" label="Highest education level" options={EDUCATION_LEVELS} value={f.educationLevel} onChange={set("educationLevel")} error={errors.educationLevel} />

          <fieldset className="space-y-4 rounded-xl border border-ink-200 bg-white p-4">
            <legend className="px-2 text-sm font-medium text-ink-700">Your top 3 job choices</legend>
            {f.jobChoice.map((choice, i) => (
              <Select
                key={i}
                id={`job${i}`}
                label={i === 0 ? "First choice" : i === 1 ? "Second choice" : "Third choice"}
                // hide jobs already picked in the other two slots
                options={JOBS.filter((j) => j === choice || !f.jobChoice.includes(j))}
                value={choice}
                onChange={setChoice(i)}
                error={errors[`job${i}`]}
                placeholder="Select a job"
              />
            ))}
          </fieldset>
        </>
      )}

      <Button type="submit" loading={loading}>{isSeeker ? "Finish and find jobs" : "Finish setup"}</Button>
    </form>
  );
}
