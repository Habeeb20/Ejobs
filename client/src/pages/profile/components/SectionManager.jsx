import { useCallback, useEffect, useState } from "react";
import { AlertCircle, BadgeCheck, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { getError } from "../../../api";

const cap = (s) => s[0].toUpperCase() + s.slice(1);

export default function SectionManager({
  title, description, noun, icon: Icon, api, limit, blank, renderItem, renderForm, onCompletion,
}) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [editing, setEditing] = useState(null); // null | "new" | item id
  const [draft, setDraft] = useState(blank);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [confirmId, setConfirmId] = useState(null);

  const load = useCallback(async () => {
    try {
      const { data } = await api.list();
      setItems(data.items);
      setLoadError("");
    } catch (err) {
      setLoadError(getError(err));
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => { load(); }, [load]);

  const open = (item) => {
    setDraft(item ? Object.fromEntries(Object.keys(blank).map((k) => [k, item[k] ?? blank[k]])) : blank);
    setEditing(item ? item._id : "new");
    setErrors({});
    setFormError("");
  };

  const set = (key, value) => {
    setDraft((d) => ({ ...d, [key]: value }));
    setErrors((e) => ({ ...e, [key]: "" }));
  };
  // Same convention as useTabForm.bind: a DOM event or a plain value both work
  const bind = (key) => ({
    value: draft[key] ?? "",
    onChange: (e) => set(key, e && e.target ? e.target.value : e),
    error: errors[key],
  });

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setFormError("");
    setErrors({});
    try {
      const { data } = editing === "new" ? await api.create(draft) : await api.update(editing, draft);
      onCompletion?.(data.completion);
      await load();
      setEditing(null);
      toast.success(`${cap(noun)} ${editing === "new" ? "added" : "updated"}`);
    } catch (err) {
      setFormError(getError(err));
      setErrors(err?.response?.data?.errors || {});
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id) => {
    try {
      const { data } = await api.remove(id);
      onCompletion?.(data.completion);
      setConfirmId(null);
      await load();
      toast.success("Removed");
    } catch (err) {
      toast.error(getError(err));
    }
  };

  if (loading) {
    return <div className="flex items-center gap-2 py-10 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>;
  }
  if (loadError) {
    return (
      <div role="alert" className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {loadError}
      </div>
    );
  }

  const canAdd = items.length < limit && editing === null;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-display text-lg font-bold text-slate-900">{title}</h3>
          <p className="mt-1 text-sm text-slate-500">{description} <span className="text-slate-400">({items.length}/{limit})</span></p>
        </div>
        {canAdd && (
          <button type="button" onClick={() => open(null)}
            className="inline-flex items-center gap-2 rounded-xl bg-orange-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-orange-600/25 transition hover:bg-orange-700">
            <Plus className="h-4 w-4" /> Add {noun}
          </button>
        )}
      </div>

      {editing !== null ? (
        <form onSubmit={submit} noValidate className="space-y-5 rounded-2xl border border-orange-200 bg-orange-50/30 p-4 sm:p-5">
          <h4 className="font-semibold text-slate-900">{editing === "new" ? `Add ${noun}` : `Edit ${noun}`}</h4>
          {formError && (
            <div role="alert" className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {formError}
            </div>
          )}
          <div className="grid gap-4 sm:grid-cols-2">{renderForm({ bind, draft, set })}</div>
          <div className="flex justify-end gap-3 border-t border-orange-100 pt-4">
            <button type="button" onClick={() => setEditing(null)} disabled={saving}
              className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-600 ring-1 ring-slate-200 hover:bg-white">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl bg-orange-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-orange-700 disabled:opacity-60">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />} Save
            </button>
          </div>
        </form>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-slate-200 p-10 text-center">
          {Icon && <Icon className="mx-auto h-9 w-9 text-orange-300" />}
          <p className="mt-3 font-semibold text-slate-700">No {noun} added yet</p>
          <p className="mt-1 text-sm text-slate-500">Add your first one to strengthen your profile and CV.</p>
          <button type="button" onClick={() => open(null)}
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-orange-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-orange-700">
            <Plus className="h-4 w-4" /> Add {noun}
          </button>
        </div>
      ) : (
        <ul className="space-y-3">
          {items.map((item) => (
            <li key={item._id} className="rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-orange-200 hover:shadow-sm sm:p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  {renderItem(item)}
                  {item.verified && (
                    <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                      <BadgeCheck className="h-3.5 w-3.5" /> Verified
                    </span>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  {confirmId === item._id ? (
                    <>
                      <button type="button" onClick={() => remove(item._id)} className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700">Delete</button>
                      <button type="button" onClick={() => setConfirmId(null)} className="rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100">Keep</button>
                    </>
                  ) : (
                    <>
                      <button type="button" onClick={() => open(item)} aria-label="Edit" className="rounded-lg p-2 text-slate-400 transition hover:bg-orange-50 hover:text-orange-700"><Pencil className="h-4 w-4" /></button>
                      <button type="button" onClick={() => setConfirmId(item._id)} aria-label="Delete" className="rounded-lg p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
                    </>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}