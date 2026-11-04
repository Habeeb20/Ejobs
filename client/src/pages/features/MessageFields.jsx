import { Mail } from "lucide-react";

/**
 * Optional message to the candidate. `value` is { on, subject, body }.
 * When on, the candidate gets it by email and on their dashboard, and it is saved in the mail history.
 */
export default function MessageFields({ value, onChange, className = "" }) {
  const set = (patch) => onChange({ ...value, ...patch });
  return (
    <div className={className}>
      <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-medium text-slate-700">
        <input type="checkbox" checked={value.on} onChange={(e) => set({ on: e.target.checked })}
          className="h-4 w-4 rounded border-slate-300 text-orange-600 focus:ring-orange-500" />
        <Mail size={14} /> Also send the candidate a message
      </label>

      {value.on && (
        <div className="mt-2 space-y-2">
          <input value={value.subject} onChange={(e) => set({ subject: e.target.value })} maxLength={150}
            placeholder="Subject (optional)" aria-label="Message subject"
            className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm" />
          <textarea value={value.body} onChange={(e) => set({ body: e.target.value })} rows={4} maxLength={3000}
            placeholder="Write your message" aria-label="Message"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        </div>
      )}
    </div>
  );
}

export const emptyMessage = { on: false, subject: "", body: "" };