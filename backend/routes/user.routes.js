import { Router } from "express";
import { register, verifyOtp, resendOtp, completeProfile, login, getMe } from "../controllers/user.controller.js";
import { protect } from "../middleware/auth.js";
import rateLimit from "express-rate-limit";
import { updateProfile } from "../controllers/profile.controller.js";
import {
  jobseekerOnly, sectionHandlers, getCv, saveCv, attachCv, removeCvFile,
} from "../controllers/proflleSection.controller.js";

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many login attempts. Try again in 15 minutes." },
});

const SECTION_PATHS = {
  education: "education",
  work: "work-experience",
  certificates: "certificates",
  guarantors: "guarantors",
};

const router = Router();

router.post("/register", register);
router.post("/verify-otp", verifyOtp);
router.post("/resend-otp", resendOtp);
router.put("/complete-profile", protect, completeProfile);
router.post("/login", loginLimiter, login);
router.get("/me", protect, getMe);
router.put("/profile", protect, updateProfile);





for (const [key, path] of Object.entries(SECTION_PATHS)) {
  const h = sectionHandlers[key];
  router.get(`/${path}`, protect, jobseekerOnly, h.list);
  router.post(`/${path}`, protect, jobseekerOnly, h.create);
  router.put(`/${path}/:id`, protect, jobseekerOnly, h.update);
  router.delete(`/${path}/:id`, protect, jobseekerOnly, h.remove);
}

router.get("/cv", protect, jobseekerOnly, getCv);
router.put("/cv", protect, jobseekerOnly, saveCv);
router.post("/cv/files", protect, jobseekerOnly, attachCv);
router.delete("/cv/files/:format", protect, jobseekerOnly, removeCvFile);


// router.get("/me", protect, getMe); // keep above any "/:id" route
export default router;

