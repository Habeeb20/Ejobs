import { useState } from "react";
import { ArrowUpRight, Car, Plus, ShoppingBag, Wrench, X } from "lucide-react";

/**
 * Banner for the EJob family: efixit.ng, edrivers.ng and estores.ng.
 *
 * Three flat panels in three oranges (deep, bright, golden) sit side by side like shop signboards. One is open at a time; the other
 * two fold down to a vertical name. Hover, focus or tap a panel to open it. On phones the panels stack.
 *
 * Usage:  <EJobFamilyBanner className="mt-6" />          (add `dismissible` to let people close it)
 */

// Bricolage Grotesque gives the wordmarks their character. If you'd rather not load it from here,
// add the <link> to index.html instead and delete the @import below. The fallback is the system font.
const FONT_CSS = `@import url("https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,800&display=swap");`;
const DISPLAY = { fontFamily: '"Bricolage Grotesque", ui-sans-serif, system-ui, sans-serif' };
const DISMISS_KEY = "ejob:family-banner-dismissed";

// Everything you'd want to edit lives here.
const PLATFORMS = [
  {
    key: "efixit",
    name: "efixit",
    url: "https://efixit.ng",
    icon: Wrench,
    promise: "Something broken? Get it fixed by someone who knows how.",
    detail: "Electricians, plumbers, mechanics, AC, fridge and phone repair, all in one place.",
    cta: "Find a repairer",
    // Deep orange
    panel: "bg-[#c2410c] text-white",
    sub: "text-white/90",
    chip: "bg-white/20",
    button: "bg-white text-[#c2410c] hover:bg-orange-50 focus-visible:outline-white",
    decor: (
      <Wrench
        aria-hidden="true"
        strokeWidth={1.25}
        className="pointer-events-none absolute -bottom-12 -right-12 h-80 w-80 -rotate-12 text-white/10"
      />
    ),
  },
  {
    key: "edrivers",
    name: "edrivers",
    url: "https://edrivers.ng",
    icon: Car,
    promise: "Need to get somewhere? Book a driver.",
    detail: "Daily trips, airport runs, errands, or a driver for the whole day.",
    cta: "Book a driver",
    // Bright orange, with a taxi checker band
    panel: "bg-[#f97316] text-neutral-950",
    sub: "text-neutral-900/80",
    chip: "bg-black/10",
    button: "bg-neutral-950 text-[#f97316] hover:bg-neutral-800 focus-visible:outline-neutral-950",
    decor: (
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-6"
        style={{ background: "repeating-conic-gradient(#0a0a0a 0% 25%, transparent 0% 50%) 0 0 / 24px 24px" }}
      />
    ),
  },
  {
    key: "estores",
    name: "estores",
    url: "https://estores.ng",
    icon: ShoppingBag,
    promise: "Shop online. Get it delivered.",
    detail: "Phones and gadgets, fashion, home and kitchen, groceries and more from sellers across Nigeria.",
    cta: "Start shopping",
    // Golden amber, with an awning stripe
    panel: "bg-[#fbb324] text-neutral-950",
    sub: "text-neutral-900/80",
    chip: "bg-black/10",
    button: "bg-neutral-950 text-[#fbb324] hover:bg-neutral-800 focus-visible:outline-neutral-950",
    decor: (
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-4"
        style={{ background: "repeating-linear-gradient(90deg, rgba(194,65,12,.22) 0 22px, transparent 22px 44px)" }}
      />
    ),
  },
];

