import { useCallback, useState } from "react";
import PaystackPop from "@paystack/inline-js";
import { toast } from "sonner";
import { adsApi, getError } from "../../api";
import { errText } from "./adUi";

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// Opens the Paystack popup and resolves with the reference, or null if the user closed it
const openPopup = (accessCode) =>
  new Promise((resolve) => {
    const popup = new PaystackPop();
    popup.resumeTransaction(accessCode, {
      onSuccess: (tx) => resolve(tx?.reference || true),
      onCancel: () => resolve(null),
      onError: () => resolve(null),
    });
  });

// Verifies with the server. Retries briefly in case Paystack hasn't finished processing.
const confirmWithRetry = async (adId, reference) => {
  let lastErr;
  for (let i = 0; i < 4; i++) {
    try {
      const { data } = await adsApi.confirm(adId, reference);
      return data.ad;
    } catch (err) {
      lastErr = err;
      if (err?.response?.status !== 400) break; // only retry "not completed yet"
      await wait(2000);
    }
  }
  throw lastErr;
};

/**
 * checkout(ad):
 *   - already paid (e.g. a rejected ad that was edited): sends it for review again, no payment
 *   - unpaid: starts the payment, opens Paystack, verifies, and the ad moves to review
 * Returns the updated ad, or null if the user closed the payment window.
 */
export default function useAdCheckout() {
  const [paying, setPaying] = useState(false);

  const checkout = useCallback(async (ad) => {
    setPaying(true);
    try {
      if (ad.paymentStatus === "Paid") {
        const { data } = await adsApi.submit(ad._id);
        toast.success("Sent for review. We'll tell you when it's decided.");
        return data.ad;
      }

      const { data: init } = await adsApi.pay(ad._id);
      const reference = await openPopup(init.accessCode);
      if (!reference) {
        toast.info("Payment cancelled. Your ad is saved as a draft.");
        return null;
      }

      const updated = await confirmWithRetry(ad._id, init.reference);
      toast.success("Payment received. Your ad is now waiting for review.");
      return updated;
    } catch (err) {
      toast.error(errText(err, getError));
      return null;
    } finally {
      setPaying(false);
    }
  }, []);

  return { checkout, paying };
}