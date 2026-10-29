// import { useEffect, useState } from "react";
// import { Link, useNavigate } from "react-router-dom";
// import { toast } from "sonner";
// import { AlertCircle, Loader2 } from "lucide-react";

// import { benefitApi, getError } from "../../api";
// import {
//   CATEGORY_LABELS,
//   Card,
//   Checklist,
//   PageHeader,
//   Spinner,
//   inputCls,
//   naira,
//   primaryBtn,
// } from "../../components/benefits/shared";

// const PROFILE_PATH = "/jobseeker/profile"; // where the job seeker completes their profile
// const DASHBOARD_PATH = "/jobseeker/benefits";

// const EMPTY = { title: "", category: "other", amount: "", neededBy: "", description: "" };

// export default function RequestBenefit() {
//   const navigate = useNavigate();
//   const [eligibility, setEligibility] = useState(null);
//   const [form, setForm] = useState(EMPTY);
//   const [errors, setErrors] = useState({});
//   const [submitting, setSubmitting] = useState(false);

//   useEffect(() => {
//     benefitApi
//       .eligibility()
//       .then(({ data }) => setEligibility(data))
//       .catch((err) => {
//         toast.error(getError(err));
//         setEligibility({ eligible: false, requirements: [] });
//       });
//   }, []);

//   const update = (key) => (e) => {
//     setForm((f) => ({ ...f, [key]: e.target.value }));
//     setErrors((er) => ({ ...er, [key]: "" }));
//   };

//   const validate = () => {
//     const errs = {};
//     const amount = Number(form.amount);
//     if (form.title.trim().length < 3) errs.title = "Enter a title of at least 3 characters";
//     if (!Number.isFinite(amount) || amount <= 0) errs.amount = "Enter an amount greater than zero";
//     else if (eligibility.maxAmount > 0 && amount > eligibility.maxAmount)
//       errs.amount = `The most you can request is ${naira(eligibility.maxAmount)}`;
//     if (form.description.trim().length < 10) errs.description = "Explain why you need it (at least 10 characters)";
//     setErrors(errs);
//     return Object.keys(errs).length === 0;
//   };

//   const submit = async (e) => {
//     e.preventDefault();
//     if (!validate()) return;
//     setSubmitting(true);
//     try {
//       await benefitApi.request({
//         title: form.title.trim(),
//         category: form.category,
//         amount: Number(form.amount),
//         neededBy: form.neededBy || undefined,
//         description: form.description.trim(),
//       });
//       toast.success("Benefit request submitted");
//       navigate(DASHBOARD_PATH, { replace: true });
//     } catch (err) {
//       toast.error(getError(err));
//     } finally {
//       setSubmitting(false);
//     }
//   };

//   if (!eligibility) return <Spinner />;

//   const missing = eligibility.requirements.filter((r) => !r.met).length;
//   const blocked = eligibility.blacklisted
//     ? "Your account is blacklisted, so you can't request a benefit right now."
//     : eligibility.openRequest
//     ? "You already have a request in progress. You can make a new one once it's completed."
//     : null;
//   const canSubmit = eligibility.eligible && !submitting;

//   const fieldError = (key) =>
//     errors[key] ? (
//       <p id={`${key}-error`} className="mt-1.5 text-xs text-red-600">
//         {errors[key]}
//       </p>
//     ) : null;

//   return (
//     <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
//       <PageHeader
//         title="Request a benefit"
//         text="Tell us what you need and how much. An admin reviews every request."
//         action={
//           <Link to={DASHBOARD_PATH} className="text-sm font-medium text-slate-600 underline-offset-4 hover:underline">
//             Back to my benefits
//           </Link>
//         }
//       />

//       {blocked && (
//         <div role="alert" className="mb-6 flex gap-2.5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
//           <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
//           <span>{blocked}</span>
//         </div>
//       )}

//       <div className="grid gap-6 lg:grid-cols-5">
//         <Card title="Requirements" className="lg:col-span-2 lg:self-start">
//           <p className="mb-3 text-sm text-slate-600">
//             {missing === 0
//               ? "You meet every requirement."
//               : `${missing} requirement${missing === 1 ? "" : "s"} left before you can request.`}
//           </p>
//           <Checklist items={eligibility.requirements} />
//           {missing > 0 && (
//             <Link to={PROFILE_PATH} className={`${primaryBtn} mt-4 w-full`}>
//               Complete my profile
//             </Link>
//           )}
//           {eligibility.benefitNumber && (
//             <p className="mt-4 text-xs text-slate-500">
//               Your benefit number: <span className="font-semibold text-slate-800">{eligibility.benefitNumber}</span>
//             </p>
//           )}
//         </Card>

