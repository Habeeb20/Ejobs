const SYMBOLS = { NGN: "₦", USD: "$", GBP: "£", EUR: "€" };

export const formatSalary = (currency, salary) => {
  const raw = String(salary ?? "").trim();
  if (!raw) return "Not disclosed";
  const cur = String(currency ?? "").trim();
  const sym = SYMBOLS[cur.toUpperCase()] ?? cur;
  const n = Number(raw.replace(/,/g, ""));
  const amount = Number.isFinite(n) ? n.toLocaleString("en-NG") : raw;
  return `${sym}${sym.length > 1 ? " " : ""}${amount}`.trim();
};

const toDate = (v) => {
  const d = v ? new Date(v) : null;
  return d && !Number.isNaN(d.getTime()) ? d : null;
};
export const formatDate = (v) =>
  toDate(v)?.toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" }) ?? "—";
export const isExpired = (v) => !!toDate(v) && toDate(v) < new Date();

export const fmtKm = (km) => `${km < 10 ? km.toFixed(1) : Math.round(km)} km`;
export const fmtMin = (m) => (m < 60 ? `${m} min` : `${Math.floor(m / 60)} hr${m % 60 ? ` ${m % 60} min` : ""}`);

const place = (job, withCompany) =>
  [withCompany && job.employer?.companyName, job.city, job.localGovernment, job.state, "Nigeria"]
    .filter(Boolean)
    .join(", ");

// "Verify Company": opens Google Maps so visitors can check the business exists
export const mapsSearchUrl = (job) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place(job, true))}`;
export const directionsUrl = (job) =>
  `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(place(job, false))}`;