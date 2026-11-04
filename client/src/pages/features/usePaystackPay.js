import { useCallback, useState } from "react";
import PaystackPop from "@paystack/inline-js"; // npm i @paystack/inline-js (you already use it in useJobCheckout)
import { toast } from "sonner";
import { getError } from "../../api";

/**
 * pay({ start, confirm, onDone })
 *   start()      -> API call that returns { data: { accessCode, reference } }
 *   confirm(ref) -> API call that verifies the payment on the server
 *   onDone(res)  -> runs after the server confirmed it
 */
export default function usePaystackPay() {
  const [busy, setBusy] = useState(false);

  const pay = useCallback(async ({ start, confirm, onDone }) => {
    setBusy(true);
    try {
      const { data } = await start();
      const result = await new Promise((resolve, reject) => {
        new PaystackPop().resumeTransaction(data.accessCode, {
          onSuccess: async () => {
            try { resolve(await confirm(data.reference)); } catch (err) { reject(err); }
          },
          onCancel: () => reject(Object.assign(new Error("cancelled"), { cancelled: true })),
          onError: (err) => reject(err),
        });
      });
      onDone?.(result?.data);
    } catch (err) {
      if (err?.cancelled) toast.info("Payment cancelled");
      else toast.error(getError(err));
    } finally {
      setBusy(false);
    }
  }, []);

  return { pay, busy };
}