import { useEffect, useState } from "react";
import { toast } from "sonner";

import { benefitApi, getError } from "../../api";
import {
  BreakdownBars,
  CATEGORY_LABELS,
  Card,
  PageHeader,
  PaymentChart,
  PeriodTabs,
  Spinner,
  StatCard,
  naira,
} from "../../components/benefits/shared";

export default function BenefitStats() {
  const [period, setPeriod] = useState("monthly");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    benefitApi.admin
      .stats(period)
      .then(({ data }) => setData(data))
      .catch((err) => toast.error(getError(err)))
      .finally(() => setLoading(false));
  }, [period]);

  if (!data) return loading ? <Spinner /> : null;

  const { payments, summary, categories, attendance } = data;
  const by = summary.byStatus;

  const statusRows = Object.entries(by).map(([status, v]) => ({
    label: status,
    value: v.count,
    note: `${v.count} · ${naira(status === "pending" || status === "rejected" ? v.requested : v.approved)}`,
  }));
  const categoryRows = categories.map((c) => ({
    label: CATEGORY_LABELS[c.category] || c.category,
    value: c.amount,
    note: `${naira(c.amount)} · ${c.count}`,
  }));

  const average = payments.totals.count ? Math.round(payments.totals.amount / payments.totals.count) : 0;

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6">
      <PageHeader title="Benefit payments" text="How much has been paid out, and when." />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard accent label="Total paid, all time" value={naira(summary.totalPaid)} hint={`${by.paid.count} payment(s)`} />
        <StatCard label="Approved, awaiting payment" value={naira(by.approved.approved)} hint={`${by.approved.count} request(s)`} />
        <StatCard label="Pending review" value={by.pending.count} hint={naira(by.pending.requested)} />
        <StatCard
          label="Beneficiaries"
          value={attendance.activeBeneficiaries}
          hint={`${attendance.flaggedForAbsence} blacklisted for absence`}
        />
      </div>

      <Card title="Payments over time" action={<PeriodTabs value={period} onChange={setPeriod} />}>
        <div className={loading ? "opacity-50" : ""}>
          <PaymentChart series={payments.series} />
        </div>
        <div className="mt-4 grid gap-4 border-t border-slate-100 pt-4 sm:grid-cols-3">
          <div>
            <p className="text-xs text-slate-500">Paid in this view</p>
            <p className="font-display text-lg font-bold text-slate-900">{naira(payments.totals.amount)}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Payments</p>
            <p className="font-display text-lg font-bold text-slate-900">{payments.totals.count}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Average payment</p>
            <p className="font-display text-lg font-bold text-slate-900">{naira(average)}</p>
          </div>
        </div>
      </Card>

      <Card title="Breakdown by period">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[420px] text-left text-sm">
            <thead className="border-b border-slate-200 text-slate-600">
              <tr>
                <th scope="col" className="py-2.5 pr-4 font-medium">Period</th>
                <th scope="col" className="py-2.5 pr-4 text-right font-medium">Payments</th>
                <th scope="col" className="py-2.5 text-right font-medium">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {[...payments.series].reverse().map((r) => (
                <tr key={r.key}>
                  <th scope="row" className="py-2.5 pr-4 font-normal text-slate-800">{r.label}</th>
                  <td className="py-2.5 pr-4 text-right text-slate-600">{r.count}</td>
                  <td className="py-2.5 text-right font-medium text-slate-900">{naira(r.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card title="Requests by status">
          <BreakdownBars rows={statusRows} />
        </Card>
        <Card title="Amount requested by category">
          <BreakdownBars rows={categoryRows} />
        </Card>
      </div>
    </div>
  );
}