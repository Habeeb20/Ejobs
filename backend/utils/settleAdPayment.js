import Ad from "../models/Ads.js";
import AdPayment from "../models/AdPayment.js";
import { verifyTransaction } from "./paystack.js";
import { notifyReviewers } from "./adReview.js";

const httpError = (status, message) => Object.assign(new Error(message), { status });

/**
 * Verifies an ad payment with Paystack and moves the ad to Pending.
 * @param {string} reference  Paystack reference (starts with "AD-")
 * @param {*} ownerId         Pass req.user._id from the confirm endpoint so users can only
 *                            settle their own payments. Leave empty for the webhook.
 */
export const settleAdPayment = async (reference, ownerId) => {
  if (!reference) throw httpError(400, "Payment reference is required");

  const filter = { reference };
  if (ownerId) filter.owner = ownerId;
  const payment = await AdPayment.findOne(filter);
  if (!payment) throw httpError(404, "Payment not found");

  // Already settled: return the ad as it is
  if (payment.status === "Success") {
    const ad = await Ad.findById(payment.ad);
    if (!ad) throw httpError(404, "Ad not found");
    return ad;
  }

  const tx = await verifyTransaction(reference);
  if (tx.status !== "success") {
    if (["failed", "abandoned", "reversed"].includes(tx.status)) {
      await AdPayment.updateOne(
        { _id: payment._id, status: "Pending" },
        { $set: { status: "Failed", gatewayResponse: tx.gateway_response || tx.status } }
      );
    }
    throw httpError(400, "Payment hasn't been completed yet");
  }
  if (tx.currency !== "NGN" || Number(tx.amount) !== Math.round(payment.amount * 100)) {
    throw httpError(400, "Payment amount doesn't match this ad");
  }

  // Atomic claim: only one caller (confirm or webhook) gets past this
  const claimed = await AdPayment.findOneAndUpdate(
    { _id: payment._id, status: { $ne: "Success" } },
    { $set: { status: "Success", paidAt: new Date(), gatewayResponse: tx.gateway_response || "" } },
    { new: true }
  );
  if (!claimed) {
    const ad = await Ad.findById(payment.ad);
    if (!ad) throw httpError(404, "Ad not found");
    return ad;
  }

  // Draft or Rejected ads go to review
  let ad = await Ad.findOneAndUpdate(
    { _id: payment.ad, status: { $in: ["Draft", "Rejected"] } },
    {
      $set: {
        paymentStatus: "Paid",
        paymentReference: reference,
        status: "Pending",
        submittedAt: new Date(),
        rejectionReason: "",
      },
    },
    { new: true }
  );

  if (ad) {
    notifyReviewers(ad).catch((e) => console.error("notifyReviewers:", e));
  } else {
    // The ad moved on in the meantime (e.g. deleted or already submitted). Record the payment anyway.
    ad = await Ad.findByIdAndUpdate(
      payment.ad,
      { $set: { paymentStatus: "Paid", paymentReference: reference } },
      { new: true }
    );
    if (!ad) throw httpError(404, "Ad not found");
  }
  return ad;
};