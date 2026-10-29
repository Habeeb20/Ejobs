import { Router } from "express";
import { protect } from "../middleware/auth.js"; // your existing auth middleware
import { getOverview } from "../controllers/overview.controller.js";

const router = Router();
router.get("/", protect, getOverview);
export default router;