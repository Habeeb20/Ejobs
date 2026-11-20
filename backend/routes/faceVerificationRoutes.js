import express from "express";
import { submitFaceVerification, getMyFaceVerification } from "../controllers/faceVerificationController.js";
// Use whatever auth middleware you already have. It must set req.user (with _id).
import { protect } from "../middleware/auth.js";

const router = express.Router();

router.post("/", protect, submitFaceVerification);
router.get("/me", protect, getMyFaceVerification);

export default router;