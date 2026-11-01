import { Router } from "express";
import { fullAnalytics } from "../controllers/analytics.controller.js";

const router = Router();
router.get("/full", fullAnalytics); // public: no login needed
export default router;