import { useEffect, useMemo, useState } from "react";
import { getError } from "../../api";

// Jobseekers get "none" saved for unfilled fields, so show those as empty
const clean = (v) => (v == null || v === "none" ? "" : v);
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

export default function useTabForm(fields, user, onSave) {
  // `fields` must be a module-level constant so this memo stays stable
  const initial = useMemo(
    () =>
      Object.fromEntries(
        fields.map((k) => [k, Array.isArray(user?.[k]) ? user[k] : clean(user?.[k])])
      ),
    [fields, user]
  );

  const [values, setValues] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  // Re-sync with the server data whenever it changes (after load or save)
  useEffect(() => setValues(initial), [initial]);

  useEffect(() => {
    if (!saved) return;
    const t = setTimeout(() => setSaved(false), 2500);
    return () => clearTimeout(t);
  }, [saved]);

  const dirtyKeys = fields.filter((k) => !same(values[k], initial[k]));

  // Accepts either a DOM event or a plain value (used by uploads and toggles)
  const set = (key) => (e) => {
    const v = e && e.target ? (e.target.type === "checkbox" ? e.target.checked : e.target.value) : e;
    setValues((s) => ({ ...s, [key]: v }));
    setFieldErrors((fe) => ({ ...fe, [key]: "" }));
    setSaved(false);
  };

  const bind = (key) => ({ value: values[key] ?? "", onChange: set(key), error: fieldErrors[key] });

  const submit = async (e) => {
    e?.preventDefault();
    if (!dirtyKeys.length) return;
    setSaving(true);
    setError("");
    setFieldErrors({});
    try {
      // Only send what changed
      await onSave(Object.fromEntries(dirtyKeys.map((k) => [k, values[k]])));
      setSaved(true);
    } catch (err) {
      setError(getError(err));
      setFieldErrors(err?.response?.data?.errors || {});
    } finally {
      setSaving(false);
    }
  };

  return { values, set, bind, dirty: dirtyKeys.length > 0, saving, saved, error, fieldErrors, submit };
}