import axios from "axios";

const CLOUD = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

// Uploads one file straight to Cloudinary and resolves with its secure_url string
// export async function uploadToCloudinary(file, onProgress) {
//   if (!CLOUD || !PRESET) throw new Error("Cloudinary is not configured");
//   const body = new FormData();
//   body.append("file", file);
//   body.append("upload_preset", PRESET);
//   const { data } = await axios.post(`https://api.cloudinary.com/v1_1/${CLOUD}/auto/upload`, body, {
//     onUploadProgress: (e) => e.total && onProgress?.(Math.round((e.loaded * 100) / e.total)),
//   });
//   return data.secure_url;
// }



export const MAX_MB = { image: 5, video: 30 };

// Returns an error message, or null when the file is fine
export function validateFile(file, accept = "both") {
  const isImage = file.type.startsWith("image/");
  const isVideo = file.type.startsWith("video/");
  if (!isImage && !isVideo) return "Choose an image or a video";
  if (accept === "image" && !isImage) return "Choose an image";
  if (accept === "video" && !isVideo) return "Choose a video";
  const kind = isImage ? "image" : "video";
  if (file.size > MAX_MB[kind] * 1024 * 1024) return `${kind === "image" ? "Images" : "Videos"} must be under ${MAX_MB[kind]}MB`;
  return null;
}

/**
 * Uploads a file to Cloudinary with progress.
 * Resolves { url, publicId, type: "image" | "video", width, height, duration, bytes }.
 * Pass an AbortSignal to cancel.
 */
export function uploadToCloudinary(file, { folder = "ejob/ads", accept = "both", onProgress, signal } = {}) {
  return new Promise((resolve, reject) => {
    if (!CLOUD || !PRESET)
      return reject(new Error("Cloudinary isn't set up. Add VITE_CLOUDINARY_CLOUD_NAME and VITE_CLOUDINARY_UPLOAD_PRESET to your .env"));
    const problem = validateFile(file, accept);
    if (problem) return reject(new Error(problem));

    const form = new FormData();
    form.append("file", file);
    form.append("upload_preset", PRESET);
    if (folder) form.append("folder", folder);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", `https://api.cloudinary.com/v1_1/${CLOUD}/auto/upload`);
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress?.(Math.round((e.loaded / e.total) * 100));
    xhr.onload = () => {
      try {
        const r = JSON.parse(xhr.responseText);
        if (xhr.status < 200 || xhr.status >= 300) return reject(new Error(r.error?.message || "Upload failed"));
        resolve({
          url: r.secure_url, publicId: r.public_id, type: r.resource_type === "video" ? "video" : "image",
          width: r.width, height: r.height, duration: r.duration, bytes: r.bytes,
        });
      } catch { reject(new Error("Upload failed")); }
    };
    xhr.onerror = () => reject(new Error("Network error while uploading"));
    xhr.onabort = () => reject(new Error("Upload cancelled"));
    signal?.addEventListener("abort", () => xhr.abort());
    xhr.send(form);
  });
}

// Smaller, faster copy of an uploaded file for display (Cloudinary resizes on the fly)
export const optimize = (url, width = 1000) =>
  url && url.includes("/upload/") ? url.replace("/upload/", `/upload/f_auto,q_auto,w_${width}/`) : url;