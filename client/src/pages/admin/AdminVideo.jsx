import { useState } from "react";
import axios from "axios";

// .env (Vite):  VITE_CLOUDINARY_CLOUD_NAME=xxxx   VITE_CLOUDINARY_UPLOAD_PRESET=xxxx  (unsigned preset)
// .env (CRA):   use REACT_APP_ prefix and process.env instead of import.meta.env
const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;
const API_URL = import.meta.env.VITE_BACKEND || "http://localhost:2000/api";
const MAX_SIZE_MB = 100;

export default function VideoUpload() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState(null);
  const [progress, setProgress] = useState(0);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    if (!selected) return;
    if (!selected.type.startsWith("video/")) {
      return setMessage({ type: "error", text: "Please choose a video file." });
    }
    if (selected.size > MAX_SIZE_MB * 1024 * 1024) {
      return setMessage({ type: "error", text: `Video must be under ${MAX_SIZE_MB}MB.` });
    }
    setMessage({ type: "", text: "" });
    setFile(selected);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !file) {
      return setMessage({ type: "error", text: "Add a title and choose a video." });
    }

    try {
      setLoading(true);
      setProgress(0);
      setMessage({ type: "", text: "" });

      // 1. Upload straight to Cloudinary from the browser
      const formData = new FormData();
      formData.append("file", file);
      formData.append("upload_preset", UPLOAD_PRESET);
      formData.append("folder", "ejob/videos");

      const cloud = await axios.post(
        `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/video/upload`,
        formData,
        {
          onUploadProgress: (p) => setProgress(Math.round((p.loaded * 100) / p.total)),
        }
      );

      // 2. Send the Cloudinary URL (not the file) to your backend
      const token = localStorage.getItem("token"); // adjust to how you store your auth token
      await axios.post(
        `${API_URL}/videos`,
        {
          title,
          description,
          videoUrl: cloud.data.secure_url,
          publicId: cloud.data.public_id,
          duration: Math.round(cloud.data.duration || 0),
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setMessage({ type: "success", text: "Video uploaded and saved." });
      setTitle("");
      setDescription("");
      setFile(null);
      setProgress(0);
      e.target.reset();
    } catch (err) {
      setMessage({
        type: "error",
        text: err.response?.data?.message || err.response?.data?.error?.message || "Upload failed. Try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={styles.form}>
      <h2 style={styles.heading}>Upload a video</h2>

      <label style={styles.label}>
        Title
        <input
          style={styles.input}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. How to ace a job interview"
          disabled={loading}
        />
      </label>

      <label style={styles.label}>
        Description
        <textarea
          style={{ ...styles.input, minHeight: 80, resize: "vertical" }}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          disabled={loading}
        />
      </label>

      <label style={styles.label}>
        Video file (max {MAX_SIZE_MB}MB)
        <input type="file" accept="video/*" onChange={handleFileChange} disabled={loading} />
      </label>

      {file && <video src={URL.createObjectURL(file)} controls style={styles.preview} />}

      {loading && (
        <div style={styles.track} aria-label="Upload progress">
          <div style={{ ...styles.bar, width: `${progress}%` }} />
        </div>
      )}

      {message.text && (
        <p role="status" style={{ color: message.type === "error" ? "#b42318" : "#067647", margin: 0 }}>
          {message.text}
        </p>
      )}

      <button type="submit" disabled={loading} style={styles.button}>
        {loading ? `Uploading ${progress}%` : "Upload video"}
      </button>
    </form>
  );
}

const styles = {
  form: { maxWidth: 520, margin: "2rem auto", display: "grid", gap: 16, fontFamily: "system-ui, sans-serif" },
  heading: { margin: 0 },
  label: { display: "grid", gap: 6, fontWeight: 600, fontSize: 14 },
  input: { padding: 10, border: "1px solid #c9ccd1", borderRadius: 6, font: "inherit", fontWeight: 400 },
  preview: { width: "100%", borderRadius: 8, background: "#000" },
  track: { height: 8, background: "#e4e7ec", borderRadius: 4, overflow: "hidden" },
  bar: { height: "100%", background: "#1d6fe0", transition: "width .2s" },
  button: { padding: "12px 16px", border: 0, borderRadius: 6, background: "#1d6fe0", color: "#fff", font: "inherit", fontWeight: 600, cursor: "pointer" },
};