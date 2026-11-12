// utils/verifyNgClient.js
//
// Thin service layer around the VerifyNG hosted KYC flow.
// Nothing here touches Express req/res — controllers own that.
//
// ⚠️ ASSUMPTIONS (confirm these against VerifyNG's actual docs and adjust):
//   1. Signature is HMAC-SHA256 over `${reference}.${outcome}.${session_id}.${verified_at}`
//      using VERIFYNG_API_SECRET, hex-encoded, sent back as `sig`.
//   2. Session lookup is GET /verifications/session/:id with the api secret sent
//      as a Bearer token.
//   3. Query params on callback are: outcome, reference, session_id, verified_at, sig.
// If VerifyNG's real spec differs (different param names, different signed
// string, different auth header), only this file needs to change — everything
// downstream consumes the functions below, not the raw HTTP details.

import crypto from 'crypto';

const VERIFYNG_BASE_URL = 'https://kyc.edirect.ng';
const HOSTED_VERIFY_PATH = '/verify/hosted';
const SESSION_LOOKUP_PATH = '/verifications/session';

const CLIENT_KEY = process.env.VERIFYNG_CLIENT_KEY;
const API_SECRET = process.env.VERIFYNG_API_SECRET;

if (!CLIENT_KEY || !API_SECRET) {
  // Fail loud at boot rather than silently sending broken redirect URLs.
  console.warn(
    '[verifyNgClient] VERIFYNG_CLIENT_KEY / VERIFYNG_API_SECRET missing from env.'
  );
}

// Maps the friendly type names your frontend/schema use to whatever
// VerifyNG expects in `checks[]`. Adjust the right-hand values to match
// VerifyNG's actual check identifiers.
export const CHECK_TYPE_MAP = {
  nin: 'nin',
  bvn: 'bvn',
  votersCard: 'voters_card',
  driverLicense: 'drivers_license',
  passport: 'passport',
  cac: 'cac',
};

/**
 * Builds the URL to send the user's browser to in order to start a
 * hosted verification session.
 *
 * @param {Object} params
 * @param {string} params.type - one of the keys in CHECK_TYPE_MAP
 * @param {string} params.reference - unique reference we can trace back
 *   to a user + check type on callback (see buildReference below)
 * @param {string} params.redirectUrl - full URL on YOUR frontend that
 *   VerifyNG should redirect the browser back to once done
 */
export function buildHostedVerificationUrl({ type, reference, redirectUrl }) {
  const check = CHECK_TYPE_MAP[type];
  if (!check) {
    throw new Error(`Unsupported verification type: ${type}`);
  }

  const url = new URL(HOSTED_VERIFY_PATH, VERIFYNG_BASE_URL);
  url.searchParams.set('client_key', CLIENT_KEY);
  url.searchParams.append('checks[]', check);
  url.searchParams.set('reference', reference);
  url.searchParams.set('redirect_url', redirectUrl);

  return url.toString();
}

/**
 * Encodes userId + type + a random nonce into a single opaque reference
 * string so the callback handler can identify who this session belongs
 * to without a database lookup, while still being unguessable.
 */
export function buildReference({ userId, type }) {
  const nonce = crypto.randomBytes(6).toString('hex');
  return `${userId}.${type}.${Date.now()}.${nonce}`;
}

export function parseReference(reference) {
  const [userId, type, timestamp, nonce] = String(reference).split('.');
  return { userId, type, timestamp: Number(timestamp), nonce };
}

/**
 * Verifies the HMAC signature VerifyNG attaches to the callback so we
 * never trust an outcome that didn't actually come from VerifyNG.
 */
export function verifyCallbackSignature({ reference, outcome, session_id, verified_at, sig }) {
  if (!sig) return false;

  const signedString = `${reference}.${outcome}.${session_id}.${verified_at || ''}`;
  const expected = crypto
    .createHmac('sha256', API_SECRET)
    .update(signedString)
    .digest('hex');

  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(sig));
  } catch {
    // Length mismatch etc. — treat as invalid rather than throwing.
    return false;
  }
}

/**
 * Pulls the full verification record (matched name, document number,
 * photo, etc.) for a completed session.
 */
export async function fetchVerificationSession(sessionId) {

  try {
     const res = await fetch(`${VERIFYNG_BASE_URL}${SESSION_LOOKUP_PATH}/${sessionId}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${API_SECRET}`,
      Accept: 'application/json',
    },
  });
  } catch (error) {
    console.log(error)
        const body = await res.text().catch(() => '');
    throw new Error(`VerifyNG session lookup failed (${res.status}): ${body}`);
  return res.json();
  }
 



 
}