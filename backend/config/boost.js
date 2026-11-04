// Boost plans, interview fee and ranking rules. All prices are in Naira.

export const BOOST_PLANS = {
  Spotlight: {
    key: "Spotlight", name: "Spotlight", price: 2500, extraDays: 3,
    unlimitedApplicants: false, suggestions: false, adSlot: false,
  },
  Reach: {
    key: "Reach", name: "Reach", price: 4000, extraDays: 7,
    unlimitedApplicants: true, suggestions: true, adSlot: true,
  },
};

export const getBoostPlan = (key) => BOOST_PLANS[key] || null;
export const publicBoostPlans = () => Object.values(BOOST_PLANS);

// Paid by the employer through Paystack when inviting someone to a physical interview
export const PHYSICAL_INTERVIEW_FEE = 4000;

// Jobseeker "account boost" subscription. You didn't give a price, so it comes from
// ACCOUNT_BOOST_PRICE in .env (default 1500). Change it there.
export const ACCOUNT_BOOST = {
  price: Number(process.env.ACCOUNT_BOOST_PRICE || 1500),
  durationDays: 30,
};

// Lower number = first.
// Listing order:  Premium, Reach, Spotlight, Standard, Basic
// Approval order: Reach, Spotlight, Premium, Standard, Basic
export const rankFields = (jobType, boostPlan) => {
  const base = { Premium: 0, Standard: 3, Basic: 4 }[jobType] ?? 4;
  const listingRank = jobType === "Premium" ? 0 : boostPlan === "Reach" ? 1 : boostPlan === "Spotlight" ? 2 : base;
  const approvalRank = boostPlan === "Reach" ? 0 : boostPlan === "Spotlight" ? 1 : jobType === "Premium" ? 2 : base;
  return { listingRank, approvalRank };
};

// Reach unlocks every applicant, whatever the base plan allows
export const effectiveMaxApplicants = (job, plan) => {
  if (job.boost?.plan === "Reach") return Infinity;
  return Number.isFinite(plan?.maxApplicants) ? plan.maxApplicants : Infinity;
};