import { Router } from "express";
import { protect } from "../middleware/auth.js"; // your existing auth middleware (sets req.user)
import { ROLES } from "../models/User.js";
import {
  listPackages, activeAds, clickAd, createAd, updateAd, myAds, deleteAd, initAdPayment, confirmAdPayment,
  submitAd, adminList, approveAd, rejectAd, setAdState,
} from "../controllers/ads.controller.js";

const staff = (req, res, next) =>
  [ROLES.ADMIN, ROLES.SUPERADMIN].includes(req.user?.role)
    ? next()
    : res.status(403).json({ success: false, message: "You don't have access to this" });

const router = Router();

// Public
router.get("/packages", listPackages);
router.get("/active", activeAds);
router.post("/:id/click", clickAd);

router.use(protect);

// Admin and super admin: review
router.get("/admin/list", staff, adminList);
router.post("/admin/:id/approve", staff, approveAd);
router.post("/admin/:id/reject", staff, rejectAd);
router.patch("/admin/:id/state", staff, setAdState);

// Any logged-in role (admins publish free, everyone else pays then waits for review)
router.get("/mine", myAds);
router.post("/", createAd);
router.put("/:id", updateAd);
router.delete("/:id", deleteAd);
router.post("/:id/payment", initAdPayment);
router.post("/:id/confirm", confirmAdPayment);
router.post("/:id/submit", submitAd);

export default router;