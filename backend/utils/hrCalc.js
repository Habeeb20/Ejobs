// Dates, working days and payslip maths for the HR module. Dates are plain "YYYY-MM-DD" strings in Lagos time.
export const TZ = "Africa/Lagos";
const DAY = 864e5;
export const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;
const sum = (arr, f = (x) => x) => arr.reduce((s, x) => s + (Number(f(x)) || 0), 0);

export const dateStr = (d = new Date()) => new Date(d).toLocaleDateString("en-CA", { timeZone: TZ });
export const monthKey = (d = new Date()) => dateStr(d).slice(0, 7);
export const clockNow = () => new Date().toLocaleTimeString("en-GB", { timeZone: TZ, hour: "2-digit", minute: "2-digit" });
export const minutes = (hhmm) => { const [h, m] = String(hhmm).split(":").map(Number); return h * 60 + (m || 0); };
// "2026-10-05" + "08:30" in Lagos (UTC+1, no daylight saving) -> a real Date
export const atLagos = (date, time) => new Date(`${date}T${time}:00+01:00`);

export const isDateStr = (s) => /^\d{4}-\d{2}-\d{2}$/.test(String(s)) && !isNaN(new Date(`${s}T00:00:00Z`));
const parseDay = (s) => new Date(`${s}T00:00:00Z`);
export const eachDay = (from, to, max = 400) => {
  const out = [];
  for (let d = parseDay(from); d <= parseDay(to) && out.length < max; d = new Date(+d + DAY)) out.push(d.toISOString().slice(0, 10));
  return out;
};
export const weekday = (s) => parseDay(s).getUTCDay(); // 0 = Sunday
export const isWorkDay = (s, settings) =>
  settings.workSchedule.workDays.includes(weekday(s)) && !settings.holidays.some((h) => h.date === s);
export const workingDays = (from, to, settings) => eachDay(from, to).filter((d) => isWorkDay(d, settings));
export const monthRange = (month) => {
  const last = new Date(Date.UTC(+month.slice(0, 4), +month.slice(5, 7), 0)).getUTCDate();
  return [`${month}-01`, `${month}-${String(last).padStart(2, "0")}`];
};

// Progressive tax on an annual figure. bands: [{ upTo, rate }] with upTo = cumulative upper limit (null = no limit)
export const annualTax = (taxable, bands) => {
  let tax = 0, prev = 0;
  for (const b of bands) {
    const top = b.upTo ?? Infinity;
    if (taxable > prev) tax += (Math.min(taxable, top) - prev) * (b.rate / 100);
    if (taxable <= top) break;
    prev = top;
  }
  return tax;
};

/**
 * Works out one payslip. comp = { basic, allowances, annualRent }.
 * PAYE is an estimate: monthly taxable pay x 12, minus rent relief, through the tax bands, divided by 12.
 */
export function computePayslip({ comp, settings, month, adjustments = [], unpaidDays = 0 }) {
  const p = settings.payroll;
  const basic = Number(comp.basic) || 0;
  const allowances = (comp.allowances || []).map((a) => ({ name: a.name, amount: Number(a.amount) || 0, pensionable: !!a.pensionable }));
  const allowanceTotal = sum(allowances, (a) => a.amount);
  const [from, to] = monthRange(month);
  const workDays = workingDays(from, to, settings).length || 1;

  const unpaidLeaveDeduction = round2(((basic + allowanceTotal) / workDays) * unpaidDays);
  const additions = sum(adjustments.filter((a) => ["bonus", "overtime", "reimbursement"].includes(a.kind)), (a) => a.amount);
  const reimbursements = sum(adjustments.filter((a) => a.kind === "reimbursement"), (a) => a.amount);
  const otherDeductions = round2(sum(adjustments.filter((a) => a.kind === "deduction"), (a) => a.amount));

  const gross = round2(basic + allowanceTotal + additions - unpaidLeaveDeduction);
  const pensionable = basic + sum(allowances.filter((a) => a.pensionable), (a) => a.amount);
  const pension = round2((pensionable * p.pensionEmployeePct) / 100);
  const nhf = round2((basic * p.nhfPct) / 100);

  let paye = 0, taxable = 0, rentRelief = 0;
  if (p.payeEnabled) {
    const annualTaxable = Math.max(0, (gross - reimbursements - pension - nhf) * 12);
    rentRelief = comp.annualRent > 0 ? Math.min((comp.annualRent * p.rentReliefPct) / 100, p.rentReliefCap) : 0;
    taxable = round2(Math.max(0, annualTaxable - rentRelief));
    paye = round2(annualTax(taxable, p.bands) / 12);
  }
  const totalDeductions = round2(pension + nhf + paye + otherDeductions);
  return {
    basic, allowances, unpaidLeaveDays: unpaidDays, unpaidLeaveDeduction, gross, pension, nhf,
    rentRelief: round2(rentRelief), taxable, paye, otherDeductions, totalDeductions,
    net: round2(gross - totalDeductions), employerPension: round2((pensionable * p.pensionEmployerPct) / 100),
  };
}