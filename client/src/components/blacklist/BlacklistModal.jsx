import { useEffect, useState } from "react";
import { AlertTriangle, Loader2, Search } from "lucide-react";
import { toast } from "sonner";
import { blacklistApi, getError } from "../../api";
import { CATEGORIES, REASON_MAX, REASON_MIN, displayName, inputCls } from "./constants";
import { Modal, RoleBadge, UserAvatar } from "./ui";

/**
 * Blacklist a user.
 * - From the blacklist page: leave `presetUser` empty, the superadmin searches for the user.
 * - From any other list (users table, employer page ...): pass `presetUser` to skip the search.
 */
export default function BlacklistModal({ open, onClose, onDone, presetUser = null }) {
  const [selected, setSelected] = useState(presetUser);
  const [search, setSearch] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [category, setCategory] = useState("");
  const [reason, setReason] = useState("");
  const [notify, setNotify] = useState(true);
  const [confirm, setConfirm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // fresh form every time the modal opens
  useEffect(() => {
    if (!open) return;
    setSelected(presetUser);
    setSearch("");
    setResults([]);
    setCategory("");
    setReason("");
    setNotify(true);
    setConfirm(false);
    setError("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, presetUser?._id]);

  // search users that can still be blacklisted
  useEffect(() => {
    if (!open || selected) return undefined;
    const q = search.trim();
    if (q.length < 2) {
      setResults([]);
      return undefined;
    }
    const ctrl = new AbortController();
    setSearching(true);
    const t = setTimeout(async () => {
      try {
        const { data } = await blacklistApi.eligible({ search: q }, ctrl.signal);
        setResults(data.users || []);
      } catch {
        /* aborted or failed: show nothing */
      } finally {
        if (!ctrl.signal.aborted) setSearching(false);
      }
    }, 300);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [search, open, selected]);

  const trimmed = reason.trim();
  const reasonOk = trimmed.length >= REASON_MIN && trimmed.length <= REASON_MAX;
  const canSubmit = Boolean(selected && category && reasonOk && confirm && !saving);

  const submit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSaving(true);
    setError("");
    try {
      await blacklistApi.blacklist(selected._id, { reason: trimmed, category, notify });
      toast.success(`${displayName(selected)} has been blacklisted`);
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
      open={open}
      onClose={onClose}
      busy={saving}
      title="Blacklist a user"
      subtitle="They lose access straight away, even if they are logged in."
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
            form="blacklist-form"
            disabled={!canSubmit}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-red-700 focus:outline-none focus-visible:ring-4 focus-visible:ring-red-200 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {saving ? "Blacklisting…" : "Blacklist user"}
          </button>
        </>
      }
    >
      <form id="blacklist-form" onSubmit={submit} className="space-y-5" noValidate>
        {/* 1. who */}
        <div>
          <label className="mb-1.5 block text-sm font-semibold text-slate-700">User</label>
          {selected ? (
            <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
              <UserAvatar user={selected} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-slate-900">{displayName(selected)}</p>
                <p className="truncate text-xs text-slate-500">{selected.email || selected.phoneNumber}</p>
              </div>
              <RoleBadge role={selected.role} />
              {!presetUser && (
                <button
                  type="button"
                  onClick={() => setSelected(null)}
                  className="text-sm font-semibold text-orange-600 hover:underline"
                >
                  Change
                </button>
              )}
            </div>
          ) : (
            <div className="relative">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                autoFocus
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name, email, phone or company"
                className={`${inputCls} pl-10`}
              />
              {searching && (
                <Loader2 className="absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-slate-400" />
              )}
              {search.trim().length >= 2 && !searching && results.length === 0 && (
                <p className="mt-2 text-sm text-slate-500">No users found. Blacklisted users are not listed here.</p>
              )}
              {results.length > 0 && (
                <ul className="mt-2 max-h-56 divide-y divide-slate-100 overflow-auto rounded-xl border border-slate-200 bg-white">
                  {results.map((u) => (
                    <li key={u._id}>
                      <button
                        type="button"
                        onClick={() => setSelected(u)}
                        className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition hover:bg-orange-50"
                      >
                        <UserAvatar user={u} size="h-9 w-9" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold text-slate-900">{displayName(u)}</span>
                          <span className="block truncate text-xs text-slate-500">{u.email || u.phoneNumber}</span>
                        </span>
                        <RoleBadge role={u.role} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        {/* 2. category */}
        <div>
          <label htmlFor="bl-category" className="mb-1.5 block text-sm font-semibold text-slate-700">
            Category
          </label>
          <select id="bl-category" value={category} onChange={(e) => setCategory(e.target.value)} className={inputCls}>
            <option value="">Select a category</option>
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>

        {/* 3. reason */}
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <label htmlFor="bl-reason" className="text-sm font-semibold text-slate-700">
              Reason
            </label>
            <span className={`text-xs ${trimmed.length > REASON_MAX ? "text-red-600" : "text-slate-400"}`}>
              {trimmed.length}/{REASON_MAX}
            </span>
          </div>
          <textarea
            id="bl-reason"
            rows={4}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Explain clearly why this account is being blacklisted"
            className={`${inputCls} resize-none`}
          />
          {trimmed.length > 0 && trimmed.length < REASON_MIN && (
            <p className="mt-1.5 text-xs text-red-600">Write at least {REASON_MIN} characters.</p>
          )}
        </div>

        {/* 4. options */}
        <label className="flex cursor-pointer items-start gap-3 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={notify}
            onChange={(e) => setNotify(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-slate-300 text-orange-600 focus:ring-orange-500"
          />
          <span>
            Email the user about this decision
            <span className="block text-xs text-slate-500">The email includes the reason above.</span>
          </span>
        </label>

        <div className="flex gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p>The user will be signed out of every device and will not be able to log in until you lift the blacklist.</p>
            <label className="mt-3 flex cursor-pointer items-center gap-2 font-semibold">
              <input
                type="checkbox"
                checked={confirm}
                onChange={(e) => setConfirm(e.target.checked)}
                className="h-4 w-4 rounded border-red-300 text-red-600 focus:ring-red-500"
              />
              I understand and want to continue
            </label>
          </div>
        </div>

        {error && (
          <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {error}
          </p>
        )}
      </form>
    </Modal>
  );
}
