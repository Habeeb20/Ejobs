import { BadgeCheck, Loader2 } from "lucide-react";
import { fmtMonth, fmtPeriod } from "../profile/cvFormat";
import { formatDate, formatSalary } from "../home/jobKit/format";
import { downloadUrl } from "../profile/tabs/cv/cvModel";

const grid = "grid gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-3";
const link = "font-semibold text-orange-700 hover:underline";

export const nameOf = (p = {}) => [p.firstName, p.lastName].filter(Boolean).join(" ") || "Candidate";

const Info = ({ label, children }) =>
  children ? (
    <div className="min-w-0">
      <dt className="text-xs uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="break-words text-sm font-medium text-slate-800">{children}</dd>
    </div>
  ) : null;

const Block = ({ title, children }) => (
  <section>
    <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-orange-700">{title}</h4>
    {children}
  </section>
);

/**
 * entry: { loading } | { error } | { data: { profile, education, work, certificates, cv } }
 * app: the application, when this is opened from an applicant. Leave it out in talent search
 * and the "This application" block is skipped.
 */
export default function ApplicantProfile({ entry, app }) {
  if (!entry || entry.loading) {
    return (
      <p className="mt-4 flex items-center gap-2 py-3 text-sm text-slate-500">
        <Loader2 size={16} className="animate-spin" /> Loading profile…
      </p>
    );
  }
  if (entry.error) return <p role="alert" className="mt-4 text-sm text-red-600">{entry.error}</p>;

  const { profile: p, education = [], work = [], certificates = [], cv = {} } = entry.data;
  const fullName = [p.firstName, p.middleName, p.lastName].filter(Boolean).join(" ");
  const address = [p.address, p.localGovernment, p.state].filter(Boolean).join(", ");
  const badges = [[p.isCertified, "Certified"], [p.guarantorVerified, "Guarantor verified"], [p.isNINVerified, "NIN verified"]].filter(([on]) => on);
  const answers = (app?.additionalQuestionResponse || []).filter((q) => q?.question);

  return (
    <div className="mt-4 space-y-5 rounded-xl border border-orange-100 bg-orange-50/40 p-4">
      {badges.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {badges.map(([, label]) => (
            <span key={label} className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
              <BadgeCheck size={13} /> {label}
            </span>
          ))}
        </div>
      )}

      <Block title="Personal">
        <dl className={grid}>
          <Info label="Full name">{fullName}</Info>
          <Info label="Gender">{p.gender}</Info>
          <Info label="Date of birth">{p.dateOfBirth && formatDate(p.dateOfBirth)}</Info>
          <Info label="Marital status">{p.maritalStatus}</Info>
        </dl>
      </Block>

      <Block title="Contact">
        <dl className={grid}>
          <Info label="Email">{p.email && <a className={link} href={`mailto:${p.email}`}>{p.email}</a>}</Info>
          <Info label="Phone">{p.phoneNumber && <a className={link} href={`tel:${p.phoneNumber}`}>{p.phoneNumber}</a>}</Info>
          <Info label="WhatsApp">{p.whatsappNumber}</Info>
          <div className="sm:col-span-2 lg:col-span-3"><Info label="Address">{address}</Info></div>
        </dl>
      </Block>

      <Block title="Career">
        <dl className={grid}>
          <Info label="Education level">{p.educationLevel}</Info>
          <Info label="Current or recent job">{p.job}</Info>
          <Info label="Preferred job type">{p.jobMode}</Info>
          <Info label="Minimum salary">{p.minimumSalary && formatSalary("NGN", p.minimumSalary)}</Info>
          <Info label="Available for urgent work">{p.availabilityForUrgentWork ? "Yes" : "No"}</Info>
          <Info label="Job choices">
            {p.jobChoice?.length > 0 && (
              <span className="flex flex-wrap gap-1.5">
                {p.jobChoice.map((c) => <span key={c} className="rounded-full bg-white px-2.5 py-0.5 text-xs ring-1 ring-orange-100">{c}</span>)}
              </span>
            )}
          </Info>
        </dl>
      </Block>

      {app?._id && (
        <Block title="This application">
          <dl className={grid}>
            <Info label="Position">{app.position}</Info>
            <Info label="Can start">{app.availability}</Info>
            <Info label="Applied">{formatDate(app.createdAt)}</Info>
            <Info label="Résumé">{app.resume && <a className={link} href={app.resume} target="_blank" rel="noreferrer">Open résumé</a>}</Info>
            <Info label="Supporting document">{app.additionalDocument && <a className={link} href={app.additionalDocument} target="_blank" rel="noreferrer">Open document</a>}</Info>
          </dl>
          {app.coverLetter && (
            <div className="mt-3">
              <p className="text-xs uppercase tracking-wide text-slate-500">Cover letter</p>
              <p className="mt-1 whitespace-pre-line text-sm text-slate-700">{app.coverLetter}</p>
            </div>
          )}
          {answers.length > 0 && (
            <div className="mt-3 space-y-2">
              {answers.map((q, i) => (
                <div key={i}>
                  <p className="text-xs uppercase tracking-wide text-slate-500">{q.question}</p>
                  <p className="text-sm text-slate-700">{q.answer || "No answer"}</p>
                </div>
              ))}
            </div>
          )}
        </Block>
      )}

      {work.length > 0 && (
        <Block title="Work experience">
          <ul className="space-y-3">
            {work.map((w) => (
              <li key={w._id} className="rounded-lg bg-white p-3 ring-1 ring-orange-100">
                <p className="text-sm font-bold text-slate-900">{w.jobTitle} · {w.company}</p>
                <p className="text-xs text-slate-500">{[fmtPeriod(w.startDate, w.endDate, w.isCurrent), w.employmentType, w.location].filter(Boolean).join(" · ")}</p>
                {w.description && (
                  <ul className="mt-1.5 list-disc space-y-0.5 pl-5 text-sm text-slate-700">
                    {w.description.split(/\r?\n/).filter(Boolean).map((l, i) => <li key={i}>{l.replace(/^[\s\-•*·]+/, "")}</li>)}
                  </ul>
                )}
                {w.referenceLetter && <a className={`${link} mt-1 inline-block text-sm`} href={w.referenceLetter} target="_blank" rel="noreferrer">Reference letter</a>}
              </li>
            ))}
          </ul>
        </Block>
      )}

      {education.length > 0 && (
        <Block title="Education">
          <ul className="space-y-3">
            {education.map((e) => (
              <li key={e._id} className="rounded-lg bg-white p-3 ring-1 ring-orange-100">
                <p className="text-sm font-bold text-slate-900">{e.qualification}{e.fieldOfStudy ? `, ${e.fieldOfStudy}` : ""}</p>
                <p className="text-sm text-slate-600">{e.institution}</p>
                <p className="text-xs text-slate-500">{[fmtPeriod(e.startDate, e.endDate, e.isCurrent), e.grade].filter(Boolean).join(" · ")}</p>
                {e.certificateUrl && <a className={`${link} mt-1 inline-block text-sm`} href={e.certificateUrl} target="_blank" rel="noreferrer">View certificate</a>}
              </li>
            ))}
          </ul>
        </Block>
      )}

      {certificates.length > 0 && (
        <Block title="Certificates">
          <ul className="space-y-3">
            {certificates.map((c) => (
              <li key={c._id} className="rounded-lg bg-white p-3 ring-1 ring-orange-100">
                <p className="text-sm font-bold text-slate-900">{c.name}</p>
                <p className="text-sm text-slate-600">{c.issuer}</p>
                <p className="text-xs text-slate-500">{[c.issueDate && `Issued ${fmtMonth(c.issueDate)}`, c.expiryDate && `Expires ${fmtMonth(c.expiryDate)}`].filter(Boolean).join(" · ")}</p>
                <div className="mt-1 flex gap-4 text-sm">
                  {c.file && <a className={link} href={c.file} target="_blank" rel="noreferrer">View file</a>}
                  {c.credentialUrl && <a className={link} href={c.credentialUrl} target="_blank" rel="noreferrer">Verify online</a>}
                </div>
              </li>
            ))}
          </ul>
        </Block>
      )}

      {(cv.pdfUrl || cv.wordUrl) && (
        <Block title="Saved CV files">
          <div className="flex flex-wrap gap-4 text-sm">
            {cv.pdfUrl && <a className={link} href={cv.pdfUrl} target="_blank" rel="noreferrer">PDF</a>}
            {cv.wordUrl && <a className={link} href={downloadUrl(cv.wordUrl)}>Word</a>}
          </div>
        </Block>
      )}
    </div>
  );
}