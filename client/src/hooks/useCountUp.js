import { useEffect, useState } from "react";

// Counts up from 0 to the target once, and skips the animation for people who prefer reduced motion
export default function useCountUp(target, run) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!run) return undefined;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches || target === 0) {
      setValue(target);
      return undefined;
    }
    let raf;
    const start = performance.now();
    const duration = 1200;
    const tick = (now) => {
      const p = Math.min(1, (now - start) / duration);
      setValue(Math.round(target * (1 - Math.pow(1 - p, 3)))); // ease-out
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, run]);

  return value;
}