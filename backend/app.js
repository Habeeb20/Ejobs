import express from "express"

import cors from "cors";
import dotenv from "dotenv";
import morgan from "morgan";
import { connectDB } from "./db.js";
import userRouter from "./routes/user.routes.js"
import swaggerUi from "swagger-ui-express";
import swaggerSpec from "./config/swagger.js";
import { Server } from "socket.io";
import { setIO } from "./utils/notify.js";
import { initSocket } from "./socket.js";
import { startExpiryJob } from "./utils/expireJobs.js";
import jobRoutes from "./routes/job.routes.js"
import http from "http"
import User from "./models/User.js";
import adminRoutes from "./routes/admin.routes.js"
import benefitRoutes from "./routes/benefit.routes.js"
import overviewRoutes from "./routes/overview.routes.js"
import adsRoutes from "./routes/ads.routes.js"
import { startAttendanceWatcher } from "./utils/attendanceWatcher.js";
import searchRoutes from "./routes/search.routes.js"
import statsRoutes from "./routes/stats.routes.js"
import analyticsRoutes from "./routes/analytics.routes.js"
import blacklistRoutes from "./routes/blacklist.routes.js";
import engagementRoutes from "./routes/engagement.routes.js";
import employerRoutes from "./routes/employer.routes.js";
dotenv.config();
connectDB()
startAttendanceWatcher();
const app = express()
const server = http.createServer(app)
initSocket(server)
startExpiryJob()
app.use((req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  res.set('Surrogate-Control', 'no-store');
  next();
});


app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true,
}));
app.use(morgan("dev"));

///routes
app.get("/", (req, res) => {
  res.send("ejobs backend is listening on port....");
});

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.use("/api/admin", adminRoutes)
app.use("/api/users", userRouter)
app.use("/api/jobs", jobRoutes)
app.use("/api/benefits", benefitRoutes);
app.use("/api/overview", overviewRoutes);
app.use("/api/ads", adsRoutes)
app.use("/api/search", searchRoutes)
app.use("/api/stats", statsRoutes)
app.use("/api/analytics", analyticsRoutes)
app.use("/api/employers", employerRoutes);
app.use("/api/blacklist", blacklistRoutes);
app.use("/api/engagement", engagementRoutes);

// await User.create({
//   firstName: 'Ejob',
//   lastName: 'Admin',
//   email: 'essentialng23@gmail.com',
//   password: 'Essential01',
//   role: 'superadmin'
// });

// console.log('Superadmin created!');


// Start server
const port = process.env.PORT || 2000;

server.listen(port, async () => {
  console.log(`Server is running on port ${port}`);

})


























































/*
  In your server file:
    import engagementRoutes from "./routes/engagementRoutes.js";
    app.use("/api/engage", engagementRoutes);   // same prefix style as your /api/jobs routes

  In your Paystack webhook, next to the call to settlePayment, add:
    import { settleExtraPayment } from "../utils/engagementPayments.js";
    if (/^EJ[BPA]-/.test(reference)) await settleExtraPayment(reference);
  (boost = EJB-, physical interview = EJP-, account boost = EJA-; your existing job payments start with "EJ-")
*/




