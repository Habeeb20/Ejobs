// import { useState } from "react";
// import { Eye, EyeOff, Briefcase, Building2, UserCheck } from "lucide-react";
// import { Input, Button } from "../../components/ui";
// import PasswordStrength, { isPasswordValid } from "../../components/PasswordStrength";
// import { ROLE_OPTIONS } from "../../data/options";
// import { toast } from "sonner";
// const ICONS = { jobseeker: Briefcase, employer: Building2, agent: UserCheck };
// const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// export default function StepAccount({ data, setData, onSubmit, loading }) {
//   const [errors, setErrors] = useState({});
//   const [showPw, setShowPw] = useState(false);

//   const set = (k) => (e) => setData((d) => ({ ...d, [k]: e.target.value }));

//   const submit = (e) => {
//     e.preventDefault();
//     const err = {};
//     if (!data.role) err.role = "Choose how you will use EJob";
//     if (!data.firstName.trim()) err.firstName = "Enter your first name";
//     if (!data.lastName.trim()) err.lastName = "Enter your last name";
//     if (data.phoneNumber.replace(/\D/g, "").length < 10) err.phoneNumber = "Enter a valid phone number";
//     if (!EMAIL_RE.test(data.email)) err.email = "Enter a valid email address";
//     if (!isPasswordValid(data.password)) err.password = "Use 8+ characters with upper-case, lower-case and a number";
//     setErrors(err);
//     if (Object.keys(err).length === 0) onSubmit();
//   };

//   return (
//     <form onSubmit={submit} noValidate className="space-y-6">
//       <div>
//         <h2 className="font-display text-3xl font-bold">Create your account</h2>
//         <p className="mt-1 text-ink-500">Tell us who you are and we will tailor the rest.</p>
//       </div>

//       <fieldset>
//         <legend className="mb-2 text-sm font-medium text-ink-700">I am a</legend>
//         <div className="grid gap-3 sm:grid-cols-3">
//           {ROLE_OPTIONS.map((r) => {
//             const Icon = ICONS[r.value];
//             const selected = data.role === r.value;
//             return (
//               <label
//                 key={r.value}
//                 className={`cursor-pointer rounded-xl border p-4 transition focus-within:ring-4 focus-within:ring-primary-100 ${selected ? "border-primary-500 bg-primary-50" : "border-ink-200 bg-white hover:border-primary-300"
//                   }`}
//               >
//                 <input type="radio" name="role" value={r.value} checked={selected} onChange={set("role")} className="sr-only" />
//                 <Icon className={`mb-3 h-6 w-6 ${selected ? "text-primary-600" : "text-ink-400"}`} />
//                 <p className="font-semibold">{r.title}</p>
//                 <p className="mt-0.5 text-sm text-ink-500">{r.desc}</p>
//               </label>
//             );
//           })}
//         </div>
//         {errors.role && <p className="mt-1.5 text-sm text-danger">{errors.role}</p>}
//       </fieldset>

//       <div className="grid gap-4 sm:grid-cols-2">
//         <Input id="firstName" label="First name" value={data.firstName} onChange={set("firstName")} error={errors.firstName} autoComplete="given-name" />
//         <Input id="lastName" label="Last name" value={data.lastName} onChange={set("lastName")} error={errors.lastName} autoComplete="family-name" />
//       </div>

//       <div className="grid gap-4 sm:grid-cols-2">
//         <Input id="phoneNumber" type="tel" label="Phone number" placeholder="08012345678" value={data.phoneNumber} onChange={set("phoneNumber")} error={errors.phoneNumber} autoComplete="tel" />
//         <Input id="email" type="email" label="Email" placeholder="you@example.com" value={data.email} onChange={set("email")} error={errors.email} autoComplete="email" />
//       </div>

//       <div>
//         <Input
//           id="password"
//           type={showPw ? "text" : "password"}
//           label="Password"
//           value={data.password}
//           onChange={set("password")}
//           error={errors.password}
//           autoComplete="new-password"
//           right={
//             <button type="button" onClick={() => setShowPw((s) => !s)} className="rounded p-1 text-ink-500 hover:text-ink-900" aria-label={showPw ? "Hide password" : "Show password"}>
//               {showPw ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
//             </button>
//           }
//         />
//         <PasswordStrength password={data.password} />
//       </div>

//       <Button type="submit" loading={loading}>Send verification code</Button>
//     </form>
//   );
// }



import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Eye, EyeOff, Briefcase, Building2, UserCheck, Gift } from "lucide-react";
import { Input, Button } from "../../components/ui";
import PasswordStrength, { isPasswordValid } from "../../components/PasswordStrength";
import { ROLE_OPTIONS } from "../../data/options";
import { toast } from "sonner";
const ICONS = { jobseeker: Briefcase, employer: Building2, agent: UserCheck };
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Same alphabet the backend uses to generate codes (no 0, O, 1, I)
const REFERRAL_RE = /^[A-HJ-NP-Z2-9]{8}$/;

