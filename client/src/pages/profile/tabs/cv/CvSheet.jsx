import { forwardRef } from "react";
import { Mail, MapPin, MessageCircle, Phone } from "lucide-react";

export const PAGE_W = 794;
export const PAGE_H = 1123;

const Heading = ({ children, accent, classic }) =>
  classic ? (
    <h2 className="mb-2.5 border-b-2 pb-1 text-[12.5px] font-bold uppercase tracking-[0.16em]" style={{ color: accent, borderColor: accent }}>
      {children}
    </h2>
  ) : (
    <h2 className="mb-3 flex items-center gap-2.5 text-[12.5px] font-extrabold uppercase tracking-[0.16em] text-slate-900">
      <span className="h-[3px] w-6 rounded" style={{ background: accent }} />
      {children}
    </h2>
  );

const Row = ({ left, right, children }) => (
  <div className="cv-avoid mb-4">
    <div className="flex items-baseline justify-between gap-3">
      <h3 className="text-[14px] font-bold text-slate-900">{left}</h3>
      <span className="shrink-0 text-[12px] font-medium text-slate-500">{right}</span>
    </div>
    {children}
  </div>
);

function Experience({ m, classic }) {
  if (!m.work.length) return null;
  return (
    <section className="mb-6">
      <Heading accent={m.accent} classic={classic}>Work experience</Heading>
      {m.work.map((w, i) => (
        <Row key={i} left={w.title} right={w.period}>
          <p className="text-[13px] font-semibold" style={{ color: m.accent }}>
            {w.company}
            {w.meta && <span className="font-normal text-slate-500"> · {w.meta}</span>}
          </p>
          {w.bullets.length > 0 && (
            <ul className="mt-1.5 list-disc space-y-0.5 pl-5">{w.bullets.map((b, j) => <li key={j}>{b}</li>)}</ul>
          )}
        </Row>
      ))}
    </section>
  );
}

function Education({ m, classic }) {
  if (!m.education.length) return null;
  return (
    <section className="mb-6">
      <Heading accent={m.accent} classic={classic}>Education</Heading>
      {m.education.map((e, i) => (
        <Row key={i} left={e.qualification} right={e.period}>
          <p className="text-[13px] text-slate-600">{[e.institution, e.grade].filter(Boolean).join(" · ")}</p>
        </Row>
      ))}
    </section>
  );
}

function Certificates({ m, classic }) {
  if (!m.certificates.length) return null;
  return (
    <section className="mb-6">
      <Heading accent={m.accent} classic={classic}>Certificates</Heading>
      {m.certificates.map((c, i) => (
        <Row key={i} left={c.name} right={[c.date, c.expires].filter(Boolean).join(" · ")}>
          <p className="text-[13px] text-slate-600">{c.issuer}</p>
        </Row>
      ))}
    </section>
  );
}

const SideBlock = ({ title, children }) => (
  <section className="mt-7">
    <h2 className="mb-2.5 border-b border-white/30 pb-1 text-[12px] font-bold uppercase tracking-[0.16em]">{title}</h2>
    {children}
  </section>
);

