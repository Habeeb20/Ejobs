import { FormShell, TextField } from "../components/fields";
import useTabForm from "../useTabForm";

const FIELDS = ["firstName", "lastName", "phoneNumber", "companyPhone", "whatsappNumber"];

export default function ContactTab({ user, onSave }) {
  const f = useTabForm(FIELDS, user, onSave);

  return (
    <FormShell form={f} title="Contact" description="Who candidates and our team can reach.">
      <TextField label="Contact person first name" {...f.bind("firstName")} />
      <TextField label="Contact person last name" {...f.bind("lastName")} />
      <TextField type="tel" label="Contact phone" {...f.bind("phoneNumber")} />
      <TextField type="tel" label="Company phone" {...f.bind("companyPhone")} />
      <TextField type="tel" label="WhatsApp number" placeholder="Optional" {...f.bind("whatsappNumber")} />
    </FormShell>
  );
}