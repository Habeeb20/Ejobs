import { useEffect, useState } from "react";
import { ArrowLeft, MailCheck } from "lucide-react";
import OtpInput from "../../components/OtpInput";
import { Button } from "../../components/ui";

export default function StepVerify({ email, onVerify, onResend, onBack, loading, error, setError }) {
  const [code, setCode] = useState("");
  const [seconds, setSeconds] = useState(60);
  const [resending, setResending] = useState(false);

  useEffect(() => {
    if (seconds <= 0) return;
    const t = setTimeout(() => setSeconds((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [seconds]);

  const change = (v) => {
    setCode(v);
    if (error) setError("");
  };

  const submit = (e) => {
    e.preventDefault();
    if (code.length === 4) onVerify(code);
  };

  const resend = async () => {
    setResending(true);
    const ok = await onResend();
    setResending(false);
    if (ok) { setSeconds(60); setCode(""); }
  };

  return (
    <form onSubmit={submit} className="space-y-6">
      <button type="button" onClick={onBack} className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-500 hover:text-ink-900">
        <ArrowLeft className="h-4 w-4" /> Edit details
      </button>

      <div>
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary-100 text-primary-600">
          <MailCheck className="h-6 w-6" />
        </div>
        <h2 className="font-display text-3xl font-bold">Check your email</h2>
        <p className="mt-1 text-ink-500">
          We sent a 4-digit code to <span className="font-semibold text-ink-900">{email}</span>. It expires in 10 minutes.
        </p>
      </div>

      <div>
        <OtpInput value={code} onChange={change} error={!!error} />
        {error && <p className="mt-3 text-center text-sm text-danger" role="alert">{error}</p>}
      </div>

      <Button type="submit" loading={loading} disabled={code.length !== 4}>Verify email</Button>

      <p className="text-center text-sm text-ink-500">
        Did not get it?{" "}
        {seconds > 0 ? (
          <span>Resend in {seconds}s</span>
        ) : (
          <button type="button" onClick={resend} disabled={resending} className="font-semibold text-primary-600 hover:text-primary-700 disabled:opacity-60">
            {resending ? "Sending..." : "Send a new code"}
          </button>
        )}
      </p>
    </form>
  );
}