export default function StepAccount({ data, setData, onSubmit, loading }) {
  const [errors, setErrors] = useState({});
  const [showPw, setShowPw] = useState(false);
  const [searchParams] = useSearchParams();

  const set = (k) => (e) => setData((d) => ({ ...d, [k]: e.target.value }));

  // Way 1: invite link such as /register?ref=K7M2QX9A pre-fills the field.
  // Only fills an empty field, so it never overwrites what the user typed.
  const refFromUrl = (searchParams.get("ref") || "").trim().toUpperCase();
  useEffect(() => {
    if (refFromUrl && !data.referralCode) {
      setData((d) => ({ ...d, referralCode: refFromUrl }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refFromUrl]);

  // Way 2: no link, so the user can type a code themselves
  const referralCode = data.referralCode ?? "";
  const fromLink = Boolean(refFromUrl) && referralCode === refFromUrl;

  const submit = (e) => {
    e.preventDefault();
    const err = {};
    if (!data.role) err.role = "Choose how you will use EJob";
    if (!data.firstName.trim()) err.firstName = "Enter your first name";
    if (!data.lastName.trim()) err.lastName = "Enter your last name";
    if (data.phoneNumber.replace(/\D/g, "").length < 10) err.phoneNumber = "Enter a valid phone number";
    if (!EMAIL_RE.test(data.email)) err.email = "Enter a valid email address";
    if (!isPasswordValid(data.password)) err.password = "Use 8+ characters with upper-case, lower-case and a number";
    // Optional: only checked when something has been entered
    if (referralCode.trim() && !REFERRAL_RE.test(referralCode.trim())) {
      err.referralCode = "A referral code has 8 letters and numbers";
    }
    setErrors(err);
    if (Object.keys(err).length === 0) onSubmit();
  };

  return (
    <form onSubmit={submit} noValidate className="space-y-6">
      <div>
        <h2 className="font-display text-3xl font-bold">Create your account</h2>
        <p className="mt-1 text-ink-500">Tell us who you are and we will tailor the rest.</p>
      </div>

      <fieldset>
        <legend className="mb-2 text-sm font-medium text-ink-700">I am a</legend>
        <div className="grid gap-3 sm:grid-cols-3">
          {ROLE_OPTIONS.map((r) => {
            const Icon = ICONS[r.value];
            const selected = data.role === r.value;
            return (
              <label
                key={r.value}
                className={`cursor-pointer rounded-xl border p-4 transition focus-within:ring-4 focus-within:ring-primary-100 ${selected ? "border-primary-500 bg-primary-50" : "border-ink-200 bg-white hover:border-primary-300"
                  }`}
              >
                <input type="radio" name="role" value={r.value} checked={selected} onChange={set("role")} className="sr-only" />
                <Icon className={`mb-3 h-6 w-6 ${selected ? "text-primary-600" : "text-ink-400"}`} />
                <p className="font-semibold">{r.title}</p>
                <p className="mt-0.5 text-sm text-ink-500">{r.desc}</p>
              </label>
            );
          })}
        </div>
        {errors.role && <p className="mt-1.5 text-sm text-danger">{errors.role}</p>}
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <Input id="firstName" label="First name" value={data.firstName} onChange={set("firstName")} error={errors.firstName} autoComplete="given-name" />
        <Input id="lastName" label="Last name" value={data.lastName} onChange={set("lastName")} error={errors.lastName} autoComplete="family-name" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Input id="phoneNumber" type="tel" label="Phone number" placeholder="08012345678" value={data.phoneNumber} onChange={set("phoneNumber")} error={errors.phoneNumber} autoComplete="tel" />
        <Input id="email" type="email" label="Email" placeholder="you@example.com" value={data.email} onChange={set("email")} error={errors.email} autoComplete="email" />
      </div>

      <div>
        <Input
          id="password"
          type={showPw ? "text" : "password"}
          label="Password"
          value={data.password}
          onChange={set("password")}
          error={errors.password}
          autoComplete="new-password"
          right={
            <button type="button" onClick={() => setShowPw((s) => !s)} className="rounded p-1 text-ink-500 hover:text-ink-900" aria-label={showPw ? "Hide password" : "Show password"}>
              {showPw ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          }
        />
        <PasswordStrength password={data.password} />
      </div>

      <div>
        <Input
          id="referralCode"
          label="Referral code (optional)"
          placeholder="e.g. K7M2QX9A"
          value={referralCode}
          onChange={(e) =>
            setData((d) => ({ ...d, referralCode: e.target.value.toUpperCase().replace(/\s/g, "") }))
          }
          error={errors.referralCode}
          maxLength={8}
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
        />
        {fromLink && !errors.referralCode && (
          <p className="mt-1.5 flex items-center gap-1.5 text-sm text-primary-600">
            <Gift className="h-4 w-4" /> Applied from your invite link
          </p>
        )}
      </div>

      <Button type="submit" loading={loading}>Send verification code</Button>
    </form>
  );
}