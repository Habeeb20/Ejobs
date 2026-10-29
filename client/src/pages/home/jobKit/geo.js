import { useCallback, useEffect, useState } from "react";
import axios from "axios";

// Separate client: this API is public, so don't send the app's Bearer token to it
const geo = axios.create({ baseURL: "https://nigeria.jamiuadewaleyusuf.com/api/v1", timeout: 8000 });

/* ⚠ Parameter names for /geocode/search and /route weren't in the docs excerpt.
   Open those two endpoints in the docs and match the names here. If they're wrong,
   the browser console prints the server's message and the UI shows "approx." values. */
const SEARCH_PARAMS = (query) => ({ q: query });
const ROUTE_PARAMS = (a, b) => ({ from_lat: a.lat, from_lng: a.lng, to_lat: b.lat, to_lng: b.lng });

/* ---------- helpers ---------- */
const norm = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9]/g, "");

// Keeps at most 3 requests in flight so a page of jobs doesn't hammer the API
let active = 0;
const waiting = [];
const limited = (task) =>
  new Promise((resolve, reject) => {
    const run = () => {
      active++;
      task().then(resolve, reject).finally(() => {
        active--;
        waiting.shift()?.();
      });
    };
    active < 3 ? run() : waiting.push(run);
  });

const warned = new Set();
const warnOnce = (endpoint, err) => {
  if (warned.has(endpoint)) return;
  warned.add(endpoint);
  console.warn(`[geo] ${endpoint} failed`, err?.response?.status, err?.response?.data || err?.message);
};

// Nigeria's rough bounding box, which also catches swapped lat/lng
const pickCoords = (o) => {
  const c = o?.coordinates ?? o?.location ?? o;
  const lat = Number(c?.lat ?? c?.latitude);
  const lng = Number(c?.lng ?? c?.lon ?? c?.longitude);
  return Number.isFinite(lat) && Number.isFinite(lng) && lat >= 3.5 && lat <= 14.5 && lng >= 2.5 && lng <= 15
    ? { lat, lng }
    : null;
};

