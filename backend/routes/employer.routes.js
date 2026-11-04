import express from "express";
import { listEmployers, getEmployer } from "../controllers/employers.controller.js";

// Public: no token needed
const router = express.Router();
router.get("/", listEmployers);
router.get("/:id", getEmployer);

export default router;
// server.js:  app.use("/api/employers", employersRoutes);