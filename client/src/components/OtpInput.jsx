import { useRef } from "react";

export default function OtpInput({ value, onChange, error, length = 4 }) {
  const refs = useRef([]);
  const digits = Array.from({ length }, (_, i) => value[i] || "");

  const setAt = (i, d) => {
    const next = digits.slice();
    next[i] = d;
    onChange(next.join(""));
  };

  const handleChange = (i, e) => {
    const d = e.target.value.replace(/\D/g, "").slice(-1);
    setAt(i, d);
    if (d && i < length - 1) refs.current[i + 1]?.focus();
  };

  const handleKeyDown = (i, e) => {
    if (e.key === "Backspace" && !digits[i] && i > 0) refs.current[i - 1]?.focus();
    if (e.key === "ArrowLeft" && i > 0) refs.current[i - 1]?.focus();
    if (e.key === "ArrowRight" && i < length - 1) refs.current[i + 1]?.focus();
  };

  const handlePaste = (e) => {
    const text = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, length);
    if (!text) return;
    e.preventDefault();
    onChange(text);
    refs.current[Math.min(text.length, length - 1)]?.focus();
  };

  return (
    <div className={`flex justify-center gap-3 ${error ? "animate-shake" : ""}`} onPaste={handlePaste}>
      {digits.map((d, i) => (
        <input
          key={i}
          ref={(el) => (refs.current[i] = el)}
          value={d}
          onChange={(e) => handleChange(i, e)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          inputMode="numeric"
          autoComplete={i === 0 ? "one-time-code" : "off"}
          autoFocus={i === 0}
          maxLength={1}
          aria-label={`Digit ${i + 1}`}
          className={`h-16 w-14 rounded-xl border bg-white text-center font-display text-3xl font-bold text-ink-900 outline-none transition focus:border-primary-500 focus:ring-4 focus:ring-primary-100 ${error ? "border-danger" : d ? "border-primary-300" : "border-ink-200"}`}
        />
      ))}
    </div>
  );
}