const CvSheet = forwardRef(function CvSheet({ m }, ref) {
  const classic = m.template === "classic";
  const root = { width: PAGE_W, minHeight: PAGE_H, fontFamily: "Inter, 'Helvetica Neue', Arial, sans-serif" };
  const contact = [
    [Mail, m.contact.email],
    [Phone, m.contact.phone],
    [MessageCircle, m.contact.whatsapp && `${m.contact.whatsapp} (WhatsApp)`],
    [MapPin, m.contact.address],
  ].filter(([, v]) => v);

  if (classic) {
    return (
      <div ref={ref} style={root} className="bg-white px-12 py-11 text-[13px] leading-[1.55] text-slate-700">
        <header className="border-b-4 pb-5 text-center" style={{ borderColor: m.accent }}>
          {m.photo && <img src={m.photo} alt="" crossOrigin="anonymous" className="mx-auto mb-3 h-24 w-24 rounded-full object-cover" />}
          <h1 className="text-[32px] font-extrabold uppercase tracking-wide text-slate-900">{m.name}</h1>
          {m.headline && <p className="mt-1 text-[15px] font-semibold" style={{ color: m.accent }}>{m.headline}</p>}
          <p className="mt-3 flex flex-wrap justify-center gap-x-4 gap-y-1 text-[12px] text-slate-600">
            {contact.map(([Icon, v]) => (
              <span key={v} className="inline-flex items-center gap-1.5"><Icon className="h-3.5 w-3.5" /> {v}</span>
            ))}
          </p>
          {m.personal.length > 0 && (
            <p className="mt-1.5 text-[12px] text-slate-500">{m.personal.map(([k, v]) => `${k}: ${v}`).join("  ·  ")}</p>
          )}
        </header>

        <div className="mt-6">
          {m.summary && (
            <section className="cv-avoid mb-6">
              <Heading accent={m.accent} classic>Professional summary</Heading>
              <p>{m.summary}</p>
            </section>
          )}
          <Experience m={m} classic />
          <Education m={m} classic />
          <Certificates m={m} classic />
          {m.skills.length > 0 && (
            <section className="cv-avoid mb-6">
              <Heading accent={m.accent} classic>Skills</Heading>
              <div className="flex flex-wrap gap-1.5">
                {m.skills.map((s) => (
                  <span key={s} className="rounded border px-2.5 py-0.5 text-[12px] font-medium" style={{ borderColor: m.accent, color: m.accent }}>{s}</span>
                ))}
              </div>
            </section>
          )}
          {(m.languages.length > 0 || m.interests.length > 0) && (
            <section className="cv-avoid grid grid-cols-2 gap-6">
              {m.languages.length > 0 && (
                <div><Heading accent={m.accent} classic>Languages</Heading><p>{m.languages.join("  •  ")}</p></div>
              )}
              {m.interests.length > 0 && (
                <div><Heading accent={m.accent} classic>Interests</Heading><p>{m.interests.join("  •  ")}</p></div>
              )}
            </section>
          )}
          <p className="mt-8 text-center text-[11.5px] italic text-slate-400">References available on request.</p>
        </div>
      </div>
    );
  }

  return (
    <div ref={ref} style={root} className="flex bg-white text-[13px] leading-[1.55] text-slate-700">
      <aside className="shrink-0 px-6 py-10 text-[12.5px] text-white" style={{ background: m.accent, width: 250 }}>
        {m.photo && (
          <img src={m.photo} alt="" crossOrigin="anonymous" className="mx-auto h-32 w-32 rounded-full border-4 border-white/40 object-cover" />
        )}
        <SideBlock title="Contact">
          <ul className="space-y-2">
            {contact.map(([Icon, v]) => (
              <li key={v} className="flex items-start gap-2 break-words"><Icon className="mt-0.5 h-3.5 w-3.5 shrink-0" /> <span className="min-w-0">{v}</span></li>
            ))}
          </ul>
        </SideBlock>
        {m.personal.length > 0 && (
          <SideBlock title="Personal">
            <dl className="space-y-1.5">
              {m.personal.map(([k, v]) => (
                <div key={k}><dt className="text-[11px] uppercase tracking-wide text-white/70">{k}</dt><dd className="font-medium">{v}</dd></div>
              ))}
            </dl>
          </SideBlock>
        )}
        {m.skills.length > 0 && (
          <SideBlock title="Skills">
            <ul className="space-y-1.5">
              {m.skills.map((s) => <li key={s} className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-white/80" /> {s}</li>)}
            </ul>
          </SideBlock>
        )}
        {m.languages.length > 0 && (
          <SideBlock title="Languages"><ul className="space-y-1">{m.languages.map((l) => <li key={l}>{l}</li>)}</ul></SideBlock>
        )}
        {m.interests.length > 0 && (
          <SideBlock title="Interests"><ul className="space-y-1">{m.interests.map((l) => <li key={l}>{l}</li>)}</ul></SideBlock>
        )}
      </aside>

      <main className="min-w-0 flex-1 px-9 py-10">
        <h1 className="text-[32px] font-extrabold leading-tight text-slate-900">{m.name}</h1>
        {m.headline && <p className="mt-1 text-[15px] font-semibold" style={{ color: m.accent }}>{m.headline}</p>}
        {m.summary && (
          <section className="cv-avoid mt-6">
            <Heading accent={m.accent}>Profile</Heading>
            <p>{m.summary}</p>
          </section>
        )}
        <div className="mt-6">
          <Experience m={m} />
          <Education m={m} />
          <Certificates m={m} />
          <p className="mt-6 text-[11.5px] italic text-slate-400">References available on request.</p>
        </div>
      </main>
    </div>
  );
});

export default CvSheet;