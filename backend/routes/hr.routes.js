import { Router } from "express";
import { protect } from "../middleware/auth.js";
import { employerOnly, myEmployment } from "../controllers/hr/shared.js";
import * as emp from "../controllers/hr/employees.controller.js";
import * as leave from "../controllers/hr/leave.controller.js";
import * as att from "../controllers/hr/attendance.controller.js";
import * as pay from "../controllers/hr/payroll.controller.js";
import * as perf from "../controllers/hr/performance.controller.js";
import * as comms from "../controllers/hr/comms.controller.js";
import * as reports from "../controllers/hr/reports.controller.js";
import * as settings from "../controllers/hr/settings.controller.js";
import * as me from "../controllers/hr/me.controller.js";

const router = Router();
router.use(protect);

/* ---------- any logged-in user: their HR notification list ---------- */
router.get("/notifications", comms.listNotifications);
router.post("/notifications/read", comms.readNotifications);

/* ---------- employee side: /api/hr/me/... ---------- */
router.get("/me/employments", me.employments);
const mine = Router({ mergeParams: true });
mine.get("/overview", me.overview);
mine.put("/profile", me.updateProfile);
mine.get("/attendance", me.attendance);
mine.post("/clock-in", me.doClockIn);
mine.post("/clock-out", me.doClockOut);
mine.get("/leave", me.leave);
mine.post("/leave", me.requestLeave);
mine.post("/leave/:id/cancel", me.cancelLeave);
mine.get("/payslips", me.payslips);
mine.get("/payslips/:id", me.payslip);
mine.get("/reviews", me.reviews);
mine.post("/reviews/:id/acknowledge", me.acknowledgeReview);
mine.get("/goals", me.goals);
mine.post("/goals", me.createMyGoal);
mine.put("/goals/:id", me.updateMyGoal);
mine.post("/documents", me.uploadDocument);
mine.delete("/documents/:docId", me.removeMyDocument);
mine.put("/tasks/:taskId", me.toggleMyTask);
mine.get("/messages", me.messages);
mine.post("/messages", me.sendMyMessage);
mine.get("/announcements", me.announcements);
mine.post("/announcements/:id/read", me.readAnnouncement);
mine.get("/cases", me.cases);
mine.post("/cases/:id/respond", me.respondCase);
router.use("/me/:eid", myEmployment, mine);

/* ---------- employer side: everything below needs the employer role ---------- */
router.use(employerOnly);

router.get("/overview", reports.overview);
router.get("/settings", settings.readSettings);
router.put("/settings", settings.updateSettings);

router.get("/employees", emp.listEmployees);
router.post("/employees", emp.addEmployee);
router.get("/hire-candidates", emp.hireCandidates);
router.post("/employees/from-application/:applicationId", emp.hireFromApplication);
router.get("/employees/:id", emp.getEmployee);
router.put("/employees/:id", emp.updateEmployee);
router.post("/employees/:id/status", emp.changeStatus);
router.get("/employees/:id/activity", emp.activity);
router.post("/employees/:id/documents", emp.addDocument);
router.delete("/employees/:id/documents/:docId", emp.removeDocument);
router.post("/employees/:id/tasks", emp.addTask);
router.put("/employees/:id/tasks/:taskId", emp.updateTask);
router.delete("/employees/:id/tasks/:taskId", emp.removeTask);

router.get("/leave", leave.listLeave);
router.get("/leave/balances", leave.leaveBalances);
router.post("/leave", leave.hrCreateLeave);
router.post("/leave/:id/decision", leave.decideLeave);

router.get("/attendance/day", att.dayBoard);
router.get("/attendance/report", att.monthReport);
router.post("/attendance/mark", att.markAttendance);

router.get("/payroll", pay.listPayroll);
router.post("/payroll/generate", pay.generatePayroll);
router.post("/payroll/publish", pay.publishPayroll);
router.post("/payroll/paid", pay.markPaid);
router.put("/payroll/:id", pay.updatePayslip);
router.post("/payroll/:id/recalculate", pay.recalculatePayslip);
router.delete("/payroll/:id", pay.deletePayslip);

router.get("/reviews", perf.listReviews);
router.post("/reviews", perf.createReview);
router.put("/reviews/:id", perf.updateReview);
router.post("/reviews/:id/publish", perf.publishReview);
router.delete("/reviews/:id", perf.deleteReview);
router.get("/goals", perf.listGoals);
router.post("/goals", perf.createGoal);
router.put("/goals/:id", perf.updateGoal);
router.delete("/goals/:id", perf.deleteGoal);
router.get("/cases", perf.listCases);
router.post("/cases", perf.createCase);
router.post("/cases/:id/close", perf.closeCase);

router.get("/announcements", comms.listAnnouncements);
router.post("/announcements", comms.createAnnouncement);
router.delete("/announcements/:id", comms.deleteAnnouncement);
router.get("/messages/threads", comms.threads);
router.get("/messages/:employeeId", comms.thread);
router.post("/messages/:employeeId", comms.send);

export default router;