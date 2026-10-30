import { Router } from "express";
import { industries, overview } from "../controllers/stats.controller.js";

const router = Router();
router.get("/", overview);
router.get("/industries", industries);
export default router;