import express, { Router } from "express";
import crypto from "crypto";
import { settlePayment } from "../utils/settlePayment.js";

const router = Router();

// Paystack calls this when a payment succeeds, even if the employer closed the page.
// IMPORTANT: mount this BEFORE express.json() in server.js, because the signature
// is checked against the raw request body.
router.post("/paystack", express.raw({ type: "application/json" }), async (req, res) => {
  const signature = req.get("x-paystack-signature") || "";
  const hash = crypto.createHmac("sha512", process.env.PAYSTACK_SECRET_KEY).update(req.body).digest("hex");
  const ok = hash.length === signature.length && crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(signature));
  if (!ok) return res.sendStatus(401);

  res.sendStatus(200); // acknowledge fast; Paystack retries if we're slow
  try {
    const event = JSON.parse(req.body.toString());
    if (event.event === "charge.success") await settlePayment(event.data.reference);
  } catch (err) {
    console.error("paystack webhook:", err.message);
  }
});

export default router;