import { FormShell, SelectField, TextField } from "../components/fields";
import useTabForm from "../useTabForm";
import { RELATIONSHIPS } from "../profileOptions";

const FIELDS = ["nextOfKin", "nextOfKinRelationship", "nextOfKinNumber", "nextOfKinAddress"];

export default function NextOfKinTab({ user, onSave }) {
  const f = useTabForm(FIELDS, user, onSave);

  return (
    <FormShell form={f} title="Next of kin" description="Someone we can reach in an emergency.">
      <TextField label="Full name" {...f.bind("nextOfKin")} />
      <SelectField label="Relationship" options={RELATIONSHIPS} {...f.bind("nextOfKinRelationship")} />
      <TextField type="tel" label="Phone number" placeholder="08012345678" {...f.bind("nextOfKinNumber")} />
      <TextField label="Address" {...f.bind("nextOfKinAddress")} />
    </FormShell>
  );
}