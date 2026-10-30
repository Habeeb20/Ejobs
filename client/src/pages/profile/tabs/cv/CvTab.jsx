import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, Download, ExternalLink, FileText, Loader2, Printer, Save, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { cvApi, getError } from "../../../../api";
import { uploadToCloudinary } from "../../../../utils/cloudinary";
import { TextAreaField, ToggleField } from "../../components/fields";
import TagInput from "../../components/TagInput";
import CvSheet, { PAGE_H, PAGE_W } from "./CvSheet";
import { buildCvModel, downloadUrl, draftSummary, printElement, saveBlob, wordBlob } from "./cvModel";
import { fmtMonth } from "../../cvFormat";

const SWATCHES = ["#c2410c", "#1e293b", "#047857", "#1d4ed8", "#6d28d9", "#be123c"];
const DEFAULTS = {
  summary: "", skills: [], languages: [], interests: [], template: "modern", accent: "#c2410c",
  showPhoto: true, showAddress: true, showPersonal: true, hidden: [],
};
const KEYS = Object.keys(DEFAULTS);
export const pick = (cv) => Object.fromEntries(KEYS.map((k) => [k, cv?.[k] ?? DEFAULTS[k]]));

export const PDF_OPTS = {
  margin: 0,
  image: { type: "jpeg", quality: 0.96 },
  html2canvas: { scale: 2, useCORS: true, backgroundColor: "#ffffff" },
  jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
  pagebreak: { mode: ["css", "legacy"], avoid: [".cv-avoid"] },
};

