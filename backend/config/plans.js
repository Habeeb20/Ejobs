// Single source of truth for every plan rule. Change a number here and the
// API, the limits and the plan cards in the UI (served by GET /jobs/plans) all follow.
const HOUR = 60 * 60 * 1000;

export const PLANS = {
  Basic: {
    key: "Basic", name: "Basic", price: 0,
    durationMs: 24 * HOUR, maxApplicants: 10, points: 0,
    renewable: false, analytics: false, matchScore: false,
    liveAlerts: false, targeting: false, ads: false,
  },
  Standard: {
    key: "Standard", name: "Standard", price: 2000,
    durationMs: 7 * 24 * HOUR, maxApplicants: 50, points: 0,
    renewable: true, analytics: true, matchScore: true,
    liveAlerts: true, targeting: false, ads: false,
  },
  Premium: {
    key: "Premium", name: "Premium", price: 5000,
    durationMs: 30 * 24 * HOUR, maxApplicants: Infinity, points: 10,
    renewable: true, analytics: true, matchScore: true,
    liveAlerts: true, targeting: true, ads: true,
  },
};

export const getPlan = (type) => PLANS[type] || null;

// JSON-safe version (Infinity can't be serialised) for the frontend
export const publicPlan = (type) => {
  const p = getPlan(type);
  if (!p) return null;
  return {
    ...p,
    durationHours: p.durationMs / HOUR,
    maxApplicants: Number.isFinite(p.maxApplicants) ? p.maxApplicants : null, // null = unlimited
  };
};

export const publicPlans = () => Object.keys(PLANS).map(publicPlan);