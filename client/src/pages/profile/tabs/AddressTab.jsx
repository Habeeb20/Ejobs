import { FormShell, SelectField, TextField } from "../components/fields";
import useTabForm from "../useTabForm";
import { statesAndLgas } from "../../../data/statesLga";

const FIELDS = ["address", "state", "localGovernment"];

// Keys like "AkwaIbom" display as "Akwa Ibom"; the stored value stays the key
const prettify = (k) => k.replace(/([a-z])([A-Z])/g, "$1 $2");
const norm = (s) => String(s || "").replace(/\s/g, "").toLowerCase();
const stateKey = (s) => Object.keys(statesAndLgas).find((k) => norm(k) === norm(s));
const STATES = Object.keys(statesAndLgas).map((k) => ({ value: k, label: prettify(k) }));

export default function AddressTab({ user, onSave }) {
  const f = useTabForm(FIELDS, user, onSave);
  const key = stateKey(f.values.state);
  const lgas = (statesAndLgas[key] || []).map((l) => ({ value: l, label: l }));

  return (
    <FormShell form={f} title="Address" description="Where you're based.">
      <TextField
        className="sm:col-span-2"
        label="Street address"
        autoComplete="street-address"
        {...f.bind("address")}
      />
      <SelectField
        label="State"
        options={STATES}
        {...f.bind("state")}
        value={key || f.values.state}
        onChange={(e) => {
          f.set("state")(e.target.value);
          f.set("localGovernment")("");
        }}
      />
      <SelectField
        label="Local government (LGA)"
        options={lgas}
        disabled={!f.values.state}
        placeholder={f.values.state ? "Select LGA" : "Select a state first"}
        {...f.bind("localGovernment")}
      />
    </FormShell>
  );
}