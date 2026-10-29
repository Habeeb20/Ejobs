import { FormShell, TextField } from "../components/fields";
import useTabForm from "../useTabForm";
import { BANKS } from "../profileOptions";

const FIELDS = ["bankName", "bankAcctName", "bankAcctNum"];

export default function BankTab({ user, onSave }) {
  const f = useTabForm(FIELDS, user, onSave);

  return (
    <FormShell form={f} title="Bank details" description="Where your payouts will be sent.">
      <TextField label="Bank name" list="ng-banks" {...f.bind("bankName")} />
      <datalist id="ng-banks">
        {BANKS.map((b) => (
          <option key={b} value={b} />
        ))}
      </datalist>
      <TextField label="Account name" {...f.bind("bankAcctName")} />
      <TextField label="Account number" inputMode="numeric" maxLength={10} placeholder="10 digits" {...f.bind("bankAcctNum")} />
    </FormShell>
  );
}