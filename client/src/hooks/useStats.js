import { useEffect, useState } from "react";
import { statsApi } from "../api";

// The API may wrap a number in an object ({ count: 5 }, { total: 5 }, [{ count: 5 }] ...).
// Turn every stat into a plain number so the UI never receives an object.
const toCount = (v) => {
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  if (typeof v === "string") {
    const n = Number(v.replace(/,/g, ""));
    return Number.isFinite(n) ? n : 0;
  }
  if (Array.isArray(v)) return toCount(v[0]);
  if (v && typeof v === "object") {
    for (const key of ["count", "total", "value", "current", "number"]) {
      if (key in v) return toCount(v[key]);
    }
  }
  return null; // unknown shape
};

const normalizeStats = (raw = {}) =>
  Object.fromEntries(
    Object.entries(raw).map(([key, value]) => {
      const n = toCount(value);
      if (n === null && import.meta.env.DEV) console.warn(`[stats] unexpected shape for "${key}":`, value);
      return [key, n ?? 0];
    })
  );

// One shared request: the Hero and the stats grid are on the same page,
// so they reuse the same result instead of calling the API twice.
const TTL = 60 * 1000;
let cache = null; // { stats, at }
let inflight = null;

const load = () => {
  if (cache && Date.now() - cache.at < TTL) return Promise.resolve(cache.stats);
  if (!inflight) {
    inflight = statsApi
      .overview()
      .then((res) => {
        if (import.meta.env.DEV) console.debug("[stats] raw response:", res);
        // works whether or not your api layer already unwraps the axios response
        const body = res?.data ?? res;
        const raw = body?.stats ?? body?.data?.stats ?? {};
        if (!Object.keys(raw).length && import.meta.env.DEV) console.warn("[stats] no stats found in the response");
        const stats = normalizeStats(raw);
        cache = { stats, at: Date.now() };
        return stats;
      })
      .finally(() => {
        inflight = null;
      });
  }
  return inflight;
};

export default function useStats() {
  const [stats, setStats] = useState(cache?.stats ?? null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    load()
      .then((s) => alive && setStats(s))
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, []);

  return { stats, failed };
}