export const haversineKm = (a, b) => {
  const rad = (d) => (d * Math.PI) / 180;
  const h =
    Math.sin(rad(b.lat - a.lat) / 2) ** 2 +
    Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(rad(b.lng - a.lng) / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
};

const speedFor = (km) => (km <= 15 ? 22 : km <= 60 ? 38 : 60); // km/h: city traffic vs highway
const minutesFor = (km) => Math.max(1, Math.round((km / speedFor(km)) * 60));
const estimate = (straightKm) => {
  const km = straightKm * 1.3; // roads are longer than a straight line
  return { km, min: minutesFor(km), estimated: true };
};

/* ---------- destination: LGA centre from the docs, refined by city search ---------- */
const lgaCache = new Map();
const loadLgas = (state) => {
  if (!lgaCache.has(state)) {
    lgaCache.set(
      state,
      (async () => {
        // "FCT (Federal Capital Territory)" -> try the full label, "FCT", then the bracketed name
        const names = [state, state.replace(/\s*\(.*\)\s*/, ""), (state.match(/\((.*?)\)/) || [])[1]].filter(Boolean);
        for (const name of [...new Set(names)]) {
          try {
            const { data } = await limited(() => geo.get(`/states/${encodeURIComponent(name)}/lgas`));
            return data?.data || [];
          } catch { /* try the next spelling */ }
        }
        return [];
      })()
    );
  }
  return lgaCache.get(state);
};

const lgaCoords = async (job) => {
  const want = norm(job.localGovernment);
  if (!want || !job.state) return null;
  const lgas = await loadLgas(job.state);
  const hit =
    lgas.find((l) => norm(l.name) === want || norm(l.slug) === want) ||
    lgas.find((l) => norm(l.name).includes(want) || want.includes(norm(l.name)));
  return pickCoords(hit);
};

const destCache = new Map();
let searchFailures = 0;

const resolveDestination = (job) => {
  const key = `${norm(job.city)}|${norm(job.localGovernment)}|${norm(job.state)}`;
  if (!destCache.has(key)) {
    destCache.set(
      key,
      (async () => {
        const lga = await lgaCoords(job);
        if (job.city && searchFailures < 3) {
          try {
            const query = [job.city, job.localGovernment, job.state, "Nigeria"].filter(Boolean).join(", ");
            const { data } = await limited(() => geo.get("/geocode/search", { params: SEARCH_PARAMS(query) }));
            const d = data?.data;
            const point = pickCoords(Array.isArray(d) ? d[0] : d?.results?.[0] ?? d);
            // Ignore matches that landed far from the stated LGA
            if (point && (!lga || haversineKm(point, lga) <= 50)) return point;
          } catch (err) {
            if ([400, 422].includes(err?.response?.status)) searchFailures += 3;
            else if (!err?.response) searchFailures++;
            warnOnce("/geocode/search", err);
          }
        }
        return lga;
      })()
    );
  }
  return destCache.get(key);
};

/* ---------- road route (unit-tolerant parsing) ---------- */
const firstNumber = (v) => {
  if (typeof v === "number") return v;
  if (typeof v === "string") return parseFloat(v);
  if (v && typeof v === "object") {
    for (const x of Object.values(v)) {
      const n = firstNumber(x);
      if (Number.isFinite(n)) return n;
    }
  }
  return NaN;
};

// Works whether the API returns km or metres, minutes or seconds, by checking against the straight-line distance
const parseRoute = (payload, straightKm) => {
  const d = payload?.data ?? payload;
  const r = d?.route ?? d?.routes?.[0] ?? d;
  const rawKm = firstNumber(r?.distance_km ?? r?.distance ?? r?.distance_m);
  const rawMin = firstNumber(r?.duration_min ?? r?.duration ?? r?.duration_s);

  const okKm = (km) => Number.isFinite(km) && km >= straightKm * 0.8 - 0.2 && km <= straightKm * 5 + 2;
  const km = [rawKm, rawKm / 1000].find(okKm);
  if (km == null) return null;

  const okMin = (m) => Number.isFinite(m) && m > 0 && km / (m / 60) >= 8 && km / (m / 60) <= 130;
  const min = [rawMin, rawMin / 60].find(okMin);
  return { km, min: Math.max(1, Math.round(min ?? minutesFor(km))), estimated: false };
};

const driveCache = new Map();
let routeFailures = 0;

async function compute(job, origin) {
  const dest = await resolveDestination(job);
  if (!dest) return null;
  const straight = haversineKm(origin, dest);

  if (routeFailures < 3) {
    try {
      const { data } = await limited(() => geo.get("/route", { params: ROUTE_PARAMS(origin, dest) }));
      const parsed = parseRoute(data, straight);
      if (parsed) return parsed;
      routeFailures++;
      warnOnce("/route (unexpected response shape)", { message: JSON.stringify(data).slice(0, 300) });
    } catch (err) {
      if ([400, 422].includes(err?.response?.status)) routeFailures += 3;
      else routeFailures++;
      warnOnce("/route", err);
    }
  }
  return estimate(straight);
}

// -> { km, min, estimated } or null when the job's location can't be resolved
export function getDrive(job, origin) {
  const key = `${origin.lat.toFixed(3)},${origin.lng.toFixed(3)}|${norm(job.city)}|${norm(job.localGovernment)}|${norm(job.state)}`;
  if (!driveCache.has(key)) driveCache.set(key, compute(job, origin).catch(() => null));
  return driveCache.get(key);
}

/* ---------- hooks ---------- */
const SAVED = "ejob:origin";
const readSaved = () => {
  try { return JSON.parse(sessionStorage.getItem(SAVED)); } catch { return null; }
};

export function useUserLocation() {
  const [coords, setCoords] = useState(readSaved);
  const [status, setStatus] = useState(() => (readSaved() ? "ready" : "idle")); // idle | asking | ready | denied | error | unsupported

  const request = useCallback(() => {
    if (!("geolocation" in navigator)) return setStatus("unsupported");
    setStatus("asking");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const c = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        try { sessionStorage.setItem(SAVED, JSON.stringify(c)); } catch { /* private mode */ }
        setCoords(c);
        setStatus("ready");
      },
      (err) => setStatus(err.code === 1 ? "denied" : "error"),
      { timeout: 10000, maximumAge: 5 * 60 * 1000 }
    );
  }, []);

  useEffect(() => {
    if (!coords) request();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return { coords, status, request };
}

// undefined = still calculating, null = not available, object = { km, min, estimated }
export function useDrive(job, origin) {
  const [info, setInfo] = useState(undefined);
  useEffect(() => {
    if (!origin || !job) return;
    let live = true;
    setInfo(undefined);
    getDrive(job, origin).then((r) => live && setInfo(r));
    return () => { live = false; };
  }, [job?._id, origin?.lat, origin?.lng]); // eslint-disable-line react-hooks/exhaustive-deps
  return origin && job ? info : null;
}