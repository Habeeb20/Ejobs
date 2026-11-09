import { DataTable, Donut, Columns, Page, Panel, RankBars, Section, StatStrip, Trend, fmt, money, pct, personCell, useStats } from "./Statsui";

const ROLE_COLORS = { jobseeker: "#0f766e", employer: "#c2410c", agent: "#1d4ed8", admin: "#7c3aed", superadmin: "#be185d" };

export default function UserStats() {
  const stats = useStats("/admin/stats/users");

  return (
    <Page
      title="User statistics"
      subtitle="Who is on the platform, how they joined, how active they are and how trusted their accounts are."
      stats={stats}
    >
      {(d) => {
        const o = d.overview;
        const js = d.jobseekers;
        const em = d.employers;
        const jo = js.overview;
        const eo = em.overview;

        const activity = [
          { name: "24 hours", value: o.active24h },
          { name: "7 days", value: o.active7d },
          { name: "30 days", value: o.active30d },
          { name: "90 days", value: o.active90d },
          { name: "Ever", value: o.total },
        ];

        const completeness = [
          { name: "Has a generated CV", value: jo.withCv || 0 },
          { name: "Uploaded a resume", value: jo.withResume || 0 },
          { name: "Added a guarantor", value: jo.withGuarantor || 0 },
          { name: "NIN verified", value: jo.ninVerified || 0 },
          { name: "Certified", value: jo.certified || 0 },
          { name: "Applied to a job", value: jo.hasApplied || 0 },
          { name: "Been hired", value: jo.hasBeenHired || 0 },
          { name: "Open to urgent work", value: jo.urgentAvailable || 0 },
        ];

        const employerTrust = [
          { name: "Business verified", value: eo.businessVerified || 0 },
          { name: "Address verified", value: eo.addressVerified || 0 },
          { name: "Identity approved", value: eo.identityApproved || 0 },
          { name: "Has listed a job", value: eo.withListedJobs || 0 },
        ];

        return (
          <>
            <StatStrip
              items={[
                { label: "Total users", value: fmt(o.total) },
                { label: "Verified", value: fmt(o.verified), hint: pct(o.verified, o.total) },
                { label: "Blocked", value: fmt(o.blocked), hint: pct(o.blocked, o.total) },
                { label: "Blacklisted", value: fmt(o.blacklisted) },
                { label: "Active in 30 days", value: fmt(o.active30d), hint: pct(o.active30d, o.total) },
                { label: "Joined by referral", value: fmt(o.referredUsers), hint: pct(o.referredUsers, o.total) },
              ]}
            />

            <Section title="Growth">
              <Panel title="New accounts over time" note="Stacked by role" wide>
                <Trend data={d.signups} colors={ROLE_COLORS} />
              </Panel>
              <Panel title="How accounts were created">
                <Donut data={d.byRegistration} />
              </Panel>
            </Section>

            <Section title="Accounts and activity">
              <Panel title="Users by role">
                <Donut data={d.byRole} colors={ROLE_COLORS} />
              </Panel>
              <Panel title="Trust status by role" wide>
                <DataTable
                  columns={[
                    { key: "role", label: "Role" },
                    { key: "total", label: "Total", num: true, render: (r) => fmt(r.total) },
                    { key: "verified", label: "Verified", num: true, render: (r) => `${fmt(r.verified)} (${pct(r.verified, r.total)})` },
                    { key: "blocked", label: "Blocked", num: true, render: (r) => `${fmt(r.blocked)} (${pct(r.blocked, r.total)})` },
                    { key: "blacklisted", label: "Blacklisted", num: true, render: (r) => fmt(r.blacklisted) },
                  ]}
                  rows={d.roleStatus}
                />
              </Panel>
              <Panel title="Last login" note="Users who logged in within each window">
                <Columns data={activity} />
              </Panel>
              <Panel title="Top states" note="All roles">
                <RankBars data={d.byState} total={o.total} />
              </Panel>
              <Panel title="Money and rewards">
                <dl className="space-y-3 text-sm">
                  <Row label="Loyalty points issued" value={fmt(o.loyaltyPoints)} />
                  <Row label="Combined account balances" value={money(o.accountBalance)} />
                  <Row label="Referrals made" value={fmt(o.referralCount)} />
                  <Row label="Welcome bonus paid" value={fmt(o.welcomeBonusGiven)} />
                  <Row label="NIN verified" value={fmt(o.ninVerified)} />
                  <Row label="Identity approved" value={fmt(o.identityApproved)} />
                </dl>
              </Panel>
            </Section>

            <Section title="Job seekers">
              <Panel title="Profile progress" note={`Share of ${fmt(jo.total)} job seekers`}>
                <RankBars data={completeness} total={jo.total} limit={8} />
              </Panel>
              <Panel title="Gender"><Donut data={js.gender} /></Panel>
              <Panel title="Education level"><RankBars data={js.education} /></Panel>
              <Panel title="Marital status"><Donut data={js.marital} /></Panel>
              <Panel title="Preferred job mode"><Donut data={js.jobMode} /></Panel>
              <Panel title="Job goals"><RankBars data={js.jobDecision} /></Panel>
              <Panel title="Top states"><RankBars data={js.state} total={jo.total} /></Panel>
              <Panel title="Most wanted job types" wide><RankBars data={js.interestedJob} limit={15} /></Panel>
              <Panel title="Applications per job seeker">
                <p className="text-3xl font-semibold tabular-nums text-stone-900">{(jo.avgApplications || 0).toFixed(1)}</p>
                <p className="mt-1 text-sm text-stone-600">on average across all job seekers</p>
              </Panel>
            </Section>

            <Section title="Employers">
              <Panel title="Trust checks" note={`Share of ${fmt(eo.total)} employers`}>
                <RankBars data={employerTrust} total={eo.total} />
              </Panel>
              <Panel title="Company size"><Donut data={em.size} /></Panel>
              <Panel title="Employer type"><Donut data={em.type} /></Panel>
              <Panel title="Top states"><RankBars data={em.state} total={eo.total} /></Panel>
              <Panel title="Most followed employers" wide>
                <DataTable
                  columns={[
                    { key: "name", label: "Company", render: personCell },
                    { key: "count", label: "Followers", num: true, render: (r) => fmt(r.count) },
                  ]}
                  rows={d.topFollowedEmployers}
                />
              </Panel>
            </Section>

            <Section title="Acquisition">
              <Panel title="Accounts created by staff" note="Admins and agents who registered others">
                <DataTable
                  columns={[
                    { key: "name", label: "Name", render: personCell },
                    { key: "role", label: "Role" },
                    { key: "count", label: "Accounts", num: true, render: (r) => fmt(r.count) },
                  ]}
                  rows={d.topCreators}
                />
              </Panel>
              <Panel title="Accounts created by marketers">
                <DataTable
                  columns={[
                    { key: "name", label: "Name", render: personCell },
                    { key: "count", label: "Accounts", num: true, render: (r) => fmt(r.count) },
                  ]}
                  rows={d.topMarketers}
                />
              </Panel>
              <Panel title="Top referrers">
                <DataTable
                  columns={[
                    { key: "name", label: "Name", render: personCell },
                    { key: "role", label: "Role" },
                    { key: "count", label: "Referrals", num: true, render: (r) => fmt(r.count) },
                  ]}
                  rows={d.topReferrers}
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