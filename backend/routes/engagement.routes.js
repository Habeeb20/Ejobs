import { Router } from "express";
// ⚠ Use the same auth middleware your existing jobRoutes.js uses. It must set req.user.
import { protect } from "../middleware/auth.js";
import { ROLES } from "../models/User.js";
import {
  listBoostPlans, initBoostPayment, confirmBoostPayment, suggestCandidates,
  getApplicationHistory, respondToStage,
  inviteToPhysicalInterview, payPhysicalInterview, confirmPhysicalInterview,
  searchTalent, getTalentProfile, inviteTalent,
  getSeekerWorkHistory, myWorkHistory,
  getAccountBoost, initAccountBoostPayment, confirmAccountBoostPayment,
} from "../controllers/engagement.controller.js";

const only = (...roles) => (req, res, next) =>
  roles.includes(req.user?.role)
    ? next()
    : res.status(403).json({ success: false, message: "Your account type can't do this" });

const employer = only(ROLES.EMPLOYER);
const seeker = only(ROLES.JOBSEEKER);

const router = Router();
router.use(protect);

// Boosts (employer)
router.get("/boost/plans", listBoostPlans);
router.post("/jobs/:id/boost/payment", employer, initBoostPayment);
router.post("/jobs/:id/boost/confirm", employer, confirmBoostPayment);
router.get("/jobs/:id/suggestions", employer, suggestCandidates);

// Mail history + timeline (employer or the jobseeker on that application)
router.get("/applications/:appId/history", getApplicationHistory);

// Jobseeker answers a stage or an interview invite
router.post("/applications/:appId/respond", seeker, respondToStage);

// Physical interview (employer pays the fee through Paystack)
router.post("/applications/:appId/physical-interview", employer, inviteToPhysicalInterview);
router.post("/applications/:appId/physical-interview/pay", employer, payPhysicalInterview);
router.post("/applications/:appId/physical-interview/confirm", employer, confirmPhysicalInterview);

// Talent search (employer)
router.get("/talent", employer, searchTalent);
router.get("/talent/:seekerId", employer, getTalentProfile);
router.post("/talent/:seekerId/invite", employer, inviteTalent);
router.get("/seekers/:seekerId/work-history", employer, getSeekerWorkHistory);

// Jobseeker
router.get("/work-history/mine", seeker, myWorkHistory);
router.get("/account-boost", seeker, getAccountBoost);
router.post("/account-boost/payment", seeker, initAccountBoostPayment);
router.post("/account-boost/confirm", seeker, confirmAccountBoostPayment);

export default router;