// Shrinks the A4 sheet to fit its container
export function ScaledPreview({ children }) {
  const wrap = useRef(null);
  const inner = useRef(null);
  const [scale, setScale] = useState(1);
  const [height, setHeight] = useState(PAGE_H);

  useLayoutEffect(() => {
    const update = () => {
      const w = wrap.current?.clientWidth;
      if (!w) return;
      setScale(Math.min(1, w / PAGE_W));
      setHeight(inner.current.offsetHeight);
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(wrap.current);
    ro.observe(inner.current);
    return () => ro.disconnect();
  }, []);

  return (
    <div ref={wrap} className="w-full">
      <div className="overflow-hidden rounded-xl shadow-xl ring-1 ring-slate-200" style={{ height: height * scale }}>
        <div ref={inner} style={{ width: PAGE_W, transform: `scale(${scale})`, transformOrigin: "top left" }}>
          {children}
        </div>
      </div>
      <p className="mt-2 text-center text-xs text-slate-500">Preview · about {Math.max(1, Math.ceil(height / PAGE_H))} page(s)</p>
    </div>
  );
}

const Card = ({ title, children }) => (
  <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
    <h4 className="mb-3 text-sm font-bold text-slate-900">{title}</h4>
    <div className="space-y-4">{children}</div>
  </section>
);

const Action = ({ icon: Icon, children, primary, ...props }) => (
  <button type="button" {...props}
    className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${
      primary ? "bg-orange-600 text-white shadow-lg shadow-orange-600/25 hover:bg-orange-700" : "bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-orange-50 hover:text-orange-700"
    }`}>
    <Icon className="h-4 w-4" /> {children}
  </button>
);

export default function CvTab({ onGoTo }) {
  const [data, setData] = useState(null);
  const [settings, setSettings] = useState(null);
  const [saved, setSaved] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(""); // "" | save | pdf | word | print | attach
  const [step, setStep] = useState("");
  const [view, setView] = useState("edit"); // mobile: edit | preview
  const sheetRef = useRef(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { data: res } = await cvApi.get();
      setData(res);
      const s = pick(res.cv);
      setSettings(s);
      setSaved(s);
    } catch (err) {
      setError(getError(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const m = useMemo(() => (data && settings ? buildCvModel(data, settings) : null), [data, settings]);

  if (loading) return <div className="flex items-center gap-2 py-10 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" /> Building your CV…</div>;
  if (error) {
    return (
      <div role="alert" className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {error}
      </div>
    );
  }

  const set = (k) => (v) => setSettings((s) => ({ ...s, [k]: v }));
  const dirty = JSON.stringify(settings) !== JSON.stringify(saved);
  const hiddenHas = (k) => settings.hidden.includes(k);
  const toggleHidden = (k) => (on) =>
    set("hidden")(on ? settings.hidden.filter((x) => x !== k) : [...settings.hidden, k]);
  const base = `${m.name} CV`.replace(/[^\w\- ]+/g, "").trim().replace(/\s+/g, "-");
  const cv = data.cv;

  const missing = [
    !data.profile.phoneNumber && ["Phone number", "personal"],
    !data.work.length && ["Work experience", "work"],
    !data.education.length && ["Education", "education"],
  ].filter(Boolean);

  const run = async (name, fn) => {
    setBusy(name);
    try { await fn(); }
    catch (err) { toast.error(err?.response ? getError(err) : err.message || "Something went wrong"); }
    finally { setBusy(""); setStep(""); }
  };

  const saveSettings = async () => {
    const { data: res } = await cvApi.save(settings);
    setSaved(pick(res.cv));
  };

  const pdfBlob = async () => {
    const mod = await import("html2pdf.js");
    return (mod.default || mod)().set(PDF_OPTS).from(sheetRef.current).outputPdf("blob");
  };

  const downloadPdf = () => run("pdf", async () => {
    const mod = await import("html2pdf.js");
    await (mod.default || mod)().set({ ...PDF_OPTS, filename: `${base}.pdf` }).from(sheetRef.current).save();
  });
  const downloadWord = () => run("word", async () => saveBlob(wordBlob(m), `${base}.doc`));
  const doPrint = () => run("print", () => printElement(sheetRef.current));

  // Generates both files, uploads them to Cloudinary, then sends the two strings to the backend
  const attach = () => run("attach", async () => {
    if (dirty) { setStep("Saving your CV details…"); await saveSettings(); }
    setStep("Creating the PDF…");
    const pdf = await pdfBlob();
    setStep("Uploading…");
    const pdfUrl = await uploadToCloudinary(new File([pdf], `${base}.pdf`, { type: "application/pdf" }));
    const wordUrl = await uploadToCloudinary(new File([wordBlob(m)], `${base}.doc`, { type: "application/msword" }));
    setStep("Saving to your profile…");
    const { data: res } = await cvApi.attach({ pdfUrl, wordUrl });
    setData((d) => ({ ...d, cv: { ...d.cv, ...res.cv } }));
    toast.success(res.resumeAdded ? "CV saved and added to your résumés" : "CV saved to your profile");
    if (!res.resumeAdded) toast("You already have 3 résumés, so the PDF wasn't added to that list. Remove one in Career if you want to use it when applying.");
  });

  const removeFile = (format) => run("remove", async () => {
    const { data: res } = await cvApi.detach(format);
    setData((d) => ({ ...d, cv: { ...d.cv, ...res.cv } }));
    toast.success("File removed");
  });

  return (
    <div>
      <div className="mb-4 flex rounded-xl bg-slate-100 p-1 lg:hidden">
        {["edit", "preview"].map((v) => (
          <button key={v} type="button" onClick={() => setView(v)}
            className={`flex-1 rounded-lg py-2 text-sm font-semibold capitalize ${view === v ? "bg-white text-orange-700 shadow" : "text-slate-500"}`}>
            {v}
          </button>
        ))}
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[23rem_minmax(0,1fr)]">
        {/* ---------- editor ---------- */}
        <div className={`${view === "edit" ? "block" : "hidden"} space-y-4 lg:block`}>
          {missing.length > 0 && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              <p className="font-semibold">Your CV is missing:</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {missing.map(([label, tab]) => (
                  <button key={tab} type="button" onClick={() => onGoTo?.(tab)}
                    className="rounded-lg bg-white px-2.5 py-1 text-xs font-semibold text-orange-700 ring-1 ring-amber-200 hover:bg-orange-50">
                    Add {label.toLowerCase()}
                  </button>
                ))}
              </div>
            </div>
          )}

          <Card title="Professional summary">
            <TextAreaField value={settings.summary} onChange={(e) => set("summary")(e.target.value)} maxLength={1200}
              placeholder="Two or three sentences about you and what you offer" />
            <button type="button" onClick={() => set("summary")(draftSummary(data, settings))}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-orange-700 hover:underline">
              <Sparkles className="h-4 w-4" /> Draft one from my profile
            </button>
          </Card>

          <Card title="Skills, languages and interests">
            <TagInput label="Skills" value={settings.skills} onChange={set("skills")} max={25} placeholder="Type a skill, press Enter" />
            <TagInput label="Languages" value={settings.languages} onChange={set("languages")} max={10} placeholder="e.g. English" />
            <TagInput label="Interests" value={settings.interests} onChange={set("interests")} max={10} placeholder="e.g. Football" />
          </Card>

          <Card title="Design">
            <div className="grid grid-cols-2 gap-2">
              {[["modern", "Modern"], ["classic", "Classic"]].map(([k, label]) => (
                <button key={k} type="button" onClick={() => set("template")(k)} aria-pressed={settings.template === k}
                  className={`rounded-xl border-2 px-3 py-2.5 text-sm font-semibold ${settings.template === k ? "border-orange-600 bg-orange-50 text-orange-700" : "border-slate-200 text-slate-600 hover:border-orange-300"}`}>
                  {label}
                </button>
              ))}
            </div>
            <div>
              <p className="mb-2 text-sm font-medium text-slate-700">Accent colour</p>
              <div className="flex gap-2">
                {SWATCHES.map((c) => (
                  <button key={c} type="button" onClick={() => set("accent")(c)} aria-label={`Use colour ${c}`} aria-pressed={settings.accent === c}
                    style={{ background: c }}
                    className={`h-8 w-8 rounded-full ring-offset-2 transition ${settings.accent === c ? "ring-2 ring-slate-900" : "hover:scale-110"}`} />
                ))}
              </div>
            </div>
            <ToggleField label="Show my photo" value={settings.showPhoto} onChange={set("showPhoto")} />
            <ToggleField label="Show my address" value={settings.showAddress} onChange={set("showAddress")} />
            <ToggleField label="Show date of birth, gender, marital status" value={settings.showPersonal} onChange={set("showPersonal")} />
            {[["skills", "Skills"], ["languages", "Languages"], ["interests", "Interests"], ["certificates", "Certificates"]].map(([k, label]) => (
              <ToggleField key={k} label={`Show ${label.toLowerCase()}`} value={!hiddenHas(k)} onChange={toggleHidden(k)} />
            ))}
          </Card>

          <Card title="Update your details">
            <p className="-mt-2 text-xs text-slate-500">Your CV is built from these sections of your profile.</p>
            <div className="flex flex-wrap gap-2">
              {[["personal", "Personal"], ["address", "Address"], ["career", "Career"], ["education", "Education"], ["work", "Work"], ["certificates", "Certificates"]].map(([k, label]) => (
                <button key={k} type="button" onClick={() => onGoTo?.(k)}
                  className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-orange-50 hover:text-orange-700">
                  {label}
                </button>
              ))}
            </div>
          </Card>

          <button type="button" onClick={() => run("save", saveSettings).then(() => toast.success("CV details saved"))}
            disabled={!dirty || !!busy}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50">
            {busy === "save" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save CV details
          </button>
        </div>

        {/* ---------- preview and actions ---------- */}
        <div className={`${view === "preview" ? "block" : "hidden"} space-y-4 lg:block`}>
          <div className="flex flex-wrap items-center gap-2">
            <Action icon={Printer} onClick={doPrint} disabled={!!busy}>Print</Action>
            <Action icon={busy === "pdf" ? Loader2 : Download} onClick={downloadPdf} disabled={!!busy}>PDF</Action>
            <Action icon={FileText} onClick={downloadWord} disabled={!!busy}>Word</Action>
            <Action icon={busy === "attach" ? Loader2 : Save} primary onClick={attach} disabled={!!busy}>
              Save to my profile
            </Action>
          </div>
          {step && <p className="flex items-center gap-2 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" /> {step}</p>}

          {(cv.pdfUrl || cv.wordUrl) && (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 text-sm">
              <p className="font-semibold text-emerald-900">
                Saved on your profile{cv.filesUpdatedAt ? ` · updated ${fmtMonth(String(cv.filesUpdatedAt).slice(0, 7))}` : ""}
              </p>
              <div className="mt-2 flex flex-wrap gap-3">
                {cv.pdfUrl && (
                  <span className="inline-flex items-center gap-2">
                    <a href={cv.pdfUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-semibold text-orange-700 hover:underline">View PDF <ExternalLink className="h-3.5 w-3.5" /></a>
                    <a href={downloadUrl(cv.pdfUrl)} className="font-semibold text-slate-600 hover:underline">Download</a>
                    <button type="button" onClick={() => removeFile("pdf")} aria-label="Remove saved PDF" className="text-slate-400 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
                  </span>
                )}
                {cv.wordUrl && (
                  <span className="inline-flex items-center gap-2">
                    <a href={downloadUrl(cv.wordUrl)} className="font-semibold text-orange-700 hover:underline">Download Word file</a>
                    <button type="button" onClick={() => removeFile("word")} aria-label="Remove saved Word file" className="text-slate-400 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
                  </span>
                )}
              </div>
            </div>
          )}

          <ScaledPreview>
            <CvSheet m={m} />
          </ScaledPreview>
        </div>
      </div>

      {/* Off-screen full-size copy used for PDF export and printing */}
      <div aria-hidden="true" style={{ position: "fixed", left: -10000, top: 0 }}>
        <CvSheet ref={sheetRef} m={m} />
      </div>
    </div>
  );
}






























