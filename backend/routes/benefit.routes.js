import { Router } from "express";

// Adjust these two imports to your own auth middleware:
//   protect   -> verifies the JWT and sets req.user (needs at least _id and role)
//   authorize -> (...roles) => 403 unless req.user.role is one of them
import { protect, authorize} from "../middleware/auth.js";
import { ROLES } from "../models/User.js";

import {
  createBenefit,
  getEligibility,
  getMyAttendance,
  getMyBenefits,
  getMyStats,
} from "../controllers/benefit.controller.js";
import {
  approveRequest,
  getBenefitSettings,
  getRequestDetail,
  getStats,
  listAttendance,
  listRequests,
  markPaid,
  recordAttendance,
  rejectRequest,
  runAttendanceCheck,
  updateBenefitSettings,
} from "../controllers/benefitAdminController.js";

const router = Router();

const seeker = [protect, authorize(ROLES.JOBSEEKER)];
const superadmin = [protect, authorize(ROLES.SUPERADMIN)];
const staff = [protect, authorize(ROLES.SUPERADMIN, ROLES.ADMIN, ROLES.AGENT)];

// Job seeker
router.get("/eligibility", seeker, getEligibility);
router.get("/mine", seeker, getMyBenefits);
router.get("/mine/stats", seeker, getMyStats);
router.get("/mine/attendance", seeker, getMyAttendance);
router.post("/", seeker, createBenefit);

// Super admin
router.get("/admin/requests", superadmin, listRequests);
router.get("/admin/requests/:id", superadmin, getRequestDetail);
router.post("/admin/requests/:id/approve", superadmin, approveRequest);
router.post("/admin/requests/:id/reject", superadmin, rejectRequest);
router.post("/admin/requests/:id/pay", superadmin, markPaid);
router.get("/admin/stats", superadmin, getStats);
router.put("/admin/settings", superadmin, updateBenefitSettings);
router.post("/admin/attendance/enforce", superadmin, runAttendanceCheck);

// Staff who work at the venue can read settings and record check-ins
router.get("/admin/settings", staff, getBenefitSettings);
router.get("/admin/attendance", staff, listAttendance);
router.post("/admin/attendance", staff, recordAttendance);

export default router;