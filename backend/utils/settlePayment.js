import Job from "../models/Job.js";
import JobPayment from "../models/JobPayment.js";
import { getPlan } from "../config/plans.js";
import { verifyTransaction } from "./paystack.js";

const httpError = (status, message) => Object.assign(new Error(message), { status });

/**
 * Verifies a Paystack payment and applies it to the job exactly once.
 * Safe to call repeatedly (confirm button, webhook, retries): the Pending -> Success
 * flip is atomic, so only one caller ever changes the job.
 * Pass employerId to make sure the payment belongs to that employer.
 */
export async function settlePayment(reference, employerId = null) {
  const payment = await JobPayment.findOne(employerId ? { reference, employer: employerId } : { reference });
  if (!payment) throw httpError(404, "Payment not found");

  const job = await Job.findById(payment.job);
  if (!job) throw httpError(404, "Job not found");
  if (payment.status === "Success") return job;

  const tx = await verifyTransaction(reference);
  const valid =
    tx.status === "success" &&
    tx.amount === payment.amount * 100 &&
    String(tx.metadata?.jobId) === String(payment.job);
  if (!valid)
    throw httpError(400, `We couldn't confirm this payment yet. If you were charged, contact support with reference ${reference}.`);

  const claimed = await JobPayment.findOneAndUpdate(
    { reference, status: "Pending" },
    { status: "Success", paidAt: new Date() }
  );
  if (claimed) {
    const plan = getPlan(job.jobType);
    const now = new Date();
    job.paymentReference = reference;
    if (payment.purpose === "post") {
      job.paymentStatus = "Paid";
      job.status = "Awaiting Approval";
      job.submittedAt = now;
    } else {
      // Renewal extends from the current expiry if still live, otherwise from now
      const base = job.expiryDate && job.expiryDate > now ? job.expiryDate : now;
      job.expiryDate = new Date(base.getTime() + plan.durationMs);
      job.status = "Online";
      job.renewCount += 1;
      job.lastRenewedAt = now;
    }
    await job.save();
  }
  return Job.findById(payment.job);
}