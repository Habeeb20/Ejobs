// src/pages/employer/RecruitmentOrderPage.jsx   route: /employer/recruitment/new/:plan
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, X } from "lucide-react";
import recruitmentApi from "./recruitmentApi";
import {
  Field, Notice, Panel, Spinner, Modal, PolicyBody, inputCls, btnPrimary, btnGhost, money, apiError, planPrice,
} from "./ui";

const TYPES = ["Full-time", "Part-time", "Contract", "Temporary", "Internship"];

export default function RecruitmentOrderPage() {
  const { plan: planKey } = useParams();
  const navigate = useNavigate();
  const [cat, setCat] = useState(null);
  const [form, setForm] = useState({
    jobTitle: "", description: "", qualifications: "", experience: "", location: "", employmentType: "Full-time",
    annualSalary: "", hiringEngagement: false, termsAccepted: false,
  });
  const [skills, setSkills] = useState([]);
  const [skillInput, setSkillInput] = useState("");
  const [quote, setQuote] = useState(null);
  const [quoteError, setQuoteError] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [showTerms, setShowTerms] = useState(false);

  const plan = useMemo(() => cat?.plans.find((p) => p.key === planKey), [cat, planKey]);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value }));
  const percentPricing = plan?.pricing?.model === "percent";

  useEffect(() => { recruitmentApi.catalog().then(setCat).catch((e) => setError(apiError(e))); }, []);

  // live fee estimate
  useEffect(() => {
    if (!plan?.priced) return undefined;
    const salary = Number(form.annualSalary) || 0;
    if (percentPricing && salary <= 0) { setQuote(null); setQuoteError(""); return undefined; }
    const t = setTimeout(() => {
      recruitmentApi.quote({ plan: planKey, annualSalary: salary, hiringEngagement: form.hiringEngagement })
        .then((r) => { setQuote(r); setQuoteError(""); })
        .catch((e) => { setQuote(null); setQuoteError(apiError(e)); });
    }, 350);
    return () => clearTimeout(t);
  }, [plan, planKey, percentPricing, form.annualSalary, form.hiringEngagement]);

  const addSkill = () => {
    const s = skillInput.trim();
    if (s && !skills.includes(s) && skills.length < 20) setSkills([...skills, s]);
    setSkillInput("");
  };

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const { request } = await recruitmentApi.createRequest({
        ...form, plan: planKey, skills, annualSalary: Number(form.annualSalary) || 0,
      });
      navigate(`/employer/recruitment/requests/${request._id}`, { replace: true, state: { justOrdered: true } });
    } catch (err) {
      setError(apiError(err));
      window.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      setSaving(false);
    }
  };

  if (error && !cat) return <div className="mx-auto max-w-3xl p-6"><Notice tone="error">{error}</Notice></div>;
  if (!cat) return <Spinner label="Loading" />;
  if (!plan) return (
    <div className="mx-auto max-w-3xl p-6">
      <Notice tone="warn">That package is not available. <Link className="font-medium underline" to="/employer/recruitment">See all packages</Link></Notice>
    </div>
  );

  const termsPolicies = cat.policies;
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <Link to="/employer/recruitment" className="mb-4 inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900">
        <ArrowLeft className="h-4 w-4" /> All packages
      </Link>
      <h1 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">Order the {plan.name} package</h1>
      <p className="mt-1 text-sm text-gray-600">The more precisely you describe the role, the better the candidates we find.</p>

      {error && <div className="mt-5"><Notice tone="error">{error}</Notice></div>}

      <form onSubmit={submit} className="mt-8 grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          <Panel title="About the role">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Job title" className="sm:col-span-2">
                <input className={inputCls} value={form.jobTitle} onChange={set("jobTitle")} maxLength={120} required placeholder="e.g. Senior accountant" />
              </Field>
              <Field label="Job description" hint="Duties, team, reporting line and what success looks like." className="sm:col-span-2">
                <textarea className={inputCls} rows={6} value={form.description} onChange={set("description")} maxLength={5000} required />
              </Field>
              <Field label="Required qualifications" className="sm:col-span-2">
                <textarea className={inputCls} rows={3} value={form.qualifications} onChange={set("qualifications")} maxLength={3000} placeholder="Degrees, certifications, licences" />
              </Field>
              <Field label="Key skills" hint="Press Enter to add each skill." className="sm:col-span-2">
                <div className="flex flex-wrap gap-2 rounded-lg border border-gray-300 p-2 focus-within:border-orange-500 focus-within:ring-2 focus-within:ring-orange-200">
                  {skills.map((s) => (
                    <span key={s} className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-2.5 py-1 text-xs font-medium text-orange-800">
                      {s}
                      <button type="button" onClick={() => setSkills(skills.filter((x) => x !== s))} aria-label={`Remove ${s}`}><X className="h-3 w-3" /></button>
                    </span>
                  ))}
                  <input
                    className="min-w-[8rem] flex-1 border-0 bg-transparent px-1 py-1 text-sm outline-none" value={skillInput} placeholder={skills.length ? "" : "e.g. IFRS, Excel"}
                    onChange={(e) => setSkillInput(e.target.value)} onBlur={addSkill}
                    onKeyDown={(e) => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addSkill(); } }}
                  />
                </div>
              </Field>
              <Field label="Experience needed"><input className={inputCls} value={form.experience} onChange={set("experience")} maxLength={200} placeholder="e.g. 5+ years in banking" /></Field>
              <Field label="Work location"><input className={inputCls} value={form.location} onChange={set("location")} maxLength={160} placeholder="e.g. Lekki, Lagos" /></Field>
              <Field label="Employment type">
                <select className={inputCls} value={form.employmentType} onChange={set("employmentType")}>{TYPES.map((t) => <option key={t}>{t}</option>)}</select>
              </Field>
              <Field
                label={`Annual salary (NGN)${percentPricing ? "" : ", optional"}`}
                hint={percentPricing ? `Required. The fee is ${plan.pricing.percent}% of this amount.` : "Helps us match candidates to your budget."}
              >
                <input className={inputCls} type="number" min="0" inputMode="numeric" value={form.annualSalary} onChange={set("annualSalary")} required={percentPricing} />
              </Field>
            </div>
          </Panel>

          <Panel title="Hiring process">
            <label className="flex cursor-pointer gap-3">
              <input type="checkbox" className="mt-1 h-4 w-4 rounded border-gray-300 text-orange-600 focus:ring-orange-500" checked={form.hiringEngagement} onChange={set("hiringEngagement")} />
              <span className="text-sm text-gray-700">
                <span className="font-medium text-gray-900">Handle the hiring process for me (+{cat.engagementFeePct}%)</span>
                <br />By default you make the final decision, negotiate terms and issue the offer. Tick this if you want us to run that process as well.
              </span>
            </label>
          </Panel>
        </div>

        <aside className="lg:sticky lg:top-6 lg:self-start">
          <Panel title="Your order">
            <p className="font-semibold text-gray-900">{plan.name}</p>
            <p className="text-sm text-gray-600">{planPrice(plan)}</p>
            <p className="mt-1 text-xs text-gray-500">{plan.paymentTerms.label}</p>

            <dl className="mt-5 space-y-2 border-t border-gray-100 pt-4 text-sm">
              {quote ? (
                <>
                  <div className="flex justify-between"><dt className="text-gray-600">Package fee</dt><dd>{money(quote.fees.base)}</dd></div>
                  {quote.fees.engagement > 0 && <div className="flex justify-between"><dt className="text-gray-600">Hiring process</dt><dd>{money(quote.fees.engagement)}</dd></div>}
                  <div className="flex justify-between border-t border-gray-100 pt-2 text-base font-semibold text-gray-900"><dt>Total</dt><dd>{money(quote.fees.total)}</dd></div>
                  <div className="flex justify-between"><dt className="text-gray-600">Pay now</dt><dd className="font-medium">{money(quote.fees.upfront)}</dd></div>
                  {quote.fees.balance > 0 && <div className="flex justify-between"><dt className="text-gray-600">Pay on successful hire</dt><dd>{money(quote.fees.balance)}</dd></div>}
                </>
              ) : (
                <p className="text-gray-500">{quoteError || (percentPricing ? "Enter the annual salary to see your fee." : "Calculating your fee")}</p>
              )}
            </dl>

            <label className="mt-5 flex cursor-pointer gap-3 border-t border-gray-100 pt-4">
              <input type="checkbox" className="mt-1 h-4 w-4 rounded border-gray-300 text-orange-600 focus:ring-orange-500" checked={form.termsAccepted} onChange={set("termsAccepted")} required />
              <span className="text-sm text-gray-700">
                I have read and accept the{" "}
                <button type="button" className="font-medium text-orange-700 underline" onClick={() => setShowTerms(true)}>recruitment terms</button>, including the refund and replacement policies.
              </span>
            </label>

            <button type="submit" disabled={saving || !quote || !form.termsAccepted} className={`${btnPrimary} mt-5 w-full`}>
              {saving ? "Placing order" : "Place order"}
            </button>
            <p className="mt-3 text-xs text-gray-500">You pay by bank transfer after placing the order. Recruitment starts when we confirm your payment.</p>
          </Panel>
        </aside>
      </form>

      <Modal open={showTerms} onClose={() => setShowTerms(false)} title="Recruitment terms" wide
        footer={<button className={btnGhost} onClick={() => setShowTerms(false)}>Close</button>}>
        {termsPolicies.map((p) => (
          <div key={p.id}><h3 className="mb-2 font-semibold text-gray-900">{p.title}</h3><PolicyBody policy={p} /></div>
        ))}
      </Modal>
    </div>
  );
}