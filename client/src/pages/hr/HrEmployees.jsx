import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Plus, Search, UserPlus, Users, Briefcase } from "lucide-react";
import { hrApi } from "./hrApi";
import { Btn, Avatar, Badge, StatusBadge, Modal, Empty, Spinner, inputCls, useAsync, useHrEvents, fmtDate, fullName, toastErr,  
} from "./hrUi";
import EmployeeForm from "./EmployeeForm";
import EmployeeProfile from "./EmployeeProfile";

const STATUS_TABS = [["current", "Current"], ["former", "Former"], ["all", "Everyone"]];

function HrEmployees({ user }) {
  const [sp, setSp] = useSearchParams();
  const openId = sp.get("id");
  const [f, setF] = useState({ q: "", department: "", status: "current", type: "" });
  const [q, setQ] = useState("");
  const [modal, setModal] = useState(null); // "add" | "hire" | { hire: candidate }
  const settings = useAsync(() => hrApi.settings(), [], { soft: true });
  const depts = settings.data?.settings?.departments || [];

  useEffect(() => { const t = setTimeout(() => setQ(f.q), 350); return () => clearTimeout(t); }, [f.q]);
  const listQ = useAsync(() => hrApi.employees({ q, department: f.department, status: f.status, type: f.type, limit: 100 }), [q, f.department, f.status, f.type]);
  const list = listQ.data?.employees ?? null;
  const counts = listQ.data?.counts || {};
  const load = listQ.reload;
  useHrEvents(["employment"], load);

  if (openId) return <EmployeeProfile id={openId} settings={settings.data?.settings} user={user} onBack={() => { setSp({ tab: "hrEmployees" }); }} />;

  const current = (counts.Active || 0) + (counts.OnLeave || 0) + (counts.Suspended || 0);
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white p-4 shadow-sm sm:p-5">
        <div><h2 className="text-lg font-bold">Your staff</h2><p className="text-sm text-slate-500">{current} current · {(counts.Terminated || 0) + (counts.Resigned || 0)} former</p></div>
        <div className="flex flex-wrap gap-2">
          <Btn variant="outline" onClick={() => setModal("hire")}><UserPlus size={16} /> Hire from applications</Btn>
          <Btn onClick={() => setModal("add")}><Plus size={16} /> Add employee</Btn>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto_auto]">
        <div className="relative"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input className={`${inputCls} pl-9`} placeholder="Search by name, email, staff ID or job title" value={f.q} onChange={(e) => setF({ ...f, q: e.target.value })} /></div>
        <select aria-label="Department" className={inputCls} value={f.department} onChange={(e) => setF({ ...f, department: e.target.value })}><option value="">All departments</option>{depts.map((d) => <option key={d}>{d}</option>)}</select>
        <select aria-label="Type" className={inputCls} value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })}><option value="">All types</option>{["Full-time", "Part-time", "Contract", "Intern", "Casual"].map((t) => <option key={t}>{t}</option>)}</select>
        <select aria-label="Status" className={inputCls} value={f.status} onChange={(e) => setF({ ...f, status: e.target.value })}>{STATUS_TABS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
      </div>

      {!list ? <Spinner label="Loading staff…" /> : !list.length ? (
        <Empty icon={Users} title={q || f.department ? "No one matches that" : "No staff yet"} text="Add someone by hand, or turn a candidate you made an offer to into staff. They get an email and a staff dashboard right away.">
          <div className="flex flex-wrap justify-center gap-2"><Btn onClick={() => setModal("add")}><Plus size={16} /> Add employee</Btn><Btn variant="outline" onClick={() => setModal("hire")}>Hire from applications</Btn></div>
        </Empty>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {list.map((e) => (
            <button key={e._id} onClick={() => setSp({ tab: "hrEmployees", id: e._id })} className="rounded-2xl bg-white p-4 text-left shadow-sm transition hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-orange-600">
              <div className="flex items-start gap-3">
                <Avatar name={fullName(e)} src={e.photo} size={48} />
                <div className="min-w-0 flex-1"><p className="truncate font-bold">{fullName(e)}</p><p className="truncate text-sm text-slate-500">{e.jobTitle}</p><p className="text-xs text-slate-400">{e.staffId}{e.department ? ` · ${e.department}` : ""}</p></div>
                <StatusBadge status={e.status} />
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                <Badge>{e.employmentType}</Badge>{e.source === "application" && <Badge tone="blue">Hired via EJob</Badge>}{!e.hasAccount && <Badge tone="amber">No account yet</Badge>}
                <span className="ml-auto">Since {fmtDate(e.hireDate)}</span>
              </div>
            </button>
          ))}
        </div>
      )}

      <Modal open={modal === "add"} onClose={() => setModal(null)} title="Add an employee" wide>
        <EmployeeForm mode="create" settings={settings.data?.settings} onCancel={() => setModal(null)} onSaved={(e) => { setModal(null); load(); setSp({ tab: "hrEmployees", id: e._id }); }} />
      </Modal>
      <HireModal open={modal === "hire" || !!modal?.hire} candidate={modal?.hire} settings={settings.data?.settings}
        onPick={(c) => setModal({ hire: c })} onBack={() => setModal("hire")} onClose={() => setModal(null)} onDone={(e) => { setModal(null); load(); setSp({ tab: "hrEmployees", id: e._id }); }} />
    </div>
  );
}

// Step 1: pick a candidate who has an offer. Step 2: confirm job and pay details.
function HireModal({ open, candidate, settings, onPick, onBack, onClose, onDone }) {
  const { data, loading, error } = useAsync(() => (open ? hrApi.hireCandidates() : Promise.resolve({ data: { candidates: [] } })), [open], { soft: true });
  if (!open) return null;
  if (candidate) return (
    <Modal open onClose={onClose} title={`Add ${candidate.name} to staff`} wide>
      <p className="mb-4 rounded-xl bg-orange-50 p-3 text-sm text-orange-800">Their profile (name, contact, bank and next of kin) is filled in from their EJob account. Just confirm the job and pay.</p>
      <EmployeeForm mode="hire" applicationId={candidate.applicationId} defaults={{ jobTitle: candidate.position || "" }} settings={settings} onCancel={onBack} onSaved={onDone} />
    </Modal>
  );
  return (
    <Modal open onClose={onClose} title="Hire from applications">
      {loading ? <Spinner /> : error ? <p className="text-red-600">{error}</p> : !data?.candidates?.length ? (
        <Empty icon={Briefcase} title="Nobody is waiting" text="Candidates show up here once you move their application to Offer or Accepted." />
      ) : (
        <ul className="divide-y divide-slate-100">
          {data.candidates.map((c) => (
            <li key={c.applicationId} className="flex items-center gap-3 py-3">
              <Avatar name={c.name} src={c.avatar} /><div className="min-w-0 flex-1"><p className="truncate font-semibold">{c.name}</p><p className="truncate text-sm text-slate-500">{c.position}</p></div>
              <Badge tone="green">{c.status}</Badge><Btn variant="soft" onClick={() => onPick(c)}>Add to staff</Btn>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}

export default HrEmployees;