export default function EJobFamilyBanner({ className = "", defaultActive = 0, dismissible = false }) {
  const [active, setActive] = useState(defaultActive);
  const [hidden, setHidden] = useState(() => {
    if (!dismissible) return false;
    try {
      return localStorage.getItem(DISMISS_KEY) === "1";
    } catch {
      return false;
    }
  });

  if (hidden) return null;

  // Hover opens a panel on desktop only. Touch and keyboard use tap and focus.
  const hoverOpen = (i) => {
    if (window.matchMedia("(hover: hover) and (min-width: 768px)").matches) setActive(i);
  };

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* private mode: just hide for this visit */
    }
    setHidden(true);
  };

  return (
    <section
      aria-label="More from EJob"
      className={`relative flex flex-col overflow-hidden rounded-[28px] ring-1 ring-black/5 md:h-[25rem] md:flex-row ${className}`}
    >
      <style>{FONT_CSS}</style>

      {PLATFORMS.map((p, i) => {
        const on = i === active;
        const Icon = p.icon;
        return (
          <div
            key={p.key}
            onMouseEnter={() => hoverOpen(i)}
            className={`relative overflow-hidden transition-[flex-grow] duration-[600ms] ease-[cubic-bezier(.2,.8,.2,1)] motion-reduce:transition-none md:basis-0 ${p.panel} ${
              on ? "md:grow-[4]" : "md:grow"
            }`}
          >
            {p.decor}

            {/* Folded state: icon and name only (vertical on desktop, a slim row on phones) */}
            <button
              type="button"
              id={`${p.key}-tab`}
              aria-expanded={on}
              aria-controls={`${p.key}-panel`}
              tabIndex={on ? -1 : 0}
              onClick={() => setActive(i)}
              onFocus={() => setActive(i)}
              className={`${
                on ? "hidden md:flex md:pointer-events-none md:opacity-0" : "flex"
              } relative w-full items-center gap-3 px-5 py-4 text-left transition-opacity duration-300 focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-current motion-reduce:transition-none md:absolute md:inset-0 md:flex-col md:items-center md:justify-between md:px-0 md:py-7`}
            >
              <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-full ${p.chip}`}>
                <Icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <span
                style={DISPLAY}
                className="flex-1 text-2xl font-extrabold leading-none tracking-tight md:flex-none md:rotate-180 md:text-[2rem] md:[writing-mode:vertical-rl]"
              >
                {p.name}
                <span className="opacity-60">.ng</span>
              </span>
              <Plus className="h-5 w-5 opacity-70" aria-hidden="true" />
            </button>

            {/* Open state */}
            <div
              id={`${p.key}-panel`}
              role="region"
              aria-label={`${p.name}.ng`}
              aria-hidden={!on}
              className={`relative grid transition-[grid-template-rows] duration-500 motion-reduce:transition-none md:absolute md:inset-0 md:block ${
                on ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
              }`}
            >
              <div
                className={`min-h-0 overflow-hidden transition-opacity duration-500 motion-reduce:transition-none md:h-full md:w-[27rem] lg:w-[34rem] ${
                  on ? "opacity-100 md:delay-200" : "pointer-events-none opacity-0"
                }`}
              >
                <div className="flex h-full flex-col justify-between gap-10 px-6 pb-14 pt-6 md:px-10 md:pb-16 md:pt-9">
                  <p
                    style={DISPLAY}
                    className="whitespace-nowrap text-5xl font-extrabold leading-[0.85] tracking-[-0.05em] sm:text-6xl lg:text-7xl"
                  >
                    {p.name}
                    <span className="opacity-60">.ng</span>
                  </p>

                  <div>
                    <p className="max-w-md text-xl font-semibold leading-snug sm:text-2xl">{p.promise}</p>
                    <p className={`mt-2 max-w-md text-[15px] leading-relaxed ${p.sub}`}>{p.detail}</p>
                    <a
                      href={p.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      tabIndex={on ? 0 : -1}
                      className={`mt-6 inline-flex items-center gap-2 rounded-full px-6 py-3 text-base font-bold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${p.button}`}
                    >
                      {p.cta}
                      <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                      <span className="sr-only">(opens {p.name}.ng in a new tab)</span>
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })}

      {dismissible && (
        <button
          type="button"
          onClick={dismiss}
          aria-label="Hide this banner"
          className="absolute right-3 top-3 z-10 grid h-8 w-8 place-items-center rounded-full bg-neutral-950/80 text-white transition hover:bg-neutral-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      )}
    </section>
  );
}