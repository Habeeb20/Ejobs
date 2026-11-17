import { useEffect, useState } from "react";

const API_URL = "https://backend-efixit.ereligion.ng/api/provider/providers";
const SITE_URL = "https://efixit.ng";
const COUNT = 6;

// Cloudinary thumbnails: small, square, auto format
const thumb = (url, size = 240) =>
  url && url.includes("res.cloudinary.com") && url.includes("/upload/")
    ? url.replace("/upload/", `/upload/w_${size},h_${size},c_fill,g_auto,f_auto,q_auto/`)
    : url;

const humanize = (s = "") => {
  const t = s.replace(/[-_]/g, " ").trim();
  return t ? t[0].toUpperCase() + t.slice(1) : "";
};

const nameOf = (p) =>
  p.providerProfile?.businessName?.trim() ||
  [p.firstName, p.lastName].filter(Boolean).join(" ") ||
  "Service provider";

const initialsOf = (name) =>
  name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");

// Prefer complete profiles (photo, business name, service type), then fill from the rest
const pickProviders = (list) => {
  const usable = list.filter((p) => p.email && p.isActive !== false && !p.isBlacklisted);
  const complete = usable.filter(
    (p) => p.profilePicture && p.providerProfile?.businessName?.trim() && p.providerProfile?.serviceType?.trim()
  );
  const rest = usable.filter((p) => !complete.includes(p));
  return [...complete, ...rest].slice(0, COUNT);
};

function Avatar({ src, name }) {
  const [failed, setFailed] = useState(false);
  const size = "h-14 w-14 sm:h-20 sm:w-20";

  if (!src || failed) {
    return (
      <span className={`${size} flex items-center justify-center rounded-full bg-stone-100 text-sm font-semibold text-stone-600 sm:text-lg`} aria-hidden="true">
        {initialsOf(name)}
      </span>
    );
  }
  return (
    <img
      src={thumb(src)}
      alt=""
      loading="lazy"
      onError={() => setFailed(true)}
      className={`${size} rounded-full bg-stone-100 object-cover`}
    />
  );
}

function ProviderCard({ provider }) {
  const name = nameOf(provider);
  const service = humanize(provider.providerProfile?.serviceType);
  const rating = Number(provider.averageRating) || 0;
  const verified = provider.isVerified || provider.isCertified;

  return (
    <a
      href={`${SITE_URL}/providers/${encodeURIComponent(provider.email)}`}
      className="group flex min-w-0 flex-col items-center rounded border border-stone-200 bg-white p-2 text-center transition-colors hover:border-orange-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-700 sm:p-3"
    >
      <Avatar src={provider.profilePicture} name={name} />
      <span className="mt-2 w-full truncate text-xs font-medium text-stone-900 sm:text-sm">{name}</span>
      {service && <span className="w-full truncate text-[11px] text-stone-500 sm:text-xs">{service}</span>}
      <span className="mt-1 flex min-h-[1rem] items-center gap-1.5 text-[11px] text-stone-600 sm:text-xs">
        {rating > 0 && <span>★ {rating.toFixed(1)}</span>}
        {verified && <span className="hidden text-teal-700 sm:inline">Verified</span>}
      </span>
    </a>
  );
}

const SkeletonCard = () => (
  <div className="flex flex-col items-center rounded border border-stone-200 bg-white p-2 sm:p-3" aria-hidden="true">
    <div className="h-14 w-14 animate-pulse rounded-full bg-stone-100 sm:h-20 sm:w-20" />
    <div className="mt-2 h-3 w-4/5 animate-pulse rounded bg-stone-100" />
    <div className="mt-1.5 h-2.5 w-3/5 animate-pulse rounded bg-stone-100" />
  </div>
);

export default function FeaturedProviders() {
  const [providers, setProviders] = useState([]);
  const [status, setStatus] = useState("loading"); // loading | ready | error
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setStatus("loading");

    fetch(API_URL, { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error(`Request failed (${res.status})`);
        return res.json();
      })
      .then((json) => {
        setProviders(pickProviders(Array.isArray(json?.data) ? json.data : []));
        setStatus("ready");
      })
      .catch((err) => {
        if (err.name !== "AbortError") setStatus("error");
      });

    return () => controller.abort();
  }, [attempt]);

  if (status === "ready" && providers.length === 0) return null;

  return (
    <section className="mx-auto max-w-6xl px-4 py-8" aria-labelledby="providers-heading">
      <div className="mb-4 flex items-baseline justify-between gap-4">
        <h2 id="providers-heading" className="text-lg font-semibold text-stone-900">
          Service providers on eFixit
        </h2>
        <a
          href={SITE_URL}
          className="shrink-0 text-sm font-medium text-orange-700 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-700"
        >
          See more →
        </a>
      </div>

      {status === "error" ? (
        <p role="alert" className="rounded border border-stone-200 bg-stone-50 px-4 py-6 text-center text-sm text-stone-600">
          We couldn't load providers right now.{" "}
          <button onClick={() => setAttempt((n) => n + 1)} className="font-medium text-orange-700 underline">
            Try again
          </button>
        </p>
      ) : (
        <div className="grid grid-cols-3 gap-2 sm:gap-3 md:grid-cols-6">
          {status === "loading"
            ? Array.from({ length: COUNT }, (_, i) => <SkeletonCard key={i} />)
            : providers.map((p) => <ProviderCard key={p._id} provider={p} />)}
        </div>
      )}
    </section>
  );
}