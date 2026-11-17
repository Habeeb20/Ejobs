// backend/config/recruitmentPlans.js
// Everything that describes the recruitment packages and policies lives here.
// Prices are NOT in this file: an admin sets them in the app (PUT /api/recruitment/admin/plans/:key).

export const TERMS_VERSION = "2026-11";
export const CURRENCY = "NGN";
export const CHANGE_REQUEST_FEE_PCT = 15;     // fee for a changed or renewed request, % of the original package fee
export const HIRING_ENGAGEMENT_FEE_PCT = 15;  // extra fee when the company also handles the hiring process

export const CHECKS = {
  identity: "Identity verification",
  credentials: "Evaluation of credentials",
  employment_history: "Employment history check",
  reference: "Reference check",
  skills: "Skill assessment",
  competency: "Competency assessment",
  assessment_report: "Detailed candidate assessment report",
};

// Candidate pipeline. Sourced/Screened/Shortlisted are internal; the client sees a candidate from "Submitted" on.
export const STAGES = ["Sourced", "Screened", "Shortlisted", "Submitted", "Interviewing", "Offered", "Hired", "Rejected", "Withdrawn", "Replaced"];

export const CHANGE_TYPES = [
  { value: "jd_change", label: "Change in job description" },
  { value: "candidate_requirements", label: "Change in candidate requirements" },
  { value: "additional_sourcing", label: "Additional sourcing" },
  { value: "additional_positions", label: "Additional positions" },
  { value: "revised_requirements", label: "Revised requirements for a replacement" },
  { value: "other", label: "Other material change to the recruitment plan" },
];

export const PLAN_DEFAULTS = [
  {
    key: "basic", order: 1, name: "Basic", tagline: "One position, filled within a month",
    durationDays: 30,
    paymentTerms: { upfrontPct: 100, label: "One-month payment, per job" },
    limits: { shortlistMax: 5, screenMax: null, hireTarget: 1 },
    checks: ["identity"],
    replacement: { count: 1, windowDays: 90, maxPerYear: 2 },
    features: [
      "Candidate sourcing",
      "Preliminary candidate screening",
      "Review of CVs and professional profiles",
      "Shortlisting of up to 5 suitable candidates to hire 1",
      "Initial candidate interviews",
      "Basic identity verification",
      "Interview scheduling",
      "Candidate profile submission to the Client",
      "Recruitment coordination up to the point of hiring",
    ],
  },
  {
    key: "standard", order: 2, name: "Standard", tagline: "Get the right candidate faster, for professional and mid-level roles",
    durationDays: 45,
    paymentTerms: { upfrontPct: 100, label: "45 days (two-month) payment, per job" },
    limits: { shortlistMax: 4, screenMax: 6, hireTarget: 1 },
    checks: ["identity", "credentials", "employment_history", "skills"],
    replacement: { count: 1, windowDays: 90, maxPerYear: 2 },
    features: [
      "Getting the right candidate based on the job requirement",
      "Targeted candidate sourcing",
      "Screening of up to 6 candidates",
      "Shortlisting of up to 4 qualified candidates to hire 1",
      "Identity verification",
      "Evaluation of credentials",
      "Employment history checks",
      "Candidate skill assessment",
      "Interview scheduling and coordination",
      "Offer and hiring coordination",
      "One replacement candidate within 90 days of the successful candidate's commencement date, subject to the Replacement Policy",
    ],
  },
  {
    key: "multiple", order: 3, name: "Multiple Hire", tagline: "Unlock multiple qualified employees",
    durationDays: 45,
    paymentTerms: { upfrontPct: 100, label: "45 days (two-month) payment" },
    limits: { shortlistMax: 7, screenMax: null, hireTarget: 3 },
    checks: ["identity", "credentials", "employment_history", "competency", "skills"],
    replacement: { count: 2, windowDays: 180, maxPerYear: null },
    features: [
      "Recruitment strategy consultation",
      "Workforce and hiring requirement assessment",
      "Candidate sourcing",
      "Active headhunting for suitable professionals",
      "Screening and evaluation of candidates",
      "Shortlisting of up to 7 relevant candidates to hire 3",
      "Competency and skills assessment",
      "Identity and credential verification",
      "Employment checks",
      "Interview scheduling and coordination",
      "Hiring and onboarding coordination",
      "Dedicated recruitment support",
      "Up to two replacement candidates within six months, subject to the Replacement Policy",
    ],
  },
  {
    key: "executive", order: 4, name: "Executive", tagline: "Senior executives, managers, specialists and other critical personnel",
    durationDays: 90,
    paymentTerms: { upfrontPct: 40, label: "90 days: 40% upfront and 60% upon successful hiring of the candidate" },
    limits: { shortlistMax: 5, screenMax: 5, hireTarget: 1 },
    checks: ["identity", "employment_history", "reference", "assessment_report"],
    replacement: { count: 2, windowDays: 180, maxPerYear: null },
    features: [
      "Detailed consultation to understand the position, organisational structure and hiring objectives",
      "Development and review of the executive job description",
      "Evaluation of the applicant's profile",
      "Targeted headhunting and direct sourcing of qualified professionals",
      "Access to our professional candidates",
      "Professional profile assessment",
      "Shortlisting of highly qualified candidates based on the Client's requirements",
      "Executive-level preliminary interviews",
      "Employment history and experience verification",
      "Reference checks",
      "Identity verification",
      "Detailed candidate assessment report",
      "Interview scheduling and coordination of shortlisted candidates",
      "A curated shortlist of suitable executive candidates",
      "Verification and screening reports",
      "Recruitment progress updates",
      "Screening 3 to 5 candidates to hire",
      "Up to two replacement candidates within six months, subject to the Replacement Policy",
    ],
  },
];

