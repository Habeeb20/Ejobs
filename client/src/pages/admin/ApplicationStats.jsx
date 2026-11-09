import { Columns, DataTable, Donut, Page, Panel, RankBars, Section, StatStrip, Trend, fmt, money, pct, personCell, useStats } from "./StatsUI";

const STATUS_COLORS = {
  Applied: "#a8a29e",
  Shortlisted: "#0369a1",
  Interviewed: "#1d4ed8",
  Scheduled: "#7c3aed",
  Offer: "#a16207",
  Accepted: "#4d7c0f",
  Hired: "#0f766e",
  Rejected: "#9f1239",
  Declined: "#be185d",
  Sacked: "#7f1d1d",
};
const RESPONSE_COLORS = { Accepted: "#0f766e", Rejected: "#9f1239", Pending: "#a16207", None: "#d6d3d1" };
const SOURCE_COLORS = { applied: "#1d4ed8", invited: "#c2410c" };

const leaderColumns = (first) => [
  first,
  { key: "applications", label: "Applications", num: true, render: (r) => fmt(r.applications) },
  { key: "shortlisted", label: "Shortlisted or later", num: true, render: (r) => fmt(r.shortlisted) },
  { key: "hired", label: "Hired", num: true, render: (r) => fmt(r.hired) },
];

export default function ApplicationStats() {
  const stats = useStats("/admin/stats/applications");

  return (
    <Page
      title="Application statistics"
      subtitle="How candidates move from applying to being hired, how well they fit, and where the process stalls."
      stats={stats}
    >
      {(d) => {
        const o = d.overview;
        const r = d.rates;

        return (
          <>
            <StatStrip
              items={[
                { label: "Applications", value: fmt(o.total) },
                { label: "Candidates", value: fmt(o.distinctApplicants), hint: `${o.avgPerApplicant} applications each` },
                { label: "Jobs applied to", value: fmt(o.distinctJobs), hint: `${o.avgPerJob} per job` },
                { label: "Hire rate", value: `${r.hire}%` },
                { label: "Rejection rate", value: `${r.rejection}%` },
                { label: "Average match", value: o.avgMatch != null ? `${o.avgMatch}%` : "—", hint: `${fmt(o.scored)} scored` },
              ]}
            />

            <Section title="Outcomes">
              <Panel title="Where applications stand now" wide>
                <Donut data={d.byStatus} colors={STATUS_COLORS} />
              </Panel>
              <Panel title="Rates" note="Share of all applications">
                <RankBars
                  format={(v) => `${v}%`}
                  total={100}
                  data={[
                    { name: "Moved past Applied (not rejected or declined)", value: r.progressed },
                    { name: "Hired", value: r.hire },
                    { name: "Rejected", value: r.rejection },
                    { name: "Declined by candidate", value: r.decline },
                  ]}
                />
              </Panel>
              <Panel title="Applied vs invited"><Donut data={d.bySource} colors={SOURCE_COLORS} /></Panel>
              <Panel title="Why candidates declined" note="Most common reasons given">
                <RankBars data={d.declineReasons} limit={8} />
              </Panel>
              <Panel title="Progress markers">
                <dl className="space-y-3 text-sm">
                  <Row label="Have interviews" value={fmt(o.withInterviews)} />
                  <Row label="Have job offers" value={fmt(o.withOffers)} />
                  <Row label="Boosted candidates (priority)" value={`${fmt(o.priority)} (${r.priority}%)`} />
                  <Row label="Invited from talent search" value={`${fmt(o.invited)} (${r.invited}%)`} />
                </dl>
              </Panel>
            </Section>

            <Section title="Trends">
              <Panel title="Applications received" note="Stacked by source" wide>
                <Trend data={d.created} colors={SOURCE_COLORS} />
              </Panel>
              <Panel title="Final outcomes" note="Grouped by the date of the last update">
                <Trend data={d.outcomes} colors={STATUS_COLORS} />
              </Panel>
            </Section>

            <Section title="Candidate fit">
              <Panel title="Match score" note="Standard and Premium jobs only"><Columns data={d.matchBuckets} /></Panel>
              <Panel title="Distance from the job" note={o.avgDistance != null ? `Average ${o.avgDistance} km` : undefined}>
                <Columns data={d.distanceBuckets} color="#1d4ed8" />
              </Panel>
              <Panel title="Applications and hires by job plan">
                <DataTable
                  columns={[
                    { key: "plan", label: "Plan" },
                    { key: "total", label: "Apps", num: true, render: (x) => fmt(x.total) },
                    { key: "hireRate", label: "Hire rate", num: true, render: (x) => `${x.hireRate}%` },
                    { key: "avgMatch", label: "Match", num: true, render: (x) => (x.avgMatch != null ? `${x.avgMatch}%` : "—") },
                  ]}
                  rows={d.byPlan}
                />
              </Panel>
            </Section>

            <Section title="Candidate responses">
              <Panel title="Response to each stage" note="Shortlisted, Interviewed, Scheduled and Offer" wide>
                <Trend data={d.stageResponses} xKey="stage" colors={RESPONSE_COLORS} />
              </Panel>
              <Panel title="Physical interview invites">
                <Donut data={d.physical.status} />
              </Panel>
              <Panel title="Interview fees" wide>
                <dl className="grid gap-4 text-sm sm:grid-cols-4">
                  <Figure label="Invites sent" value={fmt(d.physical.invites)} />
                  <Figure label="Fees paid" value={`${fmt(d.physical.paid)} (${pct(d.physical.paid, d.physical.invites)})`} />
                  <Figure label="Fee revenue" value={money(d.physical.revenue)} />
                  <Figure label="Average fee" value={money(d.physical.avgFee)} />
                </dl>
              </Panel>
            </Section>

            <Section title="Application quality">
              <Panel title="What candidates submit">
                <RankBars
                  format={(v) => `${v}%`}
                  total={100}
                  data={[
                    { name: "Included a cover letter", value: r.coverLetter },
                    { name: "Attached an extra document", value: r.document },
                  ]}
                />
              </Panel>
              <Panel title="Preferred way to be contacted"><Donut data={d.byMedium} /></Panel>
              <Panel title="Open to student roles"><Donut data={d.byStudents} /></Panel>
              <Panel title="Availability"><RankBars data={d.byAvailability} total={o.total} /></Panel>
              <Panel title="Most applied-for positions"><RankBars data={d.byPosition} total={o.total} limit={12} /></Panel>
            </Section>

            <Section title="Where applications go">
              <Panel title="Industries"><RankBars data={d.byIndustry} total={o.total} /></Panel>
              <Panel title="Job locations (state)"><RankBars data={d.byJobState} total={o.total} /></Panel>
            </Section>

            <Section title="Leaderboards">
              <Panel title="Jobs with the most applications" wide full>
                <DataTable
                  columns={leaderColumns({ key: "title", label: "Job" }).concat([
                    { key: "plan", label: "Plan" },
                    { key: "status", label: "Status" },
                  ])}
                  rows={d.topJobs}
                />
              </Panel>
              <Panel title="Employers receiving the most applications" wide>
                <DataTable columns={leaderColumns({ key: "name", label: "Company", render: personCell })} rows={d.topEmployers} />
              </Panel>
              <Panel title="Most active candidates">
                <DataTable columns={leaderColumns({ key: "name", label: "Candidate", render: personCell })} rows={d.topApplicants} />
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

const Figure = ({ label, value }) => (
  <div>
    <dt className="text-stone-500">{label}</dt>
    <dd className="mt-1 text-xl font-semibold tabular-nums text-stone-900">{value}</dd>
  </div>
);