//         <Card title="Request details" className="lg:col-span-3">
//           <form onSubmit={submit} noValidate className="space-y-5">
//             <fieldset disabled={!eligibility.eligible} className="space-y-5 disabled:opacity-60">
//               <div>
//                 <label htmlFor="title" className="mb-1.5 block text-sm font-medium text-slate-700">
//                   Title
//                 </label>
//                 <input
//                   id="title"
//                   value={form.title}
//                   onChange={update("title")}
//                   placeholder="e.g. School fees for my daughter"
//                   aria-invalid={Boolean(errors.title)}
//                   aria-describedby={errors.title ? "title-error" : undefined}
//                   className={inputCls}
//                 />
//                 {fieldError("title")}
//               </div>

//               <div className="grid gap-5 sm:grid-cols-2">
//                 <div>
//                   <label htmlFor="category" className="mb-1.5 block text-sm font-medium text-slate-700">
//                     Category
//                   </label>
//                   <select id="category" value={form.category} onChange={update("category")} className={inputCls}>
//                     {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
//                       <option key={value} value={value}>
//                         {label}
//                       </option>
//                     ))}
//                   </select>
//                 </div>
//                 <div>
//                   <label htmlFor="amount" className="mb-1.5 block text-sm font-medium text-slate-700">
//                     Amount (₦)
//                   </label>
//                   <input
//                     id="amount"
//                     type="number"
//                     inputMode="numeric"
//                     min="1"
//                     value={form.amount}
//                     onChange={update("amount")}
//                     placeholder="50000"
//                     aria-invalid={Boolean(errors.amount)}
//                     aria-describedby={errors.amount ? "amount-error" : undefined}
//                     className={inputCls}
//                   />
//                   {fieldError("amount")}
//                   {eligibility.maxAmount > 0 && !errors.amount && (
//                     <p className="mt-1.5 text-xs text-slate-500">Maximum {naira(eligibility.maxAmount)}</p>
//                   )}
//                 </div>
//               </div>

//               <div>
//                 <label htmlFor="neededBy" className="mb-1.5 block text-sm font-medium text-slate-700">
//                   Needed by <span className="font-normal text-slate-400">(optional)</span>
//                 </label>
//                 <input
//                   id="neededBy"
//                   type="date"
//                   min={new Date().toISOString().slice(0, 10)}
//                   value={form.neededBy}
//                   onChange={update("neededBy")}
//                   className={inputCls}
//                 />
//               </div>

//               <div>
//                 <label htmlFor="description" className="mb-1.5 block text-sm font-medium text-slate-700">
//                   Why do you need this benefit?
//                 </label>
//                 <textarea
//                   id="description"
//                   rows={5}
//                   value={form.description}
//                   onChange={update("description")}
//                   placeholder="Describe the situation and how the money will be used."
//                   aria-invalid={Boolean(errors.description)}
//                   aria-describedby={errors.description ? "description-error" : undefined}
//                   className={inputCls}
//                 />
//                 {fieldError("description")}
//               </div>
//             </fieldset>

//             <button type="submit" disabled={!canSubmit} className={`${primaryBtn} w-full sm:w-auto`}>
//               {submitting ? (
//                 <>
//                   <Loader2 className="h-4 w-4 animate-spin" /> Submitting…
//                 </>
//               ) : (
//                 "Submit request"
//               )}
//             </button>
//           </form>
//         </Card>
//       </div>
//     </div>
//   );
// }




import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { AlertCircle, Loader2 } from "lucide-react";

import { benefitApi, getError } from "../../api";
import {
  CATEGORY_LABELS,
  Card,
  Checklist,
  PageHeader,
  Spinner,
  inputCls,
  naira,
  primaryBtn,
} from "../../components/benefits/shared";

const PROFILE_PATH = "/dashboard?tab=profile"; // where the job seeker completes their profile
const DASHBOARD_PATH = "/dashboard?tab=benefits";

const EMPTY = { title: "", category: "other", amount: "", neededBy: "", description: "" };

