import { Router } from "express";
import { protect, authorize } from "../middleware/auth.js"; // your existing auth middleware (must set req.user)

import { ROLES } from "../models/User.js";
import { listUsers, moderateUser, bulkModerate } from "../controllers/userModeration.controller.js";
import { getUserStats, getJobStats, getApplicationStats } from "../controllers/superadminStats.controller.js";

const router = Router();
const staff = authorize(ROLES.ADMIN, ROLES.SUPERADMIN);
const superOnly = authorize(ROLES.SUPERADMIN);

router.use(protect);

// Verify / unverify / block / unblock (admin + superadmin)
router.get("/users", staff, listUsers);
router.post("/users/bulk", staff, bulkModerate);
router.patch("/users/:id/:action", staff, moderateUser);

// Statistics (superadmin only)
router.get("/stats/users", superOnly, getUserStats);
router.get("/stats/jobs", superOnly, getJobStats);
router.get("/stats/applications", superOnly, getApplicationStats);

export default router;

