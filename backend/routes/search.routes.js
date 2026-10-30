import { Router } from "express";
import { suggest, searchJobs, searchCandidates } from "../controllers/search.controller.js";

const router = Router();
router.get("/suggest", suggest);
router.get("/jobs", searchJobs);
router.get("/candidates", searchCandidates);
export default router;