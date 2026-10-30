import { fmtMonth, fmtPeriod } from "../../cvFormat";

const cap = (s) => (s ? s[0].toUpperCase() + s.slice(1) : "");
const fmtDob = (v) => {
  const d = v ? new Date(`${String(v).slice(0, 10)}T00:00:00`) : null;
  return d && !Number.isNaN(d.getTime()) ? d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) : "";
};
const bullets = (text) =>
  String(text || "").split(/\r?\n/).map((l) => l.replace(/^[\s\-•*·]+/, "").trim()).filter(Boolean);

export function buildCvModel(data, s) {
  const p = data.profile;
  const hidden = new Set(s.hidden);
  return {
    template: s.template,
    accent: s.accent,
    name: [p.firstName, p.middleName, p.lastName].filter(Boolean).join(" ") || "Your Name",
    headline: p.job || p.jobChoice?.[0] || "",
    photo: s.showPhoto ? p.avatar : "",
    contact: {
      email: p.email,
      phone: p.phoneNumber,
      whatsapp: p.whatsappNumber,
      address: s.showAddress ? [p.address, p.localGovernment, p.state].filter(Boolean).join(", ") : "",
    },
    personal: s.showPersonal
      ? [["Date of birth", fmtDob(p.dateOfBirth)], ["Gender", cap(p.gender)], ["Marital status", cap(p.maritalStatus)]].filter(([, v]) => v)
      : [],
    summary: s.summary,
    skills: hidden.has("skills") ? [] : s.skills,
    languages: hidden.has("languages") ? [] : s.languages,
    interests: hidden.has("interests") ? [] : s.interests,
    work: data.work.map((w) => ({
      title: w.jobTitle,
      company: w.company,
      meta: [w.employmentType, w.location].filter(Boolean).join(" · "),
      period: fmtPeriod(w.startDate, w.endDate, w.isCurrent),
      bullets: bullets(w.description),
    })),
    education: data.education.map((e) => ({
      qualification: e.qualification + (e.fieldOfStudy ? `, ${e.fieldOfStudy}` : ""),
      institution: e.institution,
      period: fmtPeriod(e.startDate, e.endDate, e.isCurrent),
      grade: e.grade,
    })),
    certificates: hidden.has("certificates")
      ? []
      : data.certificates.map((c) => ({
          name: c.name,
          issuer: c.issuer,
          date: fmtMonth(c.issueDate),
          expires: c.expiryDate ? `Expires ${fmtMonth(c.expiryDate)}` : "",
        })),
  };
}

// A starting point the user can edit
export function draftSummary(data, s) {
  const role = data.profile.job || data.profile.jobChoice?.[0] || "professional";
  const starts = data.work.map((w) => w.startDate).filter(Boolean).sort();
  const years = starts.length ? Math.floor((Date.now() - new Date(`${starts[0]}-01`)) / 31557600000) : 0;
  const e = data.education[0];
  const parts = [
    years >= 1 && `with ${years}+ year${years > 1 ? "s" : ""} of experience`,
    e && `holding ${e.qualification}${e.fieldOfStudy ? ` in ${e.fieldOfStudy}` : ""}`,
    data.profile.state && `based in ${data.profile.state}`,
  ].filter(Boolean);
  const skills = s.skills.slice(0, 3);
  return (
    `Reliable and results-driven ${role}${parts.length ? ` ${parts.join(", ")}` : ""}. ` +
    `Committed to delivering quality work, learning quickly and growing with the team.` +
    (skills.length ? ` Skilled in ${skills.join(", ")}.` : "")
  );
}

/* ---------- Word (.doc): table-based HTML that Word opens natively ---------- */
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