export default function RequestBenefit() {
  const navigate = useNavigate();
  const [eligibility, setEligibility] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    benefitApi
      .eligibility()
      .then(({ data }) => setEligibility(data))
      .catch((err) => {
        toast.error(getError(err));
        setEligibility({ eligible: false, requirements: [] });
      });
  }, []);

  const update = (key) => (e) => {
    setForm((f) => ({ ...f, [key]: e.target.value }));
    setErrors((er) => ({ ...er, [key]: "" }));
  };

  const validate = () => {
    const errs = {};
    const amount = Number(form.amount);
    if (form.title.trim().length < 3) errs.title = "Enter a title of at least 3 characters";
    if (!Number.isFinite(amount) || amount <= 0) errs.amount = "Enter an amount greater than zero";
    else if (eligibility.maxAmount > 0 && amount > eligibility.maxAmount)
      errs.amount = `The most you can request is ${naira(eligibility.maxAmount)}`;
    if (form.description.trim().length < 10) errs.description = "Explain why you need it (at least 10 characters)";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      await benefitApi.request({
        title: form.title.trim(),
        category: form.category,
        amount: Number(form.amount),
        neededBy: form.neededBy || undefined,
        description: form.description.trim(),
      });
      toast.success("Benefit request submitted");
      navigate(DASHBOARD_PATH, { replace: true });
    } catch (err) {
      toast.error(getError(err));
    } finally {
      setSubmitting(false);
    }
  };

  if (!eligibility) return <Spinner />;

  const missing = eligibility.requirements.filter((r) => !r.met).length;
  const blocked = eligibility.blacklisted
    ? "Your account is blacklisted, so you can't request a benefit right now."
    : eligibility.openRequest
    ? "You already have a request in progress. You can make a new one once it's completed."
    : null;
  const canSubmit = eligibility.eligible && !submitting;

  const fieldError = (key) =>
    errors[key] ? (
      <p id={`${key}-error`} className="mt-1.5 text-xs text-red-600">
        {errors[key]}
      </p>
    ) : null;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <PageHeader
        title="Request a benefit"
        text="Tell us what you need and how much. An admin reviews every request."
        action={
          <Link to={DASHBOARD_PATH} className="text-sm font-medium text-slate-600 underline-offset-4 hover:underline">
            Back to my benefits
          </Link>
        }
      />

      {blocked && (
        <div role="alert" className="mb-6 flex gap-2.5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{blocked}</span>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-5">
        <Card title="Requirements" className="lg:col-span-2 lg:self-start">
          <p className="mb-3 text-sm text-slate-600">
            {missing === 0
              ? "You meet every requirement."
              : `${missing} requirement${missing === 1 ? "" : "s"} left before you can request.`}
          </p>
          <Checklist items={eligibility.requirements} />
          {missing > 0 && (
            <Link to={PROFILE_PATH} className={`${primaryBtn} mt-4 w-full`}>
              Complete my profile
            </Link>
          )}
          {eligibility.benefitNumber && (
            <p className="mt-4 text-xs text-slate-500">
              Your benefit number: <span className="font-semibold text-slate-800">{eligibility.benefitNumber}</span>
            </p>
          )}
        </Card>

        <Card title="Request details" className="lg:col-span-3">
          <form onSubmit={submit} noValidate className="space-y-5">
            <fieldset disabled={!eligibility.eligible} className="space-y-5 disabled:opacity-60">
              <div>
                <label htmlFor="title" className="mb-1.5 block text-sm font-medium text-slate-700">
                  Title
                </label>
                <input
                  id="title"
                  value={form.title}
                  onChange={update("title")}
                  placeholder="e.g. School fees for my daughter"
                  aria-invalid={Boolean(errors.title)}
                  aria-describedby={errors.title ? "title-error" : undefined}
                  className={inputCls}
                />
                {fieldError("title")}
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label htmlFor="category" className="mb-1.5 block text-sm font-medium text-slate-700">
                    Category
                  </label>
                  <select id="category" value={form.category} onChange={update("category")} className={inputCls}>
                    {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="amount" className="mb-1.5 block text-sm font-medium text-slate-700">
                    Amount (₦)
                  </label>
                  <input
                    id="amount"
                    type="number"
                    inputMode="numeric"
                    min="1"
                    value={form.amount}
                    onChange={update("amount")}
                    placeholder="50000"
                    aria-invalid={Boolean(errors.amount)}
                    aria-describedby={errors.amount ? "amount-error" : undefined}
                    className={inputCls}
                  />
                  {fieldError("amount")}
                  {eligibility.maxAmount > 0 && !errors.amount && (
                    <p className="mt-1.5 text-xs text-slate-500">Maximum {naira(eligibility.maxAmount)}</p>
                  )}
                </div>
              </div>

              <div>
                <label htmlFor="neededBy" className="mb-1.5 block text-sm font-medium text-slate-700">
                  Needed by <span className="font-normal text-slate-400">(optional)</span>
                </label>
                <input
                  id="neededBy"
                  type="date"
                  min={new Date().toISOString().slice(0, 10)}
                  value={form.neededBy}
                  onChange={update("neededBy")}
                  className={inputCls}
                />
              </div>

              <div>
                <label htmlFor="description" className="mb-1.5 block text-sm font-medium text-slate-700">
                  Why do you need this benefit?
                </label>
                <textarea
                  id="description"
                  rows={5}
                  value={form.description}
                  onChange={update("description")}
                  placeholder="Describe the situation and how the money will be used."
                  aria-invalid={Boolean(errors.description)}
                  aria-describedby={errors.description ? "description-error" : undefined}
                  className={inputCls}
                />
                {fieldError("description")}
              </div>
            </fieldset>

            <button type="submit" disabled={!canSubmit} className={`${primaryBtn} w-full sm:w-auto`}>
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Submitting…
                </>
              ) : (
                "Submit request"
              )}
            </button>
          </form>
        </Card>
      </div>
    </div>
  );
}



























































