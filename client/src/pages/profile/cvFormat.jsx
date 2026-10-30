const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export const fmtMonth = (m) => {
  const [y, mo] = String(m || "").split("-");
  return y && mo ? `${MONTHS[Number(mo) - 1] ?? ""} ${y}`.trim() : y || "";
};

export const fmtPeriod = (start, end, current) =>
  [fmtMonth(start), current ? "Present" : fmtMonth(end)].filter(Boolean).join(" – ");