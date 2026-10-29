import { useId } from "react";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";

const input =
  "w-full rounded-xl border bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:ring-4 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400";
const tone = (error) =>
  error
    ? "border-red-500 focus:border-red-500 focus:ring-red-500/15"
    : "border-slate-300 focus:border-orange-600 focus:ring-orange-600/15";

export function Field({ label, error, hint, htmlFor, className = "", children }) {
  return (
    <div className={className}>
      {label && (
        <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-medium text-slate-700">
          {label}
        </label>
      )}
      {children}
      {error ? (
        <p className="mt-1.5 text-xs text-red-600">{error}</p>
      ) : hint ? (
        <p className="mt-1.5 text-xs text-slate-500">{hint}</p>
      ) : null}
    </div>
  );
}

export function TextField({ label, error, hint, className, ...props }) {
  const id = useId();
  return (
    <Field label={label} error={error} hint={hint} htmlFor={id} className={className}>
      <input id={id} className={`${input} ${tone(error)}`} {...props} />
    </Field>
  );
}

export function TextAreaField({ label, error, hint, className, ...props }) {
  const id = useId();
  return (
    <Field label={label} error={error} hint={hint} htmlFor={id} className={className}>
      <textarea id={id} rows={4} className={`${input} ${tone(error)} resize-y`} {...props} />
    </Field>
  );
}

// Matches the stored value case-insensitively and keeps unknown stored values visible
export function SelectField({ label, error, hint, className, options, value, placeholder = "Select…", ...props }) {
  const id = useId();
  const match = options.find((o) => String(o.value).toLowerCase() === String(value ?? "").toLowerCase());
  const list = value && !match ? [...options, { value, label: String(value) }] : options;
  return (
    <Field label={label} error={error} hint={hint} htmlFor={id} className={className}>
      <select id={id} value={match ? match.value : value ?? ""} className={`${input} ${tone(error)}`} {...props}>
        <option value="">{placeholder}</option>
        {list.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </Field>
  );
}

export function ToggleField({ label, hint, value, onChange, className = "" }) {
  return (
    <div className={`flex items-center justify-between gap-4 rounded-xl border border-slate-200 p-4 ${className}`}>
      <div>
        <p className="text-sm font-medium text-slate-800">{label}</p>
        {hint && <p className="text-xs text-slate-500">{hint}</p>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={!!value}
        aria-label={label}
        onClick={() => onChange(!value)}
        className={`relative h-6 w-11 shrink-0 rounded-full transition focus:outline-none focus:ring-4 focus:ring-orange-600/20 ${
          value ? "bg-orange-600" : "bg-slate-300"
        }`}
      >
        <span
          className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
            value ? "translate-x-5" : ""
          }`}
        />
      </button>
    </div>
  );
}

// Wraps a tab's fields with the title, error banner and Save button
export function FormShell({ form, title, description, children }) {
  const { submit, saving, dirty, saved, error } = form;
  return (
    <form onSubmit={submit} noValidate className="space-y-6">
      <div>
        <h3 className="font-display text-lg font-bold text-slate-900">{title}</h3>
        {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
      </div>

      {error && (
        <div role="alert" className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {error}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">{children}</div>

      <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
        {saved && (
          <span className="flex items-center gap-1.5 text-sm font-medium text-emerald-600">
            <CheckCircle2 className="h-4 w-4" /> Saved
          </span>
        )}
        <button
          type="submit"
          disabled={!dirty || saving}
          className="inline-flex items-center gap-2 rounded-xl bg-orange-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-orange-600/25 transition hover:bg-orange-700 focus:outline-none focus:ring-4 focus:ring-orange-600/30 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
        >
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Saving…
            </>
          ) : (
            "Save changes"
          )}
        </button>
      </div>
    </form>
  );
}