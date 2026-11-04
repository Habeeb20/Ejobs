import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { blacklistApi, getError } from "../../api";
import { REASON_MAX, REASON_MIN, categoryLabel, displayName, formatDate, inputCls } from "./constants";
import { Modal, RoleBadge, UserAvatar } from "./ui";

// Reinstate a blacklisted user. A note is required, so there is always a record of why.
export default function LiftBlacklistModal({ user, onClose, onDone }) {
  const [note, setNote] = useState("");
  const [notify, setNotify] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setNote("");
    setNotify(true);
    setError("");
  }, [user?._id]);

  const trimmed = note.trim();
  const canSubmit = Boolean(user) && trimmed.length >= REASON_MIN && trimmed.length <= REASON_MAX && !saving;

  const submit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSaving(true);
    setError("");
    try {
      await blacklistApi.lift(user._id, { reason: trimmed, notify });
      toast.success(`${displayName(user)} has been reinstated`);
      onDone?.();
      onClose();
    } catch (err) {
      setError(getError(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={Boolean(user)}
      onClose={onClose}
      busy={saving}
      title="Lift blacklist"
      subtitle="The user will be able to log in again."
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-xl border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="lift-form"
            disabled={!canSubmit}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-700 focus:outline-none focus-visible:ring-4 focus-visible:ring-emerald-200 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {saving ? "Reinstating…" : "Reinstate user"}
          </button>
        </>
      }
    >
      {user && (
        <form id="lift-form" onSubmit={submit} className="space-y-5" noValidate>
          <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
            <UserAvatar user={user} />
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold text-slate-900">{displayName(user)}</p>
              <p className="truncate text-xs text-slate-500">{user.email || user.phoneNumber}</p>
            </div>
            <RoleBadge role={user.role} />
          </div>

          <div className="rounded-xl border-l-4 border-red-400 bg-red-50 p-4 text-sm text-slate-700">
            <p className="text-xs font-semibold uppercase tracking-wide text-red-700">
              Blacklisted for: {categoryLabel(user.blacklistCategory)}
            </p>
            <p className="mt-1 whitespace-pre-wrap">{user.blacklistReason || "No reason recorded."}</p>
            <p className="mt-2 text-xs text-slate-500">Since {formatDate(user.blacklistedAt)}</p>
          </div>

          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label htmlFor="lift-note" className="text-sm font-semibold text-slate-700">
                Why are you lifting it?
              </label>
              <span className="text-xs text-slate-400">
                {trimmed.length}/{REASON_MAX}
              </span>
            </div>
            <textarea
              id="lift-note"
              rows={3}
              autoFocus
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Appeal reviewed, documents verified"
              className={`${inputCls} resize-none`}
            />
            {trimmed.length > 0 && trimmed.length < REASON_MIN && (
              <p className="mt-1.5 text-xs text-red-600">Write at least {REASON_MIN} characters.</p>
            )}
          </div>

          <label className="flex cursor-pointer items-center gap-3 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={notify}
              onChange={(e) => setNotify(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-orange-600 focus:ring-orange-500"
            />
            Email the user that their account is back
          </label>

          {error && (
            <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              {error}
            </p>
          )}
        </form>
      )}
    </Modal>
  );
}
