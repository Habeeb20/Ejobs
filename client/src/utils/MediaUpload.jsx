import { useRef, useState } from "react";
import { ImagePlus, Loader2, X, Film } from "lucide-react";
import { toast } from "sonner";
import { uploadToCloudinary, validateFile, MAX_MB, optimize } from "./cloudinary";

/**
 * Reusable Cloudinary uploader.
 *   value:    { url, publicId, type } or null
 *   onChange: called with that object after a successful upload, or null when removed
 *   accept:   "image" | "video" | "both"
 */
export default function MediaUpload({ value, onChange, accept = "both", folder = "ejob/ads", label = "Image or video", error }) {
  const inputRef = useRef(null);
  const [progress, setProgress] = useState(null); // null = idle, 0-100 = uploading
  const [drag, setDrag] = useState(false);

  const mime = accept === "image" ? "image/*" : accept === "video" ? "video/*" : "image/*,video/*";
  const hint = accept === "image" ? `PNG or JPG, up to ${MAX_MB.image}MB`
    : accept === "video" ? `MP4, up to ${MAX_MB.video}MB`
    : `Image up to ${MAX_MB.image}MB or video up to ${MAX_MB.video}MB`;

  const upload = async (file) => {
    if (!file) return;
    const problem = validateFile(file, accept);
    if (problem) return toast.error(problem);
    setProgress(0);
    try {
      const result = await uploadToCloudinary(file, { folder, accept, onProgress: setProgress });
      onChange({ url: result.url, publicId: result.publicId, type: result.type });
      toast.success("Upload complete");
    } catch (err) { toast.error(err.message); }
    finally { setProgress(null); if (inputRef.current) inputRef.current.value = ""; }
  };

  return (
    <div>
      <span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>

      {value?.url ? (
        <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
          {value.type === "video"
            ? <video src={value.url} controls playsInline className="max-h-64 w-full bg-black object-contain" />
            : <img src={optimize(value.url, 800)} alt="Uploaded preview" className="max-h-64 w-full object-contain" />}
          <button type="button" onClick={() => onChange(null)} aria-label="Remove file"
            className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-white/90 text-slate-700 shadow hover:bg-white">
            <X size={16} />
          </button>
        </div>
      ) : (
        <div
          onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => { e.preventDefault(); setDrag(false); upload(e.dataTransfer.files?.[0]); }}
          className={`flex flex-col items-center justify-center rounded-2xl border-2 border-dashed px-4 py-8 text-center transition ${
            drag ? "border-orange-500 bg-orange-50" : error ? "border-red-300 bg-red-50/40" : "border-slate-300 bg-white"
          }`}
        >
          {progress !== null ? (
            <div className="w-full max-w-xs">
              <div className="mb-2 flex items-center justify-center gap-2 text-sm text-slate-600"><Loader2 size={16} className="animate-spin" /> Uploading… {progress}%</div>
              <div className="h-2 rounded-full bg-slate-200"><div className="h-full rounded-full bg-orange-600 transition-all" style={{ width: `${progress}%` }} /></div>
            </div>
          ) : (
            <>
              <span className="grid h-12 w-12 place-items-center rounded-full bg-orange-100 text-orange-600">
                {accept === "video" ? <Film size={22} /> : <ImagePlus size={22} />}
              </span>
              <p className="mt-3 text-sm font-semibold">Drag a file here or</p>
              <button type="button" onClick={() => inputRef.current?.click()}
                className="mt-2 rounded-xl bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-700">Choose a file</button>
              <p className="mt-2 text-xs text-slate-500">{hint}</p>
            </>
          )}
        </div>
      )}

      <input ref={inputRef} type="file" accept={mime} className="sr-only" onChange={(e) => upload(e.target.files?.[0])} />
      {error && <span className="mt-1 block text-xs text-red-600">{error}</span>}
    </div>
  );
}