// backend/routes/recruitmentRoutes.js
// Mount with: app.use("/api/recruitment", recruitmentRoutes);
import express from "express";
import { protect } from "../middleware/auth.js"; // <- your existing JWT middleware (sets req.user)
import * as employer from "../controllers/recruitment.controller.js";
import * as admin from "../controllers/recruitmentAdmin.controller.js";

const router = express.Router();

const requireRole = (...roles) => (req, res, next) =>
  roles.includes(req.user?.role)
    ? next()
    : res.status(403).json({ success: false, message: "You do not have access to this." });
const employerOnly = [protect, requireRole("employer")];
const adminOnly = [protect, requireRole("admin", "superadmin")];

/* ---------- public ---------- */
router.get("/catalog", employer.getCatalog);

/* ---------- employer ---------- */
router.post("/quote", ...employerOnly, employer.quoteRequest);
router.post("/requests", ...employerOnly, employer.createRequest);
router.get("/requests", ...employerOnly, employer.listMyRequests);
router.get("/requests/:id", ...employerOnly, employer.getMyRequest);
router.post("/requests/:id/cancel", ...employerOnly, employer.cancelRequest);
router.post("/requests/:id/payments/:paymentId/proof", ...employerOnly, employer.submitPaymentProof);
router.post("/requests/:id/candidates/:cid/decision", ...employerOnly, employer.decideCandidate);
router.post("/requests/:id/changes", ...employerOnly, employer.createChange);
router.post("/requests/:id/replacements", ...employerOnly, employer.createReplacement);

/* ---------- admin ---------- */
router.get("/admin/overview", ...adminOnly, admin.overview);
router.get("/admin/requests", ...adminOnly, admin.listRequests);
router.get("/admin/requests/:id", ...adminOnly, admin.getRequest);
router.patch("/admin/requests/:id", ...adminOnly, admin.updateRequest);
router.get("/admin/jobseekers", ...adminOnly, admin.searchJobseekers);
router.post("/admin/requests/:id/candidates", ...adminOnly, admin.addCandidate);
router.patch("/admin/requests/:id/candidates/:cid", ...adminOnly, admin.updateCandidate);
router.delete("/admin/requests/:id/candidates/:cid", ...adminOnly, admin.removeCandidate);
router.post("/admin/requests/:id/documents", ...adminOnly, admin.addDocument);
router.delete("/admin/requests/:id/documents/:docId", ...adminOnly, admin.removeDocument);
router.post("/admin/requests/:id/notes", ...adminOnly, admin.addNote);

router.get("/admin/payments", ...adminOnly, admin.listPayments);
router.post("/admin/payments/:paymentId/decision", ...adminOnly, admin.decidePayment);
router.get("/admin/changes", ...adminOnly, admin.listChanges);
router.post("/admin/changes/:changeId/decision", ...adminOnly, admin.decideChange);
router.get("/admin/replacements", ...adminOnly, admin.listReplacements);
router.post("/admin/replacements/:replId/decision", ...adminOnly, admin.decideReplacement);
router.get("/admin/plans", ...adminOnly, admin.listPlans);
router.put("/admin/plans/:key", ...adminOnly, admin.updatePlan);

export default router;