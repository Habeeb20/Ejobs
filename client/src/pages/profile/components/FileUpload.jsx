import { useRef, useState } from "react";
import { Camera, ExternalLink, FileText, Loader2, Trash2, UploadCloud } from "lucide-react";
import { uploadToCloudinary } from "../../../utils/cloudinary";

const isImage = (url = "") => /\.(png|jpe?g|webp|gif|avif)$/i.test(url.split("?")[0]);

// Uploads to Cloudinary, then hands the URL string (or an array of them) to onChange
export default function FileUpload({
  label, hint, value, onChange, error,
  accept = "image/*,application/pdf", maxMB = 5,
  multiple = false, max = 3, variant = "file", className = "",
}) {
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [localError, setLocalError] = useState("");

  const urls = multiple ? (Array.isArray(value) ? value : []) : value ? [value] : [];
  const canAdd = multiple ? urls.length < max : true;
  const shownError = localError || error;

  const handleFiles = async (fileList) => {
    let files = Array.from(fileList || []);
    if (!files.length) return;
    if (multiple) files = files.slice(0, max - urls.length);

    const tooBig = files.find((f) => f.size > maxMB * 1024 * 1024);
    if (tooBig) return setLocalError(`${tooBig.name} is larger than ${maxMB}MB`);

    setLocalError("");
    setBusy(true);
    setProgress(0);
    try {
      const uploaded = [];
      for (const file of files) uploaded.push(await uploadToCloudinary(file, setProgress));
      onChange(multiple ? [...urls, ...uploaded] : uploaded[0]);
    } catch (err) {
      setLocalError(err?.response?.data?.error?.message || err.message || "Upload failed. Please try again.");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const remove = (url) => onChange(multiple ? urls.filter((u) => u !== url) : "");

  const hiddenInput = (
    <input
      ref={inputRef}
      type="file"
      accept={accept}
      multiple={multiple}
      className="hidden"
      onChange={(e) => handleFiles(e.target.files)}
    />
  );

  if (variant === "avatar") {
    return (
      <div className={`flex items-center gap-4 ${className}`}>
        <div className="relative h-24 w-24 shrink-0">
          <div className="h-full w-full overflow-hidden rounded-full bg-orange-50 ring-4 ring-orange-100">
            {urls[0] ? (
              <img src={urls[0]} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-orange-300">
                <Camera className="h-8 w-8" />
              </div>
            )}
          </div>
          {busy && (
            <div className="absolute inset-0 flex items-center justify-center rounded-full bg-white/70">
              <Loader2 className="h-6 w-6 animate-spin text-orange-600" />
            </div>
          )}
        </div>
        <div>
          <p className="text-sm font-medium text-slate-700">{label}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => inputRef.current?.click()}
              className="rounded-lg bg-orange-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-orange-700 disabled:opacity-60"
            >
              {urls[0] ? "Change photo" : "Upload photo"}
            </button>
            {urls[0] && (
              <button
                type="button"
                onClick={() => remove(urls[0])}
                className="rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
              >
                Remove
              </button>
            )}
          </div>
          <p className="mt-1.5 text-xs text-slate-500">{hint || `JPG or PNG, up to ${maxMB}MB`}</p>
          {shownError && <p className="mt-1 text-xs text-red-600">{shownError}</p>}
        </div>
        {hiddenInput}
      </div>
    );
  }

  return (
    <div className={className}>
      <p className="mb-1.5 text-sm font-medium text-slate-700">{label}</p>

      {urls.map((url) => (
        <div key={url} className="mb-2 flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-2.5">
          {isImage(url) ? (
            <img src={url} alt="" className="h-12 w-12 rounded-lg object-cover" />
          ) : (
            <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-orange-100 text-orange-600">
              <FileText className="h-5 w-5" />
            </span>
          )}
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className="flex min-w-0 flex-1 items-center gap-1.5 text-sm font-medium text-slate-700 hover:text-orange-700"
          >
            View file <ExternalLink className="h-3.5 w-3.5" />
          </a>
          <button
            type="button"
            onClick={() => remove(url)}
            aria-label="Remove file"
            className="rounded-lg p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-600"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ))}

      {canAdd && (
        <button
          type="button"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
          className="flex w-full flex-col items-center gap-1 rounded-xl border-2 border-dashed border-slate-300 px-4 py-5 text-center transition hover:border-orange-500 hover:bg-orange-50/50 disabled:cursor-wait disabled:opacity-80"
        >
          {busy ? (
            <>
              <Loader2 className="h-6 w-6 animate-spin text-orange-600" />
              <span className="text-sm font-medium text-slate-700">Uploading… {progress}%</span>
              <span className="mt-1 h-1.5 w-40 overflow-hidden rounded-full bg-orange-100">
                <span className="block h-full bg-orange-600 transition-all" style={{ width: `${progress}%` }} />
              </span>
            </>
          ) : (
            <>
              <UploadCloud className="h-6 w-6 text-orange-600" />
              <span className="text-sm font-medium text-slate-700">Click to upload</span>
              <span className="text-xs text-slate-500">{hint || `Up to ${maxMB}MB`}</span>
            </>
          )}
        </button>
      )}

      {shownError && <p className="mt-1.5 text-xs text-red-600">{shownError}</p>}
      {hiddenInput}
    </div>
  );
}