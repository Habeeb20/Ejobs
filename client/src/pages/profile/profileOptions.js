const opts = (list) => list.map((v) => ({ value: v, label: v[0].toUpperCase() + v.slice(1) }));

export const GENDERS = opts(["male", "female"]);
export const MARITAL = opts(["single", "married", "divorced", "widowed"]);
export const JOB_MODES = opts(["full-time", "part-time", "contract", "remote"]);
export const RELATIONSHIPS = opts(["parent", "sibling", "spouse", "child", "relative", "friend", "other"]);
export const EDUCATION = [
  { value: "primary", label: "Primary" },
  { value: "secondary", label: "Secondary (SSCE)" },
  { value: "ond/nce", label: "OND / NCE" },
  { value: "hnd/bsc", label: "HND / Bachelor's" },
  { value: "masters", label: "Master's" },
  { value: "phd", label: "PhD" },
];
export const EMPLOYER_TYPES = [
  { value: "company", label: "Company" },
  { value: "individual", label: "Individual" },
  { value: "ngo", label: "NGO" },
  { value: "government", label: "Government" },
];
export const COMPANY_SIZES = ["1-10", "11-50", "51-200", "201-500", "500+"].map((v) => ({
  value: v,
  label: `${v} employees`,
}));
export const BANKS = [
  "Access Bank", "Ecobank", "Fidelity Bank", "First Bank of Nigeria", "FCMB",
  "Guaranty Trust Bank (GTBank)", "Keystone Bank", "Kuda Bank", "Moniepoint", "OPay",
  "PalmPay", "Polaris Bank", "Stanbic IBTC Bank", "Sterling Bank", "Union Bank",
  "United Bank for Africa (UBA)", "Wema Bank", "Zenith Bank",
];