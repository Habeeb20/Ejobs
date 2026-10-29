// Compares a job seeker with a job and returns a 0-100 score plus a per-criterion breakdown.
// Weights: role 30, education 20, location 20, work type 10, salary 10, experience 10.

const norm = (v) => String(v ?? "").toLowerCase().trim();
const nums = (v) => (String(v ?? "").match(/\d[\d,]*/g) || []).map((n) => Number(n.replace(/,/g, "")));
const overlaps = (a, b) => a.includes(b) || b.includes(a);

// Highest rank first so "higher national diploma" isn't read as "diploma".
// Adjust the patterns to match the exact values in your education dropdown.
const EDU = [
  [6, /ph\.?d|doctor/],
  [5, /master|m\.?sc|mba|postgrad|pgd/],
  [4, /bachelor|b\.?sc|b\.?eng|\bb\.?a\b|\bhnd\b|higher national|degree/],
  [3, /\bond\b|\bnd\b|\bnce\b|diploma/],
  [2, /secondary|ssce|waec|neco|o.?level|high school/],
  [1, /primary|fslc/],
];
const eduRank = (v) => {
  const s = norm(v);
  for (const [rank, re] of EDU) if (re.test(s)) return rank;
  return 0;
};

// Needs `workExperience` populated. Reads startDate/endDate or a numeric `years`
// from each entry: rename these if your workModel uses different field names.
const yearsOfExperience = (u) =>
  (u.workExperience || []).reduce((sum, w) => {
    if (typeof w?.years === "number") return sum + w.years;
    const start = new Date(w?.startDate);
    const end = w?.endDate ? new Date(w.endDate) : new Date();
    return isNaN(start) ? sum : sum + Math.max(0, (end - start) / (365.25 * 864e5));
  }, 0);

export function computeMatch(job, seeker) {
  const b = {};

  // Role fit (30)
  const core = [job.jobTitle, job.jobFunction].map(norm).filter(Boolean);
  const jobTerms = [job.jobTitle, job.jobFunction, job.industry, ...(job.jobTag || []), ...(job.jobSkills || [])]
    .map(norm).filter(Boolean);
  const seekerTerms = [...(seeker.jobChoice || []), ...(seeker.interestedJob || []), seeker.job, seeker.handworkSkill, seeker.specifyHandworkSkill]
    .map(norm).filter(Boolean);
  const direct = seekerTerms.some((t) => core.some((c) => overlaps(c, t)));
  const loose = seekerTerms.some((t) => jobTerms.some((j) => overlaps(j, t)));
  b.role = { earned: direct ? 30 : loose ? 18 : 0, max: 30 };

  // Education (20)
  const need = eduRank(job.minimumQualification);
  const have = eduRank(seeker.educationLevel);
  b.education = { earned: have >= need ? 20 : have === need - 1 ? 10 : 0, max: 20 };

  // Location (20): remote jobs fit everyone
  let loc = 0;
  if (/remote/i.test(job.workType || "")) loc = 20;
  else if (norm(seeker.state) && norm(seeker.state) === norm(job.state)) {
    loc = 12;
    if (norm(seeker.localGovernment) === norm(job.localGovernment)) loc += 8;
  }
  b.location = { earned: loc, max: 20 };

  // Work type (10)
  const flat = (v) => norm(v).replace(/[^a-z0-9]/g, ""); // "Full-time" equals "full time"
  const sw = flat(seeker.workingMode);
  const jw = flat(job.workType);
  b.workType = { earned: !sw ? 5 : overlaps(sw, jw) ? 10 : 0, max: 10 };

  // Salary (10): is the job's pay at or above the seeker's minimum?
  const jobMax = Math.max(0, ...nums(job.salary));
  const wants = nums(seeker.minimumSalary)[0];
  let sal = 5;
  if (jobMax && wants != null) sal = wants <= jobMax ? 10 : wants <= jobMax * 1.2 ? 5 : 0;
  b.salary = { earned: sal, max: 10 };

  // Experience (10)
  const required = nums(job.experienceLength)[0] ?? 0;
  const years = yearsOfExperience(seeker);
  b.experience = { earned: required === 0 ? 10 : Math.round(Math.min(1, years / required) * 10), max: 10 };

  const score = Math.round(Object.values(b).reduce((s, x) => s + x.earned, 0));
  return { score, breakdown: b };
}