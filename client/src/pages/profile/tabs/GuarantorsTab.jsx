import { ShieldCheck } from "lucide-react";
import SectionManager from "../components/SectionManager";
import FileUpload from "../components/FileUpload";
import { SelectField, TextField } from "../components/fields";
import { sectionsApi } from "../../../api";

const BLANK = {
  fullName: "", relationship: "", phoneNumber: "", email: "", occupation: "", address: "",
  yearsKnown: "", idType: "", idCard: "", photo: "",
};
const opts = (list) => list.map((v) => ({ value: v, label: v }));
const RELATIONSHIPS = opts(["Parent", "Sibling", "Relative", "Employer", "Colleague", "Friend", "Pastor / Imam", "Neighbour", "Teacher / Lecturer", "Other"]);
const ID_TYPES = opts(["National ID (NIN)", "Driver's licence", "Voter's card", "International passport"]);

export default function GuarantorsTab({ onCompletion }) {
  return (
    <SectionManager
      title="Guarantors" noun="guarantor" icon={ShieldCheck}
      description="People who can vouch for you. Their details are private and never appear on your CV."
      api={sectionsApi.guarantors} limit={3} blank={BLANK} onCompletion={onCompletion}
      renderItem={(g) => (
        <>
          <div className="flex items-center gap-3">
            {g.photo ? (
              <img src={g.photo} alt="" className="h-11 w-11 rounded-full object-cover" />
            ) : (
              <span className="grid h-11 w-11 place-items-center rounded-full bg-orange-100 font-bold text-orange-700">{g.fullName[0]}</span>
            )}
            <div className="min-w-0">
              <p className="font-bold text-slate-900">{g.fullName}</p>
              <p className="text-sm text-slate-600">{[g.relationship, g.occupation].filter(Boolean).join(" · ")}</p>
            </div>
          </div>
          <p className="mt-2 text-sm text-slate-500">{[g.phoneNumber, g.email].filter(Boolean).join(" · ")}</p>
        </>
      )}
      renderForm={({ bind }) => (
        <>
          <TextField label="Full name" {...bind("fullName")} />
          <SelectField label="Relationship" options={RELATIONSHIPS} {...bind("relationship")} />
          <TextField type="tel" label="Phone number" placeholder="08012345678" {...bind("phoneNumber")} />
          <TextField type="email" label="Email (optional)" {...bind("email")} />
          <TextField label="Occupation" {...bind("occupation")} />
          <TextField type="number" min="0" label="Years known" {...bind("yearsKnown")} />
          <TextField className="sm:col-span-2" label="Address" {...bind("address")} />
          <SelectField label="ID type" options={ID_TYPES} {...bind("idType")} />
          <div className="hidden sm:block" />
          <FileUpload label="Photo of the ID" {...bind("idCard")} />
          <FileUpload label="Passport photo" accept="image/*" {...bind("photo")} />
        </>
      )}
    />
  );
}