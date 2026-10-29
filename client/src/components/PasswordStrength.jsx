import { Check, Circle } from "lucide-react";

const RULES = [
  { id: "len", label: "At least 8 characters", test: (p) => p.length >= 8 },
  { id: "lower", label: "A lower-case letter", test: (p) => /[a-z]/.test(p) },
  { id: "upper", label: "An upper-case letter", test: (p) => /[A-Z]/.test(p) },
  { id: "num", label: "A number", test: (p) => /\d/.test(p) },
  { id: "sym", label: "A symbol (e.g. ! @ #)", test: (p) => /[^A-Za-z0-9]/.test(p) },
];

export const isPasswordValid = (p) => RULES.slice(0, 4).every((r) => r.test(p));

const LEVELS = [
  { label: "Too weak", bar: "bg-danger", text: "text-danger" },
  { label: "Weak", bar: "bg-danger", text: "text-danger" },
  { label: "Fair", bar: "bg-warning", text: "text-warning" },
  { label: "Good", bar: "bg-primary-500", text: "text-primary-600" },
  { label: "Strong", bar: "bg-success", text: "text-success" },
];

export default function PasswordStrength({ password }) {
  if (!password) return null;
  const passed = RULES.filter((r) => r.test(password)).length;
  const level = LEVELS[Math.min(Math.max(passed - 1, 0), 4)];
  const bars = Math.max(passed - (passed > 0 ? 1 : 0), password ? 1 : 0);

  return (
    <div className="mt-3 rounded-xl bg-ink-100 p-3">
      <div className="flex items-center gap-3">
        <div className="flex flex-1 gap-1.5">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className={`h-1.5 flex-1 rounded-full transition-colors ${i < bars ? level.bar : "bg-ink-200"}`} />
          ))}
        </div>
        <span className={`text-sm font-semibold ${level.text}`}>{level.label}</span>
      </div>
      <ul className="mt-3 grid gap-1.5 sm:grid-cols-2">
        {RULES.map((r) => {
          const ok = r.test(password);
          return (
            <li key={r.id} className={`flex items-center gap-2 text-sm ${ok ? "text-success" : "text-ink-500"}`}>
              {ok ? <Check className="h-4 w-4" /> : <Circle className="h-4 w-4" />}
              {r.label}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
