// Needs Node 18+ (global fetch) and PAYSTACK_SECRET_KEY in .env
import dotenv from "dotenv"

dotenv.config()

const BASE = "https://api.paystack.co";
const headers = () => ({
  Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
  "Content-Type": "application/json",
});

export const initTransaction = async ({ email, amount, reference, metadata }) => {
  const res = await fetch(`${BASE}/transaction/initialize`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ email, amount: amount * 100, reference, metadata, currency: "NGN" }),
  });

console.log(process.env.PAYSTACK_SECRET_KEY)
  const json = await res.json();
  if (!json.status) throw new Error(json.message || "Could not start payment");
  return json.data; // { authorization_url, access_code, reference }
};

export const verifyTransaction = async (reference) => {
  const res = await fetch(`${BASE}/transaction/verify/${encodeURIComponent(reference)}`, {
    headers: headers(),
  });
  const json = await res.json();
  if (!json.status) throw new Error(json.message || "Could not verify payment");
  return json.data; // { status, amount (kobo), metadata, ... }
};