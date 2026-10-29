import { Lock, Target } from "lucide-react";

function MultiPick({ label, options = [], value = [], onChange }) {
  const toggle = (o) => onChange(value.includes(o) ? value.filter((v) => v !== o) : [...value, o]);
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-medium text-slate-700">{label}</legend>
      <div className="flex max-h-40 flex-wrap gap-2 overflow-y-auto">
        {options.map((o) => {
          const on = value.includes(o);
          return (
            <button
              key={o} type="button" aria-pressed={on} onClick={() => toggle(o)}
              className={`rounded-full border px-3 py-1 text-sm transition ${
                on ? "border-orange-600 bg-orange-600 text-white" : "border-slate-200 bg-white text-slate-600 hover:border-orange-300"
              }`}
            >
              {o}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

/**
 * value: { states: [], educationLevels: [], jobCategories: [] }
 * Pass the same option lists your job seekers pick from at sign-up so the values match exactly.
 */
export default function TargetingFields({ plan, value, onChange, stateOptions, educationOptions, categoryOptions }) {
  if (plan !== "Premium") {
    return (
      <div className="flex items-start gap-3 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">
        <Lock size={18} className="mt-0.5 shrink-0 text-slate-400" />
        <p><strong>Audience targeting</strong> is a Premium feature. Choose Premium to send your job to the job seekers you want.</p>
      </div>
    );
  }
  const set = (k) => (v) => onChange({ ...value, [k]: v });
  return (
    <div className="space-y-5 rounded-2xl border border-orange-200 bg-orange-50/50 p-4 sm:p-5">
      <div className="flex items-center gap-2 font-semibold"><Target size={18} className="text-orange-600" /> Target your audience</div>
      <p className="text-sm text-slate-600">Matching job seekers are notified when your job goes live. Leave a group empty to skip it.</p>
      <MultiPick label="States" options={stateOptions} value={value.states} onChange={set("states")} />
      <MultiPick label="Education level" options={educationOptions} value={value.educationLevels} onChange={set("educationLevels")} />
      <MultiPick label="Job categories" options={categoryOptions} value={value.jobCategories} onChange={set("jobCategories")} />
    </div>
  );
}