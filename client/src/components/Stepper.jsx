import { Check } from "lucide-react";

export default function Stepper({ steps, current }) {
  return (
    <ol className="mb-8 flex items-center gap-3">
      {steps.map((label, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <li key={label} className="flex flex-1 items-center gap-3 last:flex-none">
            <span
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${
                done ? "bg-primary-500 text-white" : active ? "bg-primary-100 text-primary-700 ring-2 ring-primary-500" : "bg-ink-200 text-ink-500"
              }`}
              aria-current={active ? "step" : undefined}
            >
              {done ? <Check className="h-4 w-4" /> : i + 1}
            </span>
            <span className={`text-sm font-medium ${active || done ? "text-ink-900" : "text-ink-500"}`}>{label}</span>
            {i < steps.length - 1 && <span className={`h-0.5 flex-1 rounded ${done ? "bg-primary-500" : "bg-ink-200"}`} />}
          </li>
        );
      })}
    </ol>
  );
}
