import { forwardRef } from "react";
import { Spinner } from "./Loader";

export function Field({ label, error, hint, htmlFor, children }) {
  return (
    <div className="w-full">
      {label && (
        <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-medium text-ink-700">
          {label}
        </label>
      )}
      {children}
      {error ? (
        <p className="mt-1.5 text-sm text-danger" role="alert">{error}</p>
      ) : hint ? (
        <p className="mt-1.5 text-sm text-ink-500">{hint}</p>
      ) : null}
    </div>
  );
}

const base =
  "w-full rounded-xl border bg-white px-4 py-3 text-ink-900 outline-none transition placeholder:text-ink-400 focus:border-primary-500 focus:ring-4 focus:ring-primary-100 disabled:cursor-not-allowed disabled:bg-ink-100 disabled:text-ink-400";

export const Input = forwardRef(function Input({ label, error, hint, right, ...props }, ref) {
  return (
    <Field label={label} error={error} hint={hint} htmlFor={props.id}>
      <div className="relative">
        <input ref={ref} className={`${base} ${error ? "border-danger" : "border-ink-200"} ${right ? "pr-12" : ""}`} {...props} />
        {right && <div className="absolute inset-y-0 right-3 flex items-center">{right}</div>}
      </div>
    </Field>
  );
});

// options: string[] or { value, label }[]
export function Select({ label, error, hint, options = [], placeholder = "Select an option", ...props }) {
  return (
    <Field label={label} error={error} hint={hint} htmlFor={props.id}>
      <select className={`${base} appearance-none ${error ? "border-danger" : "border-ink-200"} ${!props.value ? "text-ink-400" : ""}`} {...props}>
        <option value="">{placeholder}</option>
        {options.map((o) => {
          const v = typeof o === "string" ? o : o.value;
          const l = typeof o === "string" ? o : o.label;
          return <option key={v} value={v} className="text-ink-900">{l}</option>;
        })}
      </select>
    </Field>
  );
}

export function Button({ loading = false, variant = "primary", children, className = "", ...props }) {
  const styles = {
    primary: "bg-primary-500 text-white hover:bg-primary-600 focus-visible:ring-primary-200",
    ghost: "bg-transparent text-ink-600 hover:bg-ink-100 focus-visible:ring-ink-200",
  };
  return (
    <button
      disabled={loading || props.disabled}
      className={`inline-flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3 font-semibold outline-none transition focus-visible:ring-4 disabled:cursor-not-allowed disabled:opacity-60 ${styles[variant]} ${className}`}
      {...props}
    >
      {loading && <Spinner />}
      {children}
    </button>
  );
}
