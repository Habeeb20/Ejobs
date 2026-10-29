import Benefit, { BENEFIT_STATUS } from "../models/Benefit.js";

const TZ = "Africa/Lagos";
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// How many buckets each period returns
export const PERIODS = {
  daily: 30,
  weekly: 12,
  monthly: 12,
  quarterly: 8,
  half_year: 6,
  yearly: 5,
};

const pad = (n) => String(n).padStart(2, "0");
const ymd = (d) => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
const parse = (s) => {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
};
const todayInLagos = () => parse(new Date().toLocaleDateString("en-CA", { timeZone: TZ }));

// The bucket a calendar date falls into
const bucketOf = (d, period) => {
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth();
  const day = d.getUTCDate();

  switch (period) {
    case "daily":
      return { key: ymd(d), label: `${day} ${MONTHS[m]}`, start: d };
    case "weekly": {
      const monday = new Date(Date.UTC(y, m, day - ((d.getUTCDay() + 6) % 7)));
      return {
        key: ymd(monday),
        label: `${monday.getUTCDate()} ${MONTHS[monday.getUTCMonth()]}`,
        start: monday,
      };
    }
    case "monthly":
      return { key: `${y}-${pad(m + 1)}`, label: `${MONTHS[m]} ${y}`, start: new Date(Date.UTC(y, m, 1)) };
    case "quarterly": {
      const q = Math.floor(m / 3);
      return { key: `${y}-Q${q + 1}`, label: `Q${q + 1} ${y}`, start: new Date(Date.UTC(y, q * 3, 1)) };
    }
    case "half_year": {
      const h = m < 6 ? 1 : 2;
      return { key: `${y}-H${h}`, label: `H${h} ${y}`, start: new Date(Date.UTC(y, (h - 1) * 6, 1)) };
    }
    default:
      return { key: String(y), label: String(y), start: new Date(Date.UTC(y, 0, 1)) };
  }
};

// A date that lands i periods before today
const stepBack = (today, period, i) => {
  const y = today.getUTCFullYear();
  const m = today.getUTCMonth();
  const d = today.getUTCDate();
  switch (period) {
    case "daily":
      return new Date(Date.UTC(y, m, d - i));
    case "weekly":
      return new Date(Date.UTC(y, m, d - 7 * i));
    case "monthly":
      return new Date(Date.UTC(y, m - i, 1));
    case "quarterly":
      return new Date(Date.UTC(y, m - 3 * i, 1));
    case "half_year":
      return new Date(Date.UTC(y, m - 6 * i, 1));
    default:
      return new Date(Date.UTC(y - i, 0, 1));
  }
};

/**
 * Paid benefits grouped into the last N buckets of the chosen period.
 * Empty buckets are included so charts have no gaps.
 * `match` narrows the data (e.g. { user: ObjectId } for one job seeker).
 */
export const paymentSeries = async (period = "monthly", match = {}) => {
  if (!PERIODS[period]) period = "monthly";
  const count = PERIODS[period];
  const today = todayInLagos();

  const buckets = Array.from({ length: count }, (_, k) =>
    bucketOf(stepBack(today, period, count - 1 - k), period)
  );
  const from = new Date(buckets[0].start.getTime() - 24 * 60 * 60 * 1000);

  const days = await Benefit.aggregate([
    { $match: { ...match, status: BENEFIT_STATUS.PAID, paidAt: { $gte: from } } },
    {
      $group: {
        _id: { $dateToString: { format: "%Y-%m-%d", date: "$paidAt", timezone: TZ } },
        amount: { $sum: { $ifNull: ["$approvedAmount", 0] } },
        count: { $sum: 1 },
      },
    },
  ]);

  const rows = new Map(buckets.map((b) => [b.key, { key: b.key, label: b.label, amount: 0, count: 0 }]));
  for (const day of days) {
    const row = rows.get(bucketOf(parse(day._id), period).key);
    if (row) {
      row.amount += day.amount;
      row.count += day.count;
    }
  }

  const series = [...rows.values()];
  return {
    period,
    series,
    totals: {
      amount: series.reduce((s, r) => s + r.amount, 0),
      count: series.reduce((s, r) => s + r.count, 0),
    },
  };
};

/** Count and money by status. `approved` is what was granted, `requested` what was asked for. */
export const statusSummary = async (match = {}) => {
  const rows = await Benefit.aggregate([
    { $match: match },
    {
      $group: {
        _id: "$status",
        count: { $sum: 1 },
        requested: { $sum: "$amount" },
        approved: { $sum: { $ifNull: ["$approvedAmount", 0] } },
      },
    },
  ]);

  const out = {};
  for (const status of Object.values(BENEFIT_STATUS)) {
    out[status] = { count: 0, requested: 0, approved: 0 };
  }
  for (const r of rows) out[r._id] = { count: r.count, requested: r.requested, approved: r.approved };

  return {
    byStatus: out,
    totalRequests: Object.values(out).reduce((s, r) => s + r.count, 0),
    totalPaid: out.paid.approved,
  };
};

/** Requests and requested amount by category */
export const categorySummary = (match = {}) =>
  Benefit.aggregate([
    { $match: match },
    { $group: { _id: "$category", count: { $sum: 1 }, amount: { $sum: "$amount" } } },
    { $sort: { amount: -1 } },
    { $project: { _id: 0, category: "$_id", count: 1, amount: 1 } },
  ]);