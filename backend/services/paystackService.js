// backend/services/paystackService.js
// Thin wrapper around the Paystack REST API. Needs PAYSTACK_SECRET_KEY in your environment (Node 18+ for fetch).
import crypto from "crypto";
import { httpError } from "./recruitmentService.js";

const API = "https://api.paystack.co";
const secret = () => process.env.PAYSTACK_SECRET_KEY || "";

export const paystackEnabled = () => Boolean(secret());

async function call(path, options = {}) {
  if (!paystackEnabled()) throw httpError(503, "Online payment is not available right now. Please pay by bank transfer.");
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 20000);
  try {
    const res = await fetch(`${API}${path}`, {
      ...options,
      signal: ctrl.signal,
      headers: { Authorization: `Bearer ${secret()}`, "Content-Type": "application/json", ...(options.headers || {}) },
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok || body.status === false) {
      console.error("[paystack]", path, res.status, body.message);
      throw httpError(502, body.message || "Paystack could not process this request. Please try again.");
    }
    return body.data;
  } catch (e) {
    if (e.status) throw e;
    console.error("[paystack] request failed:", e.message);
    throw httpError(502, "We could not reach Paystack. Please try again in a moment.");
  } finally {
    clearTimeout(timer);
  }
}

/** Unique, Paystack-safe reference (letters, digits, - . =). */
export const newReference = () => `RCP-${Date.now().toString(36)}-${crypto.randomBytes(5).toString("hex")}`.toUpperCase();

/** Creates a transaction on Paystack. The amount is always taken from our database, never from the browser. */
export async function initializeTransaction({ email, amountNaira, reference, metadata, currency = "NGN" }) {
  return call("/transaction/initialize", {
    method: "POST",
    body: JSON.stringify({
      email,
      amount: Math.round(amountNaira * 100), // kobo
      currency,
      reference,
      metadata,
    }),
  }); // -> { authorization_url, access_code, reference }
}

export async function verifyTransaction(reference) {
  return call(`/transaction/verify/${encodeURIComponent(reference)}`, { method: "GET" });
}

/** Paystack signs the raw request body with your secret key (HMAC SHA512) in x-paystack-signature. */
export function validSignature(rawBody, signature) {
  if (!paystackEnabled() || !rawBody || !signature) return false;
  const hash = crypto.createHmac("sha512", secret()).update(rawBody).digest("hex");
  const a = Buffer.from(hash);
  const b = Buffer.from(String(signature));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}