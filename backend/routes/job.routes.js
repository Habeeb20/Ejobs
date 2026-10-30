

import { Router } from "express";

import { protect } from "../middleware/auth.js"; // your existing middleware that sets req.user
import { ROLES } from "../models/User.js";
import {
  listPlans, getAds, createJob, updateJob, myJobs, submitJob, initPayment, confirmPayment,
  getApplicants, getAnalytics, applyToJob, listPending, approveJob, rejectJob,
  browseJobs, getJobDetails, viewPublicJob, toggleLike, shareJob, savedJobs, myApplications, updateApplicationStatus,
  getPublicJobs,
  followJob,
  getAllJobs,
} from "../controllers/job.controller.js";
import { optionalAuth } from "../config/others.js";
import { getApplicantProfile } from "../controllers/proflleSection.controller.js";

const only = (...roles) => (req, res, next) =>
  roles.includes(req.user?.role)
    ? next()
    : res.status(403).json({ success: false, message: "You don't have access to this" });

const employer = only(ROLES.EMPLOYER);
const router = Router();

// Public
router.get("/plans", listPlans);
router.get("/ads", getAds);
router.get("/all", getPublicJobs)

router.get("/public/:id", viewPublicJob); // shared links open this without a login
router.get("/all", optionalAuth, getAllJobs);

router.use(protect);


router.get("/applications/:appId/profile",  getApplicantProfile);
// Super admin approval queue (declared before /:id routes)
router.get("/admin/pending", only(ROLES.SUPERADMIN), listPending);
router.post("/admin/:id/approve", only(ROLES.SUPERADMIN), approveJob);
router.post("/admin/:id/reject", only(ROLES.SUPERADMIN), rejectJob);

// Job seeker (fixed paths first, so "/browse" is never read as an :id)
router.get("/browse",  browseJobs);
router.get("/saved/mine", only(ROLES.JOBSEEKER), savedJobs);
router.get("/applications/mine", only(ROLES.JOBSEEKER), myApplications);
router.get("/:id/details", only(ROLES.JOBSEEKER), getJobDetails);
router.post("/:id/like", only(ROLES.JOBSEEKER), toggleLike);
router.post("/:id/share", shareJob); // any logged-in user

// Employer
router.put("/applications/:appId/status", employer, updateApplicationStatus);
router.get("/mine", employer, myJobs);
router.post("/", employer, createJob);
router.put("/:id", employer, updateJob);
router.post("/:id/submit", employer, submitJob);
router.post("/:id/payment", employer, initPayment);
router.post("/:id/confirm", employer, confirmPayment);
router.get("/:id/applicants", employer, getApplicants);
router.get("/:id/analytics", employer, getAnalytics);
router.post("/:id/follow", protect, followJob);
router.post("/:id/apply", only(ROLES.JOBSEEKER), applyToJob);

export default router;