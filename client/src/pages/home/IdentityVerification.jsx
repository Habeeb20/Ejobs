// components/identity-verification/VerificationHub.jsx
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  FileCheck2,
  Fingerprint,
  Landmark,
  IdCard,
  BookOpenCheck,
  Building2,
  ShieldCheck,
  ArrowUpRight,
  Loader2,
  Wallet,
} from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

// ── Design tokens ─────────────────────────────────────────────────────
const TOKENS = {
  primary: '#EA580C',      // orange-600: buttons, progress fill
  primarySoft: '#FED7AA',  // orange-200: progress track, pill
  orangeLight: '#FFF1E6',  // light orange header background
  orangeDark: '#C2410C',   // orange-700: text on light orange
  routeEmerald: '#12B886',
  signalAmber: '#F5A623',
  coral: '#F4694F',
  mist: '#EEF2F6',
};

const CHECKS = [
  { type: 'nin', label: 'NIN', fullName: 'National Identity Number', icon: Fingerprint, accent: TOKENS.routeEmerald, required: true },
  { type: 'bvn', label: 'BVN', fullName: 'Bank Verification Number', icon: Landmark, accent: TOKENS.signalAmber, required: true },
  { type: 'cac', label: 'CAC', fullName: 'Corporate Affairs Commission', icon: Building2, accent: TOKENS.coral, required: true },
  { type: 'votersCard', label: "Voter's Card", fullName: 'INEC Voter Registration', icon: IdCard, accent: TOKENS.coral, required: false },
  { type: 'driverLicense', label: "Driver's License", fullName: 'FRSC Driver Record', icon: FileCheck2, accent: TOKENS.routeEmerald, required: false },
  { type: 'passport', label: 'Int\u2019l Passport', fullName: 'NIS Passport Record', icon: BookOpenCheck, accent: TOKENS.signalAmber, required: false },
];

const REQUIRED_TYPES = CHECKS.filter((c) => c.required).map((c) => c.type);

const API_BASE = import.meta.env.VITE_BACKEND;

