import { Router } from "express";
import { register, verifyOtp, resendOtp, completeProfile, login, getMe } from "../controllers/user.controller.js";
import { protect } from "../middleware/auth.js";
import rateLimit from "express-rate-limit";
import { updateProfile } from "../controllers/profile.controller.js";


const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many login attempts. Try again in 15 minutes." },
});


const router = Router();

router.post("/register", register);
router.post("/verify-otp", verifyOtp);
router.post("/resend-otp", resendOtp);
router.put("/complete-profile", protect, completeProfile);
router.post("/login", loginLimiter, login);
router.get("/me", protect, getMe);
router.put("/profile", protect, updateProfile);


// router.get("/me", protect, getMe); // keep above any "/:id" route
export default router;