// eligible: true = qualifies, false = excluded by the policy, "review" = admin decides
export const REPLACEMENT_REASONS = [
  { code: "resigned", label: "The candidate resigned or quit", eligible: true },
  { code: "poor_performance", label: "The candidate is performing poorly", eligible: true },
  { code: "no_show", label: "The candidate accepted the position but did not resume work without reasonable justification", eligible: true },
  { code: "unable_to_assume_work", label: "The candidate was interviewed but is unable to assume work", eligible: true },
  { code: "other", label: "Another reason (our team will review it)", eligible: "review" },
  { code: "client_changed_terms", label: "I changed the job description, duties, working conditions, pay or location after the candidate started", eligible: false,
    explain: "Replacement is not available where the Client materially changes the job description, duties, working conditions, compensation or location after employment has commenced." },
  { code: "client_terminated", label: "I ended or rejected the candidate for reasons unrelated to their performance", eligible: false,
    explain: "Replacement is not available where the Client voluntarily terminates or rejects the candidate for reasons unrelated to the candidate's performance." },
  { code: "client_attributable", label: "The candidate left because of my workplace (hostile, unsafe or toxic environment, breach of terms, or changed conditions)", eligible: false,
    explain: "Replacement is not available where the candidate leaves because of circumstances attributable to the Client." },
  { code: "management_decision", label: "The candidate was dismissed because of my own management decision", eligible: false,
    explain: "Replacement is not available where the candidate is terminated for reasons arising from the Client's own management decision." },
  { code: "rejected_after_hire", label: "I voluntarily hired the candidate and then rejected them", eligible: false,
    explain: "There is no replacement where the company voluntarily and successfully hired a candidate and then rejected the candidate." },
];

const days = (n) => (n % 30 === 0 ? `${n / 30} months` : `${n} days`);
const replacementLines = PLAN_DEFAULTS.map((p) => {
  const r = p.replacement;
  const base = `${p.name} plan: ${r.count === 1 ? "one (1) replacement" : `up to ${r.count === 2 ? "two (2)" : r.count} replacements`} within ${days(r.windowDays)} of the candidate's commencement date`;
  return r.maxPerYear ? `${base}, with at most ${r.maxPerYear === 2 ? "two" : r.maxPerYear} replacements in a year.` : `${base}.`;
});