export function buildWordHtml(m) {
  const a = m.accent;
  const h2 = (t) =>
    `<h2 style="margin:16pt 0 5pt;padding-bottom:2pt;border-bottom:1.5pt solid ${a};color:${a};font-size:11pt;letter-spacing:1pt;text-transform:uppercase">${t}</h2>`;
  const row = (left, right) =>
    `<table width="100%" cellspacing="0" cellpadding="0" style="margin-top:6pt"><tr><td style="font-size:11pt"><b>${left}</b></td><td align="right" style="font-size:9.5pt;color:#6b7280">${esc(right)}</td></tr></table>`;
  const line = (t, css = "") => `<p style="margin:0;font-size:10.5pt;${css}">${t}</p>`;
  const contact = [m.contact.email, m.contact.phone, m.contact.whatsapp && `WhatsApp ${m.contact.whatsapp}`, m.contact.address]
    .filter(Boolean).map(esc).join(" &nbsp;|&nbsp; ");

  const out = [`<h1 style="margin:0;font-size:24pt;color:#111827">${esc(m.name)}</h1>`];
  if (m.headline) out.push(`<p style="margin:2pt 0 0;font-size:12pt;color:${a}"><b>${esc(m.headline)}</b></p>`);
  if (contact) out.push(`<p style="margin:6pt 0 0;font-size:9.5pt;color:#4b5563">${contact}</p>`);
  if (m.personal.length)
    out.push(`<p style="margin:2pt 0 0;font-size:9.5pt;color:#4b5563">${m.personal.map(([k, v]) => `${esc(k)}: ${esc(v)}`).join(" &nbsp;|&nbsp; ")}</p>`);
  if (m.summary) out.push(h2("Professional summary"), line(esc(m.summary)));

  if (m.work.length) {
    out.push(h2("Work experience"));
    for (const w of m.work) {
      out.push(row(esc(w.title), w.period), line(`<b>${esc(w.company)}</b>${w.meta ? ` &nbsp;·&nbsp; ${esc(w.meta)}` : ""}`, `color:${a}`));
      if (w.bullets.length) out.push(`<ul style="margin:3pt 0 0">${w.bullets.map((b) => `<li style="font-size:10.5pt">${esc(b)}</li>`).join("")}</ul>`);
    }
  }
  if (m.education.length) {
    out.push(h2("Education"));
    for (const e of m.education) {
      out.push(row(esc(e.qualification), e.period), line(esc([e.institution, e.grade].filter(Boolean).join(" · ")), "color:#4b5563"));
    }
  }
  if (m.certificates.length) {
    out.push(h2("Certificates"));
    for (const c of m.certificates) out.push(row(esc(c.name), [c.date, c.expires].filter(Boolean).join(" · ")), line(esc(c.issuer), "color:#4b5563"));
  }
  if (m.skills.length) out.push(h2("Skills"), line(m.skills.map(esc).join(" &nbsp;•&nbsp; ")));
  if (m.languages.length) out.push(h2("Languages"), line(m.languages.map(esc).join(" &nbsp;•&nbsp; ")));
  if (m.interests.length) out.push(h2("Interests"), line(m.interests.map(esc).join(" &nbsp;•&nbsp; ")));
  out.push(h2("References"), line("Available on request.", "color:#4b5563"));

  return `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8"><title>${esc(m.name)}</title><!--[if gte mso 9]><xml><w:WordDocument><w:View>Print</w:View><w:Zoom>100</w:Zoom></w:WordDocument></xml><![endif]--><style>@page{size:21cm 29.7cm;margin:1.8cm}body{font-family:Calibri,Arial,sans-serif;color:#1f2937}</style></head><body>${out.join("")}</body></html>`;
}

export const wordBlob = (m) => new Blob(["\ufeff", buildWordHtml(m)], { type: "application/msword" });

/* ---------- file helpers ---------- */
export const saveBlob = (blob, name) => {
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement("a"), { href: url, download: name });
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
};

// Makes a Cloudinary link download instead of opening in the browser
export const downloadUrl = (url) => (url ? url.replace("/upload/", "/upload/fl_attachment/") : "");

// Prints the CV in an isolated iframe so the rest of the app never ends up on the page
export async function printElement(el) {
  const iframe = document.createElement("iframe");
  iframe.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0";
  document.body.appendChild(iframe);

  const styles = [...document.querySelectorAll('link[rel="stylesheet"], style')].map((n) => n.outerHTML).join("");
  const doc = iframe.contentDocument;
  doc.open();
  doc.write(
    `<!doctype html><html><head><meta charset="utf-8"><title>CV</title>${styles}` +
      `<style>@page{size:A4;margin:0}html,body{margin:0;background:#fff;-webkit-print-color-adjust:exact;print-color-adjust:exact}.cv-avoid{break-inside:avoid}</style>` +
      `</head><body>${el.outerHTML}</body></html>`
  );
  doc.close();

  await Promise.all([...doc.images].map((img) => (img.complete ? null : new Promise((r) => { img.onload = img.onerror = r; }))));
  await new Promise((r) => setTimeout(r, 300)); // let the copied stylesheets apply

  iframe.contentWindow.focus();
  iframe.contentWindow.print();
  setTimeout(() => iframe.remove(), 60000);
}