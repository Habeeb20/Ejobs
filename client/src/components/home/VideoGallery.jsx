import { useEffect, useState } from "react";
import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

// Build a Cloudinary thumbnail from the video URL (frame at 2s, 640x360, jpg)
const getThumbnail = (url) =>
  url
    .replace("/video/upload/", "/video/upload/so_2,w_640,h_360,c_fill,f_jpg/")
    .replace(/\.[a-zA-Z0-9]+$/, ".jpg");

const formatDuration = (s = 0) => {
  const m = Math.floor(s / 60);
  const sec = String(s % 60).padStart(2, "0");
  return `${m}:${sec}`;
};

export default function VideoGallery() {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [active, setActive] = useState(null); // video currently playing

  useEffect(() => {
    axios
      .get(`${API_URL}/videos`)
      .then((res) => setVideos(res.data.videos))
      .catch(() => setError("We couldn't load the videos. Refresh the page to try again."))
      .finally(() => setLoading(false));
  }, []);

  // Close player with Escape
  useEffect(() => {
    if (!active) return;
    const onKey = (e) => e.key === "Escape" && setActive(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active]);

  if (loading) return <p style={styles.state}>Loading videos…</p>;
  if (error) return <p style={{ ...styles.state, color: "#b42318" }}>{error}</p>;
  if (videos.length === 0) return <p style={styles.state}>No videos yet. Check back soon.</p>;

  return (
    <section style={styles.wrap}>
      <h2 style={styles.heading}>Career videos</h2>

      <div style={styles.grid}>
        {videos.map((v) => (
          <button key={v._id} onClick={() => setActive(v)} style={styles.card} aria-label={`Play ${v.title}`}>
            <div style={styles.thumbWrap}>
              <img src={getThumbnail(v.videoUrl)} alt="" loading="lazy" style={styles.thumb} />
              {v.duration > 0 && <span style={styles.duration}>{formatDuration(v.duration)}</span>}
              <span style={styles.play} aria-hidden="true">▶</span>
            </div>
            <div style={styles.meta}>
              <h3 style={styles.title}>{v.title}</h3>
              {v.description && <p style={styles.desc}>{v.description}</p>}
            </div>
          </button>
        ))}
      </div>

      {active && (
        <div style={styles.overlay} onClick={() => setActive(null)} role="dialog" aria-modal="true" aria-label={active.title}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <video src={active.videoUrl} controls autoPlay style={styles.player} />
            <div style={styles.modalFooter}>
              <div>
                <h3 style={{ margin: 0 }}>{active.title}</h3>
                {active.description && <p style={{ margin: "6px 0 0", color: "#475467" }}>{active.description}</p>}
              </div>
              <button onClick={() => setActive(null)} style={styles.close}>Close</button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

const styles = {
  wrap: { maxWidth: 1100, margin: "2rem auto", padding: "0 16px", fontFamily: "system-ui, sans-serif" },
  heading: { margin: "0 0 20px" },
  state: { textAlign: "center", padding: "3rem 1rem", fontFamily: "system-ui, sans-serif", color: "#475467" },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 20 },
  card: { textAlign: "left", background: "#fff", border: "1px solid #e4e7ec", borderRadius: 10, padding: 0, cursor: "pointer", overflow: "hidden", font: "inherit" },
  thumbWrap: { position: "relative", aspectRatio: "16 / 9", background: "#101828" },
  thumb: { width: "100%", height: "100%", objectFit: "cover", display: "block" },
  duration: { position: "absolute", right: 8, bottom: 8, background: "rgba(0,0,0,.75)", color: "#fff", fontSize: 12, padding: "2px 6px", borderRadius: 4 },
  play: { position: "absolute", inset: 0, margin: "auto", width: 48, height: 48, lineHeight: "48px", textAlign: "center", borderRadius: "50%", background: "rgba(255,255,255,.9)", color: "#1d6fe0", fontSize: 18 },
  meta: { padding: 12 },
  title: { margin: 0, fontSize: 16 },
  desc: { margin: "6px 0 0", fontSize: 14, color: "#475467", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" },
  overlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,.7)", display: "grid", placeItems: "center", padding: 16, zIndex: 1000 },
  modal: { width: "100%", maxWidth: 860, background: "#fff", borderRadius: 10, overflow: "hidden" },
  player: { width: "100%", maxHeight: "70vh", background: "#000", display: "block" },
  modalFooter: { display: "flex", justifyContent: "space-between", gap: 16, padding: 16, alignItems: "flex-start" },
  close: { padding: "8px 14px", border: "1px solid #c9ccd1", borderRadius: 6, background: "#fff", cursor: "pointer", font: "inherit" },
};