import express from "express"
import { adminLogin } from "../controllers/user.controller.js"
import { protect } from "../middleware/auth.js";
import { getFaceVerificationById, listFaceVerifications, reviewFaceVerification } from "../controllers/adminFaceVerificationController.js";

const router = express.Router()

router.post("/login", adminLogin)

router.get("/face-verifications", protect, listFaceVerifications);
router.get("/face-verifications/:id", protect, getFaceVerificationById);
router.put("/face-verifications/:id/review", protect, reviewFaceVerification);

export default router