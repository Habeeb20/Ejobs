import { useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, Download, ExternalLink, FileText, Loader2, Printer, X } from "lucide-react";
import { toast } from "sonner";
import CvSheet from "./CvSheet";
import { PDF_OPTS, ScaledPreview, pick } from "./CvTab";
import { buildCvModel, printElement, saveBlob, wordBlob } from "./cvModel";

const btn =
  "inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 ring-1 ring-slate-200 transition hover:bg-orange-50 hover:text-orange-700 disabled:cursor-not-allowed disabled:opacity-60";

export default function CvViewer({ data }) {
  const m = useMemo(() => buildCvModel(data, pick(data.cv)), [data]);
  const sheetRef = useRef(null);
  const [busy, setBusy] = useState("");
  const base = `${m.name} CV`.replace(/[^\w\- ]+/g, "").trim().replace(/\s+/g, "-");

  const run = async (name, fn) => {
    setBusy(name);
    try { await fn(); }
    catch { toast.error("Something went wrong. Please try again."); }
    finally { setBusy(""); }
  };

  const downloadPdf = () => run("pdf", async () => {
    const mod = await import("html2pdf.js");
    await (mod.default || mod)().set({ ...PDF_OPTS, filename: `${base}.pdf` }).from(sheetRef.current).save();
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" className={btn} disabled={!!busy} onClick={() => run("print", () => printElement(sheetRef.current))}>
          <Printer className="h-4 w-4" /> Print
        </button>
        <button type="button" className={btn} disabled={!!busy} onClick={downloadPdf}>
          {busy === "pdf" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} PDF
        </button>
        <button type="button" className={btn} disabled={!!busy} onClick={() => run("word", async () => saveBlob(wordBlob(m), `${base}.doc`))}>
          <FileText className="h-4 w-4" /> Word
        </button>
        {data.cv.pdfUrl && (
          <a href={data.cv.pdfUrl} target="_blank" rel="noreferrer" className={btn}>
            <ExternalLink className="h-4 w-4" /> Open their saved PDF
          </a>
        )}
      </div>

      <ScaledPreview>
        <CvSheet m={m} />
      </ScaledPreview>

      {/* Off-screen full-size copy used for PDF export and printing */}
      <div aria-hidden="true" style={{ position: "fixed", left: -10000, top: 0 }}>
        <CvSheet ref={sheetRef} m={m} />
      </div>
    </div>
  );
}

export function CvModal({ name, entry, onClose }) {
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && closeRef.current();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, []);

  return (
    <div role="dialog" aria-modal="true" aria-label={`${name}'s CV`}
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 p-3 sm:p-6">
      <div className="mx-auto w-full max-w-5xl rounded-2xl bg-white p-4 shadow-2xl sm:p-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h3 className="text-lg font-bold text-slate-900">{name}'s CV</h3>
          <button type="button" onClick={onClose} aria-label="Close"
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
            <X className="h-5 w-5" />
          </button>
        </div>

        {!entry || entry.loading ? (
          <p className="flex items-center justify-center gap-2 py-16 text-sm text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading CV…
          </p>
        ) : entry.error ? (
          <div role="alert" className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {entry.error}
          </div>
        ) : (
          <CvViewer data={entry.data} />
        )}
      </div>
    </div>
  );
}