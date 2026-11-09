import { Columns, DataTable, Donut, Page, Panel, RankBars, Section, StatStrip, Trend, fmt, money, pct, useStats } from "./Statsui";

const STATUS_COLORS = {
  Online: "#0f766e",
  "Awaiting Approval": "#a16207",
  Draft: "#a8a29e",
  Offline: "#475569",
  Rejected: "#9f1239",
};
const PLAN_COLORS = { Premium: "#c2410c", Standard: "#1d4ed8", Basic: "#78716c", Draft: "#d6d3d1" };

const jobColumns = [
  { key: "title", label: "Job" },
  { key: "employer", label: "Employer" },
  { key: "plan", label: "Plan" },
  { key: "status", label: "Status" },
  { key: "applicants", label: "Applicants", num: true, render: (r) => fmt(r.applicants) },
  { key: "views", label: "Views", num: true, render: (r) => fmt(r.views) },
  { key: "shares", label: "Shares", num: true, render: (r) => fmt(r.shares) },
];

export default function JobStats() {
  const stats = useStats("/admin/stats/jobs");

  return (
    <Page
      title="Job statistics"
      subtitle="Listings by status, plan and payment, where they are, how people engage with them and what the boosts earn."
      stats={stats}
    >
      {(d) => {
        const o = d.overview;
        const a = d.approval;

        return (
          <>
            <StatStrip
              items={[
                { label: "Total jobs", value: fmt(o.total) },
                { label: "Online now", value: fmt(o.online), hint: pct(o.online, o.total) },
                { label: "Awaiting approval", value: fmt(o.awaitingApproval) },
                { label: "Expiring in 7 days", value: fmt(o.expiringIn7Days) },
                { label: "Applicants", value: fmt(o.totalApplicants), hint: `${(o.avgApplicants || 0).toFixed(1)} per job` },
                { label: "Total views", value: fmt(o.totalViews), hint: `${fmt(o.uniqueViews)} unique` },
                { label: "Boost revenue", value: money(o.boostRevenue) },
              ]}
            />

            <Section title="Pipeline">
              <Panel title="By status"><Donut data={d.byStatus} colors={STATUS_COLORS} /></Panel>
              <Panel title="By plan"><Donut data={d.byPlan} colors={PLAN_COLORS} /></Panel>
              <Panel title="Payment"><Donut data={d.byPayment} colors={{ Paid: "#0f766e", Pending: "#a16207", Free: "#a8a29e" }} /></Panel>
              <Panel title="Status within each plan" wide>
                <Trend data={d.planStatus} xKey="plan" colors={STATUS_COLORS} />
              </Panel>
              <Panel title="Needs attention">
                <dl className="space-y-3 text-sm">
                  <Row label="Online but past expiry date" value={fmt(o.expiredStillOnline)} />
                  <Row label="Payment still pending" value={fmt(o.paymentPending)} />
                  <Row label="Rejected" value={fmt(o.rejected)} />
                  <Row label="Jobs with zero applicants" value={`${fmt(o.zeroApplicants)} (${pct(o.zeroApplicants, o.total)})`} />
                  <Row label="Reports filed" value={fmt(o.reports)} />
                </dl>
              </Panel>
            </Section>

            <Section title="Trends">
              <Panel title="Jobs created" note="Stacked by plan" wide>
                <Trend data={d.created} colors={PLAN_COLORS} />
              </Panel>
              <Panel title="Jobs approved"><Trend data={d.approved} /></Panel>
              <Panel title="Boost revenue" note="By the date the boost was paid" wide>
                <Trend data={d.boostTimeline.map((r) => ({ period: r.period, Revenue: r.revenue }))} format={money} />
              </Panel>
            </Section>

            <Section title="Where and what">
              <Panel title="Top states"><RankBars data={d.byState} total={o.total} /></Panel>
              <Panel title="Top cities"><RankBars data={d.byCity} total={o.total} /></Panel>
              <Panel title="Top industries"><RankBars data={d.byIndustry} total={o.total} /></Panel>
              <Panel title="Top job functions"><RankBars data={d.byFunction} total={o.total} /></Panel>
              <Panel title="Work type"><Donut data={d.byWorkType} /></Panel>
              <Panel title="Minimum qualification"><RankBars data={d.byQualification} /></Panel>
              <Panel title="Experience required"><RankBars data={d.byExperience} /></Panel>
              <Panel title="Job level"><Donut data={d.byLevel} /></Panel>
              <Panel title="Open to students"><Donut data={d.byStudents} /></Panel>
              <Panel title="Salary currency"><Donut data={d.byCurrency} /></Panel>
              <Panel title="Where the job came from"><Donut data={d.bySource} /></Panel>
              <Panel title="Application requirements">
                <RankBars
                  total={o.total}
                  data={[
                    { name: "Cover letter required", value: o.requireCoverLetter || 0 },
                    { name: "Documents required", value: o.requireDocuments || 0 },
                    { name: "Virtual interview", value: o.virtualInterview || 0 },
                    { name: "Audience targeting", value: o.withTargeting || 0 },
                    { name: "Starred", value: o.starred || 0 },
                  ]}
                />
              </Panel>
            </Section>

            <Section title="Engagement">
              <Panel title="Totals">
                <dl className="space-y-3 text-sm">
                  <Row label="Views (every open)" value={fmt(o.totalViews)} />
                  <Row label="Unique viewers" value={fmt(o.uniqueViews)} />
                  <Row label="Likes" value={fmt(o.likes)} />
                  <Row label="Follows" value={fmt(o.follows)} />
                  <Row label="Shares" value={fmt(o.shares)} />
                  <Row label="Views per applicant" value={fmt(o.viewsPerApplicant)} />
                </dl>
              </Panel>
              <Panel title="Where jobs are shared"><RankBars data={d.shareChannels} /></Panel>
              <Panel title="Most viewed jobs" wide full>
                <DataTable columns={jobColumns} rows={d.topByViews} />
              </Panel>
              <Panel title="Most applied-to jobs" wide full>
                <DataTable columns={jobColumns} rows={d.topByApplicants} />
              </Panel>
              <Panel title="Most shared jobs" wide full>
                <DataTable columns={jobColumns} rows={d.topByShares} />
              </Panel>
            </Section>

            <Section title="Approvals, boosts and renewals">
              <Panel title="Time to approval" note="From submission to approval">
                <dl className="space-y-3 text-sm">
                  <Row label="Average" value={`${(a.avgHours || 0).toFixed(1)} hours`} />
                  <Row label="Fastest" value={`${(a.minHours || 0).toFixed(1)} hours`} />
                  <Row label="Slowest" value={`${(a.maxHours || 0).toFixed(1)} hours`} />
                  <Row label="Jobs measured" value={fmt(a.count)} />
                </dl>
              </Panel>
              <Panel title="Average approval hours by plan">
                <Columns data={d.approvalByPlan} format={(v) => `${v} h`} />
              </Panel>
              <Panel title="Renewals">
                <dl className="space-y-3 text-sm">
                  <Row label="Jobs renewed at least once" value={fmt(o.renewedJobs)} />
                  <Row label="Total renewals" value={fmt(o.renewals)} />
                  <Row label="Featured (Premium)" value={fmt(o.featured)} />
                  <Row label="Currently boosted" value={fmt(o.boosted)} />
                </dl>
              </Panel>
              <Panel title="Boost plans" wide full>
                <DataTable
                  columns={[
                    { key: "plan", label: "Boost" },
                    { key: "jobs", label: "Jobs", num: true, render: (r) => fmt(r.jobs) },
                    { key: "revenue", label: "Revenue", num: true, render: (r) => money(r.revenue) },
                    { key: "extraDays", label: "Extra days added", num: true, render: (r) => fmt(r.extraDays) },
                    { key: "applicants", label: "Applicants", num: true, render: (r) => fmt(r.applicants) },
                  ]}
                  rows={d.boostPlans}
                />
              </Panel>
            </Section>

            <Section title="Top employers">
              <Panel title="Employers with the most jobs" wide full>
                <DataTable
                  columns={[
                    { key: "name", label: "Company", render: (r) => <span title={r.email}>{r.name || r.email || "—"}</span> },
                    { key: "jobs", label: "Jobs", num: true, render: (r) => fmt(r.jobs) },
                    { key: "online", label: "Online", num: true, render: (r) => fmt(r.online) },
                    { key: "applicants", label: "Applicants", num: true, render: (r) => fmt(r.applicants) },
                    { key: "views", label: "Views", num: true, render: (r) => fmt(r.views) },
                  ]}
                  rows={d.topEmployers}
                />
              </Panel>
            </Section>
          </>
        );
      }}
    </Page>
  );
}

const Row = ({ label, value }) => (
  <div className="flex justify-between gap-3 border-b border-stone-100 pb-2 last:border-0">
    <dt className="text-stone-600">{label}</dt>
    <dd className="tabular-nums text-stone-900">{value}</dd>
  </div>
);