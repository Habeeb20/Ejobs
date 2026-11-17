



import { Router } from "express";
// IMPORTANT: copy this import from your jobs routes file, so it uses the same
// login middleware as the rest of your API (it might be called protect, auth, verifyToken...).
import { protect } from "../middleware/auth.js";
import {
  scheduleInterview, listJobInterviews, myInterviews, cancelInterview, joinInterview,
} from "../controllers/interview.controller.js";

const router = Router();
router.use(protect);

router.post("/", scheduleInterview);              // employer schedules / reschedules
router.get("/mine", myInterviews);                // jobseeker's upcoming interviews
router.get("/job/:jobId", listJobInterviews);     // employer's interviews for one job
router.get("/:id/join", joinInterview);           // either person, before opening the room
router.delete("/:id", cancelInterview);          // employer cancels

export default router;