// src/pages/employer/MyRecruitmentsPage.jsx   route: /employer/recruitment/requests
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, MapPin } from "lucide-react";
import recruitmentApi from "./recruitmentApi";
import { PageHeader, Spinner, Notice, Empty, Badge, btnPrimary, apiError, fmtDate, money } from "./ui";

export default function MyRecruitmentsPage() {
  const [rows, setRows] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    recruitmentApi.myRequests().then((r) => setRows(r.requests)).catch((e) => setError(apiError(e)));
  }, []);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <PageHeader
        title="My recruitment requests"
        subtitle="Track each role we are recruiting for, review verified candidates and manage payments."
        actions={<Link to="/employer/recruitment" className={btnPrimary}><Plus className="h-4 w-4" /> New request</Link>}
      />
      {error && <Notice tone="error">{error}</Notice>}
      {!rows && !error && <Spinner />}
      {rows?.length === 0 && (
        <Empty
          title="No recruitment requests yet"
          text="Choose a package and tell us about the role. We will find, interview and verify candidates for you."
          action={<Link to="/employer/recruitment" className={btnPrimary}>See packages</Link>}
        />
      )}
      <ul className="space-y-3">
        {rows?.map((r) => (
          <li key={r._id}>
            <Link to={`/employer/recruitment/requests/${r._id}`} className="block rounded-xl border border-gray-200 bg-white p-5 transition hover:border-orange-300 hover:shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-base font-semibold text-gray-900">{r.jobTitle}</p>
                  <p className="mt-0.5 text-sm text-gray-500">
                    {r.reference} · {r.planName}
                    {r.location && <span className="ml-2 inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" aria-hidden />{r.location}</span>}
                  </p>
                </div>
                <Badge status={r.status} />
              </div>
              <dl className="mt-4 grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
                <div><dt className="text-gray-500">Candidates to review</dt><dd className="font-medium text-gray-900">{r.counts.submitted}</dd></div>
                <div><dt className="text-gray-500">Hired</dt><dd className="font-medium text-gray-900">{r.counts.hired} of {r.counts.target}</dd></div>
                <div><dt className="text-gray-500">Total fee</dt><dd className="font-medium text-gray-900">{money(r.fees?.total, r.fees?.currency)}</dd></div>
                <div><dt className="text-gray-500">{r.status === "AwaitingPayment" ? "Ordered" : "Target date"}</dt><dd className="font-medium text-gray-900">{fmtDate(r.status === "AwaitingPayment" ? r.createdAt : r.dueDate)}</dd></div>
              </dl>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}