export default function VerificationHub() {
  const [status, setStatus] = useState(null);
  const [loadingType, setLoadingType] = useState(null);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    const controller = new AbortController();

    (async () => {
      try {
        const { data } = await axios.get(`${API_BASE}/api/identity-verification/status`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
          signal: controller.signal,
        });

        if (data.success) setStatus(data.identityVerification);
      } catch (err) {
        if (err.name !== 'CanceledError' && err.code !== 'ERR_CANCELED') {
          console.error(err);
          toast.error('Could not load your verification status.');
        }
      } finally {
        setFetching(false);
      }
    })();

    return () => controller.abort();
  }, []);

  const verifiedCount = CHECKS.filter((c) => status?.[c.type]?.verified).length;
  const requiredVerifiedCount = REQUIRED_TYPES.filter((t) => status?.[t]?.verified).length;
  const payoutUnlocked = requiredVerifiedCount === REQUIRED_TYPES.length;

  const handleVerify = async (type) => {
    setLoadingType(type);
    try {
      const { data } = await axios.post(
        `${API_BASE}/api/identity-verification/initiate`,
        { type },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        }
      );
      if (!data.success) throw new Error(data.message || 'Could not start verification.');
      window.location.href = data.redirectUrl;
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || err.message || 'Could not start verification.');
      setLoadingType(null);
    }
  };

  return (
    <div className="w-full">
      {/* Header + progress track */}
      <div
        className="rounded-2xl p-5 sm:p-6 mb-6 border border-orange-200"
        style={{ backgroundColor: TOKENS.orangeLight }}
      >
        <div className="flex items-center justify-between gap-4 mb-4">
          <div>
            <h2 className="text-slate-900 text-lg sm:text-xl font-semibold tracking-tight">
              Identity Verification
            </h2>
            <p className="text-slate-600 text-sm mt-0.5">
              Verify your identity to unlock full access to the platform.
            </p>
          </div>
          <div
            className="hidden sm:flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium"
            style={{ backgroundColor: TOKENS.primarySoft, color: TOKENS.orangeDark }}
          >
            <ShieldCheck size={16} />
            {verifiedCount} verified
          </div>
        </div>

        <div className="relative h-2 rounded-full overflow-hidden" style={{ backgroundColor: TOKENS.primarySoft }}>
          <motion.div
            className="h-full rounded-full"
            style={{ backgroundColor: TOKENS.primary }}
            initial={{ width: 0 }}
            animate={{ width: `${(verifiedCount / CHECKS.length) * 100}%` }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
          />
        </div>
        <div
          className="flex sm:hidden items-center gap-2 mt-3 text-sm font-medium"
          style={{ color: TOKENS.orangeDark }}
        >
          <ShieldCheck size={16} />
          {verifiedCount}/{CHECKS.length} verified
        </div>
      </div>

      {/* Payout requirement banner */}
      <div
        className="flex items-start sm:items-center gap-3 rounded-xl p-4 mb-6 border"
        style={
          payoutUnlocked
            ? { backgroundColor: `${TOKENS.routeEmerald}0D`, borderColor: `${TOKENS.routeEmerald}33` }
            : { backgroundColor: `${TOKENS.signalAmber}0D`, borderColor: `${TOKENS.signalAmber}40` }
        }
      >
        <div
          className="w-9 h-9 shrink-0 rounded-lg flex items-center justify-center"
          style={{
            backgroundColor: payoutUnlocked ? `${TOKENS.routeEmerald}1A` : `${TOKENS.signalAmber}1A`,
            color: payoutUnlocked ? TOKENS.routeEmerald : TOKENS.signalAmber,
          }}
        >
          <Wallet size={18} />
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-900">
            {payoutUnlocked
              ? 'You\u2019re eligible for direct payouts'
              : `NIN, BVN & CAC required for direct payouts (${requiredVerifiedCount}/${REQUIRED_TYPES.length} done)`}
          </p>
          <p className="text-xs text-slate-500 mt-0.5">
            {payoutUnlocked
              ? 'Your earnings will be paid directly to your account. Other checks below are optional and boost trust with buyers.'
              : 'Complete these three to receive your earnings directly to your bank account. Voter\u2019s Card, Driver\u2019s License, and Passport are optional.'}
          </p>
        </div>
      </div>

      {/* Check cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {CHECKS.map((check, i) => {
          const Icon = check.icon;
          const record = status?.[check.type];
          const isVerified = !!record?.verified;
          const isLoading = loadingType === check.type;

          return (
            <motion.div
              key={check.type}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05, duration: 0.35 }}
              className="relative rounded-xl border border-slate-200 bg-white p-5 flex flex-col justify-between shadow-sm hover:shadow-md transition-shadow"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: `${check.accent}1A`, color: check.accent }}
                  >
                    <Icon size={20} />
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span
                      className="text-xs font-semibold px-2 py-1 rounded-full"
                      style={
                        isVerified
                          ? { backgroundColor: `${TOKENS.routeEmerald}1A`, color: TOKENS.routeEmerald }
                          : { backgroundColor: '#F1F3F5', color: '#6B7280' }
                      }
                    >
                      {isVerified ? 'Verified' : 'Not verified'}
                    </span>
                    <span
                      className="text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wide"
                      style={
                        check.required
                          ? { backgroundColor: `${TOKENS.signalAmber}1A`, color: TOKENS.signalAmber }
                          : { backgroundColor: '#F1F3F5', color: '#9CA3AF' }
                      }
                    >
                      {check.required ? 'Required' : 'Optional'}
                    </span>
                  </div>
                </div>
                <h3 className="font-semibold text-slate-900">{check.label}</h3>
                <p className="text-sm text-slate-500 mt-0.5">{check.fullName}</p>
                {check.required && (
                  <p className="text-xs mt-1" style={{ color: TOKENS.signalAmber }}>
                    Needed for direct payouts
                  </p>
                )}
                {isVerified && record?.last4 && (
                  <p className="text-xs text-slate-400 mt-2">
                    On file: •••• {record.last4}
                    {record.matchedName ? ` — ${record.matchedName}` : ''}
                  </p>
                )}
              </div>

              <button
                onClick={() => handleVerify(check.type)}
                disabled={isVerified || isLoading || fetching}
                className="mt-4 inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:brightness-95 disabled:cursor-not-allowed"
                style={
                  isVerified
                    ? { backgroundColor: '#F1F3F5', color: '#9CA3AF' }
                    : { backgroundColor: TOKENS.primary, color: 'white' }
                }
              >
                {isLoading ? (
                  <>
                    <Loader2 size={15} className="animate-spin" /> Starting...
                  </>
                ) : isVerified ? (
                  'Verified'
                ) : (
                  <>
                    Verify now <ArrowUpRight size={15} />
                  </>
                )}
              </button>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}