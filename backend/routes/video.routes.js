import express from "express";
import { saveVideo, getVideos } from "../controllers/video.controller.js";

// Adjust to match your existing auth middleware (named or default export)
import { protect } from "../middleware/auth.js";

const router = express.Router();

const superAdminOnly = (req, res, next) => {
  if (req.user && req.user.role === "superadmin") return next();
  return res.status(403).json({ success: false, message: "Superadmin access only" });
};

router.post("/", protect, superAdminOnly, saveVideo);
router.get("/", getVideos); // public: anyone can watch

export default router;

// In app.js / server.js:
// import videoRoutes from "./routes/videoRoutes.js";
// app.use("/api/videos", videoRoutes);