export const POLICIES = [
  {
    id: "refund", title: "Refund policy",
    intro: "All recruitment fees paid under a selected package are generally non-refundable once recruitment services have commenced, because of the resources, time and professional services invested in candidate sourcing, headhunting, screening, interviewing, verification, assessment and recruitment coordination. Accordingly:",
    items: [
      "No cash refund is payable merely because a Client later decides not to proceed with a candidate after recruitment services have commenced.",
      "No refund is payable where a Client changes its hiring requirements after candidate sourcing or screening has commenced.",
      "No refund is payable where a Client changes, upgrades, downgrades or otherwise alters its selected subscription plan after the recruitment process has commenced.",
      "No refund is payable where a Client rejects a candidate after the candidate has accepted the employment offer and the Client has confirmed the candidate's engagement.",
      "Upfront fees are not refundable.",
      "Where a candidate has been successfully recruited but cannot resume employment because of circumstances attributable to the candidate, the Client may be entitled to a replacement candidate under the Replacement Policy.",
      "Where a candidate leaves employment or fails to meet the agreed employment requirements within the replacement period, the Client may be entitled to a replacement candidate, subject to the terms of the selected package.",
      "Where a candidate under-performs, a free replacement shall be made.",
      "Where a candidate has been interviewed and is unable to assume work, the Client is entitled to a free replacement.",
    ],
  },
  {
    id: "change", title: "Request renewal and change of request fee",
    intro: `Where a Client requests renewal of recruitment services after the recruitment process has commenced, such as a change in the job description, a change in candidate requirements, additional sourcing, additional positions or any material alteration to the original recruitment plan, the request attracts an additional fee of ${CHANGE_REQUEST_FEE_PCT}% of the original recruitment plan. The fee is shown to the Client and must be approved by the Client before the additional service starts.`,
  },
  {
    id: "replacement", title: "Replacement policy",
    intro: "Replacement is provided at no additional recruitment fee, subject to these Terms. The Client is entitled to replacement according to the subscription plan:",
    items: replacementLines,
    sections: [
      { heading: "A replacement is made where", items: [
        "the candidate resigns or quits within the replacement period of the plan;",
        "the company finds the candidate to have poor performance; or",
        "the candidate accepts the position but fails to resume work without reasonable justification.",
      ] },
      { heading: "A replacement is not made where", items: [
        "the Client materially changes the candidate's job description, duties, working conditions, compensation or location after employment has commenced;",
        "the Client voluntarily terminates or rejects the candidate for reasons unrelated to the candidate's performance;",
        "the candidate leaves because of circumstances attributable to the Client, including a hostile, unsafe or toxic working environment, a material breach of the employment terms by the Client, or substantial changes to the agreed employment conditions;",
        "the candidate is terminated for reasons arising from the Client's own management decision;",
        "the company voluntarily and successfully hired a candidate and then rejected the candidate; or",
        "the applicable replacement period has expired.",
      ] },
    ],
    outro: "A replacement candidate is subject to the same recruitment requirements as the original engagement, unless the Client submits a revised recruitment request, in which case an additional payment applies.",
  },
  {
    id: "liability", title: "Limitation of liability",
    paragraphs: [
      "The Company exercises reasonable professional care and diligence in sourcing, screening, interviewing, verifying and assessing candidates in accordance with the recruitment package selected by the Client. However, the Company does not guarantee the future conduct, performance, integrity, productivity, loyalty, attendance, employment relationship or other actions of any candidate after the candidate has been hired by the Client.",
      "The Company is not liable for any indirect, consequential, incidental or economic loss arising from the acts, omissions, misconduct, negligence, fraudulent conduct, breach of duty, infringement of intellectual property rights or other conduct of a candidate after employment or engagement by the Client. The Client remains responsible for making the final hiring decision and for any additional due diligence, assessment or verification it considers necessary before employing a candidate. Nothing in these Terms excludes or limits liability for fraud or wilful misconduct.",
    ],
  },
  {
    id: "payment", title: "Payment and commencement of services",
    paragraphs: ["Recruitment services start when the applicable upfront or full payment for the subscription package is received and the Client's recruitment requirements are confirmed. The Company may suspend or withhold recruitment services where applicable fees are unpaid, overdue or otherwise outstanding."],
  },
  {
    id: "scope", title: "Nature and scope of services",
    paragraphs: [
      "The Company acts as a recruitment and candidate-sourcing service provider and does not become the employer of any candidate by sourcing, screening, interviewing or recommending the candidate to the Client.",
      `Unless otherwise agreed in writing, the Client is responsible for making the final hiring decision, negotiating employment terms, issuing the employment offer, entering into the employment relationship and managing the candidate after employment. Where the Client engages the Company in the hiring process, the Client pays an additional ${HIRING_ENGAGEMENT_FEE_PCT}% on top of the subscription package.`,
    ],
  },
  {
    id: "responsibilities", title: "Client responsibilities",
    intro: "The Client shall:",
    items: [
      "provide accurate and complete information about the position to be filled;",
      "provide a clear job description, required qualifications, experience, skills and other relevant recruitment criteria;",
      "promptly communicate any change to the recruitment requirements before the Company completes the subscription plan;",
      "give timely feedback on shortlisted candidates;",
      "make the final employment decision independently; and",
      "provide accurate information about the status of a candidate's employment where it is needed for recruitment administration, replacement or other contractual purposes.",
    ],
  },
  {
    id: "acceptance", title: "Acceptance of terms",
    paragraphs: ["By subscribing to, purchasing or otherwise engaging any recruitment package offered by the Company, the Client acknowledges that it has read, understood and agreed to be bound by the applicable pricing, service terms, payment conditions, refund policy, replacement policy and other provisions contained here. The Client's payment for a recruitment package is acceptance of these Terms and confirmation of its request for the selected recruitment service."],
  },
];