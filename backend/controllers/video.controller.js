import Video from "../models/Video.js";

// Only accept URLs that really point to a video on YOUR Cloudinary account
const isValidCloudinaryVideoUrl = (url) => {
  try {
    const u = new URL(url);
    return (
      u.protocol === "https:" &&
      u.hostname === "res.cloudinary.com" &&
      u.pathname.startsWith(`/${process.env.CLOUDINARY_CLOUD_NAME}/video/upload/`)
    );
  } catch {
    return false;
  }
};

// POST /api/videos  (superadmin only)
export const saveVideo = async (req, res) => {
  try {
    const { title, description, videoUrl, publicId, duration } = req.body;

    if (!title || !videoUrl) {
      return res.status(400).json({ success: false, message: "Title and videoUrl are required" });
    }
    if (!isValidCloudinaryVideoUrl(videoUrl)) {
      return res.status(400).json({ success: false, message: "Invalid Cloudinary video URL" });
    }

    const video = await Video.create({
      title,
      description,
      videoUrl,
      publicId,
      duration,
      uploadedBy: req.user._id,
    });

    res.status(201).json({ success: true, message: "Video saved", video });
  } catch (err) {
    console.error("saveVideo error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// GET /api/videos  (public)
export const getVideos = async (req, res) => {
  try {
    const videos = await Video.find().sort({ createdAt: -1 });
    res.json({ success: true, videos });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error" });
  }
};