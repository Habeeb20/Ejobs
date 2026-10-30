import { useState } from "react";
import { X } from "lucide-react";

export default function TagInput({ label, value, onChange, max = 20, placeholder, hint }) {
  const [text, setText] = useState("");

  const add = (raw) => {
    const incoming = raw.split(",").map((s) => s.trim()).filter(Boolean);
    if (!incoming.length) return;
    const next = [...value];
    for (const item of incoming) {
      if (next.length < max && !next.some((x) => x.toLowerCase() === item.toLowerCase())) next.push(item.slice(0, 40));
    }
    onChange(next);
    setText("");
  };

  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-slate-700">
        {label} <span className="text-slate-400">({value.length}/{max})</span>
      </label>
      <div className="flex flex-wrap gap-1.5 rounded-xl border border-slate-300 bg-white p-2 focus-within:border-orange-600 focus-within:ring-4 focus-within:ring-orange-600/15">
        {value.map((t) => (
          <span key={t} className="inline-flex items-center gap-1 rounded-full bg-orange-50 px-2.5 py-1 text-xs font-semibold text-orange-800 ring-1 ring-orange-100">
            {t}
            <button type="button" onClick={() => onChange(value.filter((x) => x !== t))} aria-label={`Remove ${t}`}>
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
        <input
          value={text}
          disabled={value.length >= max}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") { e.preventDefault(); add(text); }
            else if (e.key === "Backspace" && !text && value.length) onChange(value.slice(0, -1));
          }}
          onBlur={() => add(text)}
          placeholder={value.length < max ? placeholder : "Limit reached"}
          className="min-w-[8rem] flex-1 bg-transparent px-1.5 py-1 text-sm outline-none"
        />
      </div>
      {hint && <p className="mt-1.5 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}