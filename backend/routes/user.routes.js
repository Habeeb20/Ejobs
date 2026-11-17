import { Router } from "express";
import { register, verifyOtp, resendOtp, completeProfile, login, getMe } from "../controllers/user.controller.js";
import { protect } from "../middleware/auth.js";
import rateLimit from "express-rate-limit";
import { updateProfile } from "../controllers/profile.controller.js";
import {
  jobseekerOnly, sectionHandlers, getCv, saveCv, attachCv, removeCvFile,
} from "../controllers/proflleSection.controller.js";
import { forgotPassword, checkResetToken, resetPassword
 } from "../controllers/user.controller.js";
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many login attempts. Try again in 15 minutes." },
});


const limiter = (limit, minutes) =>
  rateLimit({
    windowMs: minutes * 60 * 1000, limit, max: limit, // "limit" is the current option name, "max" the older one
    standardHeaders: true, legacyHeaders: false,
    message: { success: false, message: "Too many attempts. Please wait a few minutes and try again." },
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
router.post("/forgot-password", limiter(5, 15), forgotPassword);
router.post("/reset-password/check", limiter(20, 15), checkResetToken);
router.post("/reset-password", limiter(10, 15), resetPassword);


// router.get("/me", protect, getMe); // keep above any "/:id" route
export default router;

