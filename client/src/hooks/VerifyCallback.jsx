// pages/VerifyCallback.jsx
// Mount this at the exact route you pass as `redirect_url` when building
// the hosted verification URL, e.g. in main.jsx:
//   <Route path="/verify/callback" element={<VerifyCallback />} />
import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle2, XCircle, Loader2, ArrowRight } from 'lucide-react';

const TOKENS = {
  midnight: '#0E1A2B',
  routeEmerald: '#12B886',
  coral: '#F4694F',
};

const TYPE_LABELS = {
  nin: 'NIN',
  bvn: 'BVN',
  votersCard: "Voter's Card",
  driverLicense: "Driver's License",
  passport: "International Passport",
  cac: 'CAC',
};


const API_BASE = import.meta.env.VITE_BACKEND_URL;

export default function VerifyCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [state, setState] = useState('confirming'); // confirming | success | failed | error
  const [result, setResult] = useState(null);




useEffect(() => {
  const controller = new AbortController();

  const outcome = searchParams.get('outcome');
  const reference = searchParams.get('reference');
  const session_id = searchParams.get('session_id');
  const verified_at = searchParams.get('verified_at');
  const sig = searchParams.get('sig');

  if (!reference || !sig) {
    setState('error');
    return () => controller.abort();
  }

  (async () => {
    try {
      const url = new URL(`${API_BASE}/api/identity-verification/confirm`);
      
      // Append all params to query string
      if (outcome) url.searchParams.append('outcome', outcome);
      if (reference) url.searchParams.append('reference', reference);
      if (session_id) url.searchParams.append('session_id', session_id);
      if (verified_at) url.searchParams.append('verified_at', verified_at);
      if (sig) url.searchParams.append('sig', sig);

      const res = await fetch(url.toString(), {
        method: 'GET',                    // Must be GET
        headers: { 
          Authorization: `Bearer ${localStorage.getItem('token')}` 
        },
        signal: controller.signal,
      });

      const data = await res.json();
console.log(data)
      if (!data.success) {
        setState('error');
        return;
      }

      setResult(data);
      setState(data.verified ? 'success' : 'failed');
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.error(err);
        setState('error');
      }
    }
  })();

  return () => controller.abort();
}, [searchParams]);
  const typeLabel = result?.type ? TYPE_LABELS[result.type] : 'identity document';

  return (
    <div className="w-full min-h-[70vh] flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm"
      >
        {state === 'confirming' && (
          <>
            <Loader2 size={40} className="mx-auto animate-spin" style={{ color: TOKENS.midnight }} />
            <h2 className="mt-4 text-lg font-semibold text-slate-900">Confirming your verification</h2>
            <p className="mt-1 text-sm text-slate-500">This only takes a moment. Don't close this page.</p>
          </>
        )}

        {state === 'success' && (
          <>
            <motion.div
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 260, damping: 18 }}
            >
              <CheckCircle2 size={48} className="mx-auto" style={{ color: TOKENS.routeEmerald }} />
            </motion.div>
            <h2 className="mt-4 text-lg font-semibold text-slate-900">
              {typeLabel} verified
            </h2>
            {result?.matchedName && (
              <p className="mt-1 text-sm text-slate-500">Matched to {result.matchedName}</p>
            )}
            {result?.last4 && (
              <p className="mt-1 text-xs text-slate-400">On file: •••• {result.last4}</p>
            )}
            <button
              onClick={() => navigate('/dashboard/?tab=verify')}
              className="mt-6 inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium text-white"
              style={{ backgroundColor: TOKENS.midnight }}
            >
              Back to verification <ArrowRight size={15} />
            </button>
          </>
        )}

        {state === 'failed' && (
          <>
            <XCircle size={48} className="mx-auto" style={{ color: TOKENS.coral }} />
            <h2 className="mt-4 text-lg font-semibold text-slate-900">Verification wasn't completed</h2>
            <p className="mt-1 text-sm text-slate-500">
              The {typeLabel} check didn't go through. You can try again.
            </p>
            <button
              onClick={() => navigate('/dashboard/verification')}
              className="mt-6 inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium text-white"
              style={{ backgroundColor: TOKENS.midnight }}
            >
              Try again <ArrowRight size={15} />
            </button>
          </>
        )}

        {state === 'error' && (
          <>
            <XCircle size={48} className="mx-auto" style={{ color: TOKENS.coral }} />
            <h2 className="mt-4 text-lg font-semibold text-slate-900">Something went wrong</h2>
            <p className="mt-1 text-sm text-slate-500">
              We couldn't confirm this verification. If money or data was involved, no changes were saved.
            </p>
            <button
              onClick={() => navigate('/dashboard/verification')}
              className="mt-6 inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium text-white"
              style={{ backgroundColor: TOKENS.midnight }}
            >
              Back to dashboard <ArrowRight size={15} />
            </button>
          </>
        )}
      </motion.div>
    </div>
  );
}