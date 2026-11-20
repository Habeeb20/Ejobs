import { useEffect, useState } from "react";
import { Phone, MessageCircle, Mail, MapPin, Clock, Copy, Check, Navigation } from "lucide-react";

/**
 * Contact section. Edit the CONTACT object to change any detail.
 * Props:
 *   floatingChat (default true): shows the floating "Chat with us now!" WhatsApp button.
 * Requires: react, tailwindcss, lucide-react
 */

const CONTACT = {
  address: "24, Iyalla Street, Ikaja Lagos, Nigeria",
  hours: "Monday - Friday: 9 AM - 5 PM",
  phoneDisplay: "+234 905 555 6666",
  phoneTel: "+2349055556666",
  whatsappNumber: "2349055556666",
  whatsappMessage: "Hello, I’d like to make an enquiry.",
  email: "essentialng@gmail.com",
};

const WHATSAPP_URL = `https://wa.me/${CONTACT.whatsappNumber}?text=${encodeURIComponent(CONTACT.whatsappMessage)}`;
const TEL_URL = `tel:${CONTACT.phoneTel}`;
const MAPS_URL = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(CONTACT.address)}`;

const PINE = "#0E3B33";
const WA_GREEN = "#25D366";

// True during office hours (Mon-Fri, 9 AM - 5 PM) in Lagos time.
function isOfficeOpen() {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Lagos",
    weekday: "short",
    hour: "numeric",
    hour12: false,
  }).formatToParts(new Date());
  const day = parts.find((p) => p.type === "weekday")?.value;
  const hour = parseInt(parts.find((p) => p.type === "hour")?.value, 10) % 24;
  return ["Mon", "Tue", "Wed", "Thu", "Fri"].includes(day) && hour >= 9 && hour < 17;
}

function useOfficeOpen() {
  const [open, setOpen] = useState(isOfficeOpen);
  useEffect(() => {
    const t = setInterval(() => setOpen(isOfficeOpen()), 60000);
    return () => clearInterval(t);
  }, []);
  return open;
}

function CopyButton({ text, label }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard unavailable: ignore */
    }
  };
  return (
    <button
      onClick={copy}
      aria-label={`Copy ${label}`}
      className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-stone-600 ring-1 ring-inset ring-stone-200 transition hover:bg-stone-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-stone-400"
    >
      {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

function IconTile({ children }) {
  return (
    <span
      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
      style={{ backgroundColor: `${PINE}14`, color: PINE }}
    >
      {children}
    </span>
  );
}

export default function Contact({ floatingChat = true }) {
  const open = useOfficeOpen();

  return (
    <section className="bg-stone-50 px-4 py-16 md:py-24">
      <div className="mx-auto max-w-6xl">
        <h2 className="max-w-xl text-3xl font-semibold tracking-tight text-stone-900 md:text-4xl">
          Talk to us the way that suits you
        </h2>
        <p className="mt-3 max-w-xl text-stone-600">
          Call, message us on WhatsApp, send an email, or visit the office.
        </p>

        <div className="mt-10 grid gap-6 lg:grid-cols-5">
          {/* Call + WhatsApp panel */}
          <div
            className="relative overflow-hidden rounded-3xl p-8 text-white md:p-10 lg:col-span-3"
            style={{ backgroundColor: PINE }}
          >
            <div
              className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full opacity-20 blur-3xl"
              style={{ backgroundColor: WA_GREEN }}
              aria-hidden="true"
            />

            <div className="relative">
              <div className="flex items-center gap-3">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="absolute inline-flex h-full w-full rounded-full opacity-60 motion-safe:animate-ping" style={{ backgroundColor: WA_GREEN }} />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full" style={{ backgroundColor: WA_GREEN }} />
                </span>
                <p className="text-sm text-emerald-100/80">Contact Us · Available 24/7 for support</p>
              </div>

              <a
                href={TEL_URL}
                className="mt-6 block text-4xl font-semibold tracking-tight transition hover:text-emerald-200 focus:outline-none focus-visible:underline md:text-6xl"
              >
                {CONTACT.phoneDisplay}
              </a>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <a
                  href={TEL_URL}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-6 py-3.5 font-medium text-stone-900 transition hover:bg-emerald-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#0E3B33]"
                >
                  <Phone className="h-5 w-5" />
                  Call Us
                </a>
                <a
                  href={WHATSAPP_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3.5 font-medium text-stone-900 transition hover:brightness-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#0E3B33]"
                  style={{ backgroundColor: WA_GREEN }}
                >
                  <MessageCircle className="h-5 w-5" />
                  WhatsApp Us
                </a>
              </div>

              <div className="mt-6">
                <CopyNumber />
              </div>
            </div>
          </div>

          {/* Office + Email */}
          <div className="flex flex-col gap-6 lg:col-span-2">
            <article className="rounded-3xl border border-stone-200 bg-white p-6">
              <div className="flex items-start gap-4">
                <IconTile>
                  <MapPin className="h-5 w-5" />
                </IconTile>
                <div className="min-w-0">
                  <h3 className="font-semibold text-stone-900">Visit Our Office</h3>
                  <address className="mt-1 not-italic text-stone-600">{CONTACT.address}</address>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-stone-600">
                <span className="inline-flex items-center gap-1.5">
                  <Clock className="h-4 w-4 text-stone-400" />
                  {CONTACT.hours}
                </span>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${
                    open ? "bg-emerald-50 text-emerald-700 ring-emerald-200" : "bg-stone-100 text-stone-600 ring-stone-200"
                  }`}
                >
                  {open ? "Open now" : "Closed now"}
                </span>
              </div>

              <a
                href={MAPS_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-5 inline-flex items-center gap-2 rounded-xl border border-stone-200 px-4 py-2.5 text-sm font-medium text-stone-800 transition hover:bg-stone-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-stone-400"
              >
                <Navigation className="h-4 w-4" />
                Get directions
              </a>
            </article>

            <article className="rounded-3xl border border-stone-200 bg-white p-6">
              <div className="flex items-start gap-4">
                <IconTile>
                  <Mail className="h-5 w-5" />
                </IconTile>
                <div className="min-w-0">
                  <h3 className="font-semibold text-stone-900">Email Us</h3>
                  <a
                    href={`mailto:${CONTACT.email}`}
                    className="mt-1 block break-all text-stone-700 underline decoration-stone-300 underline-offset-4 transition hover:decoration-stone-700"
                  >
                    {CONTACT.email}
                  </a>
                  <p className="mt-1 text-sm text-stone-500">Response within 24 hours</p>
                </div>
              </div>
              <div className="mt-4">
                <CopyButton text={CONTACT.email} label="email address" />
              </div>
            </article>
          </div>
        </div>
      </div>

      {floatingChat && (
        <a
          href={WHATSAPP_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="fixed bottom-4 mb-80 right-4 z-40 inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-semibold text-stone-900 shadow-lg transition hover:brightness-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-stone-900 focus-visible:ring-offset-2"
          style={{ backgroundColor: WA_GREEN }}
        >
          <MessageCircle className="h-5 w-5" />
          Chat with us now!
        </a>
      )}
    </section>
  );
}

function CopyNumber() {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(CONTACT.phoneDisplay);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard unavailable: ignore */
    }
  };
  return (
    <button
      onClick={copy}
      className="inline-flex items-center gap-1.5 text-sm text-emerald-100/80 transition hover:text-white focus:outline-none focus-visible:underline"
    >
      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
      {copied ? "Number copied" : "Copy number"}
    </button>
  );
}