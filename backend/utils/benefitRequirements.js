// Treat empty values and the "none" placeholder (set on job seekers by the User model) as missing
const has = (v) => {
  if (v === undefined || v === null) return false;
  const s = String(v).trim();
  return s !== "" && s.toLowerCase() !== "none";
};

/**
 * Returns the qualification checklist for a user (plain object or document).
 * `guarantors` can be populated or just ids; only the count matters.
 */
export const getRequirements = (u = {}) => [
  {
    key: "nin",
    label: "NIN verified",
    met: Boolean(u.isNINVerified || u.identityVerification?.nin?.verified),
  },
  { key: "face", label: "Face verification", met: has(u.faceData) },
  {
    key: "residence",
    label: "Proof of residence",
    met: has(u.tenancyAgreement) || has(u.scanningEvidence),
  },
  { key: "account", label: "Bank account number", met: has(u.bankAcctNum) && has(u.bankName) },
  {
    key: "nextOfKin",
    label: "Next of kin details",
    met: has(u.nextOfKin) && has(u.nextOfKinNumber),
  },
  { key: "guarantor", label: "Guarantor details", met: (u.guarantors?.length || 0) > 0 },
  { key: "tin", label: "Tax Identification Number (TIN)", met: has(u.TIN) },
  { key: "residentCard", label: "Residential card", met: has(u.residentialCard) },
];

export const missingRequirements = (u) => getRequirements(u).filter((r) => !r.met);3