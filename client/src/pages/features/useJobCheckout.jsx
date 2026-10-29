import { useState, useCallback } from "react";
import PaystackPop from "@paystack/inline-js";
import { toast } from "sonner";
import { jobsApi, getError } from "../../api";
import { errText } from "./jobUi";

/**
 * checkout(job)            -> submit a draft (free plans) or pay then submit (paid plans)
 * checkout(job, "renew")   -> pay to extend a Standard/Premium job
 * Resolves true when it worked, false otherwise. Shows its own toasts.
 */
export default function useJobCheckout(onDone) {
  const [busy, setBusy] = useState(false);

  const checkout = useCallback(async (job, purpose = "post") => {
    setBusy(true);
    try {
      const alreadyCovered = purpose === "post" && (job.plan.price === 0 || job.paymentStatus === "Paid");
      if (alreadyCovered) {
        await jobsApi.submit(job._id);
        toast.success("Submitted. A super admin will review it shortly.");
        onDone?.();
        return true;
      }

      const { data } = await jobsApi.pay(job._id, purpose);
      const reference = await new Promise((resolve, reject) => {
        new PaystackPop().resumeTransaction(data.accessCode, {
          onSuccess: (tx) => resolve(tx.reference),
          onCancel: () => reject(new Error("cancelled")),
          onError: (e) => reject(new Error(e?.message || "Payment failed")),
        });
      });

      const id = toast.loading("Confirming your payment…");
      try {
        await jobsApi.confirm(job._id, reference);
      } catch (err) {
        // The webhook will still apply the payment, so the job isn't lost
        toast.error(errText(err, getError), { id });
        return false;
      }
      toast.success(purpose === "renew" ? "Job renewed" : "Payment received. Awaiting approval.", { id });
      onDone?.();
      return true;
    } catch (err) {
      if (err.message === "cancelled") toast.info("Payment cancelled. Your job is saved as a draft.");
      else toast.error(errText(err, getError));
      return false;
    } finally {
      setBusy(false);
    }
  }, [onDone]);

  return { checkout, busy };
}