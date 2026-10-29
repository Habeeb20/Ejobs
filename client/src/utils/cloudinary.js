import axios from "axios";

const CLOUD = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

// Uploads one file straight to Cloudinary and resolves with its secure_url string
export async function uploadToCloudinary(file, onProgress) {
  if (!CLOUD || !PRESET) throw new Error("Cloudinary is not configured");
  const body = new FormData();
  body.append("file", file);
  body.append("upload_preset", PRESET);
  const { data } = await axios.post(`https://api.cloudinary.com/v1_1/${CLOUD}/auto/upload`, body, {
    onUploadProgress: (e) => e.total && onProgress?.(Math.round((e.loaded * 100) / e.total)),
  });
  return data.secure_url;
}