import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

/**
 * QuestionAnswer — editorial FAQ carousel
 *
 * - Two Q&As visible per slide
 * - Auto-advances every 6 s (pauses on hover / focus)
 * - Subtle orange accent alongside the existing green
 * - Smooth horizontal slide
 */

const DEFAULT_ITEMS = [
  {
    category: "Applying",
    question: "How do I apply for a job on ejob?",
    answer:
      "Open any listing and select Apply. You'll review your profile, attach a CV if needed, and submit — most applications take under a minute. You can track every application's status from your dashboard.",
  },
  {
    category: "Interviews",
    question: "What happens in a virtual interview?",
    answer:
      "Virtual interviews run right inside ejob over live video, no extra app required. You'll get a scheduled time slot from the employer, a reminder beforehand, and a single link to join when it starts.",
  },
  {
    category: "Distance",
    question: "How accurate is the commute distance shown on a listing?",
    answer:
      "Distance is calculated from your device's location to the job's local government area using real road routing, so it reflects an actual driving time — not a straight-line guess. Grant location access to see it on any listing.",
  },
  {
    category: "Trust & Safety",
    question: "How do I know a listing is verified?",
    answer:
      "Verified employers carry a badge on their listing and company page. We confirm business registration and contact details before granting it, so you can apply with confidence.",
  },
  {
    category: "Pricing",
    question: "Is ejob free to use for job seekers?",
    answer:
      "Yes — creating a profile, searching listings, and applying are free for job seekers, with no limit on how many roles you apply to.",
  },
];

function QACard({ item }) {
  return (
    <article className="relative flex h-full flex-col rounded-xl border border-[#E4E1DA] bg-white p-6 shadow-[0_1px_2px_rgba(18,24,31,0.04)]">
      {/* left accent rail */}
      <span
        aria-hidden
        className="absolute left-0 top-4 bottom-4 w-[3px] rounded-full bg-gradient-to-b from-[#0B6E4F] to-[#E07A3D]"
      />
      <span
        className="mb-3 block pl-4 text-[11px] font-medium uppercase tracking-[0.14em] text-[#E07A3D]"
        style={{ fontFamily: "'IBM Plex Mono', monospace" }}
      >
        {item.category}
      </span>
      <h3
        className="pl-4 text-[1.2rem] leading-snug text-[#12181F]"
        style={{ fontFamily: "'Fraunces', serif", fontOpticalSizing: "auto" }}
      >
        {item.question}
      </h3>
      <p
        className="mt-3 flex-1 pl-4 text-[0.95rem] leading-relaxed text-[#4B5259]"
        style={{ fontFamily: "'Inter', sans-serif" }}
      >
        {item.answer}
      </p>
    </article>
  );
}

export default function QuestionAnswer({
  eyebrow = "Support",
  title = "Questions, answered",
  description = "Everything you need to know before your next application.",
  items = DEFAULT_ITEMS,
  autoPlayInterval = 6000,
}) {
  const [page, setPage] = useState(0);
  const [paused, setPaused] = useState(false);
  const totalPages = Math.ceil(items.length / 2);

  // Auto-advance
  useEffect(() => {
    if (paused || totalPages <= 1) return;
    const id = setInterval(() => {
      setPage((p) => (p + 1) % totalPages);
    }, autoPlayInterval);
    return () => clearInterval(id);
  }, [paused, totalPages, autoPlayInterval]);

  const goTo = (next) => {
    setPage((next + totalPages) % totalPages);
  };

  // Build pages of 2 items
  const pages = Array.from({ length: totalPages }, (_, i) =>
    items.slice(i * 2, i * 2 + 2)
  );

  return (
    <section className="w-full bg-[#FAF9F6] px-6 py-20 sm:px-10">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600&family=Inter:wght@400;500&family=IBM+Plex+Mono:wght@500&display=swap');
      `}</style>

      <div className="mx-auto max-w-3xl">
        {/* header */}
        <span
          className="text-[11px] font-medium uppercase tracking-[0.14em] text-[#0B6E4F]"
          style={{ fontFamily: "'IBM Plex Mono', monospace" }}
        >
          {eyebrow}
        </span>
        <h2
          className="mt-3 text-[2.5rem] leading-[1.08] text-[#12181F] sm:text-[3rem]"
          style={{ fontFamily: "'Fraunces', serif" }}
        >
          {title}
        </h2>
        <p
          className="mt-4 max-w-md text-[1rem] leading-relaxed text-[#6B7280]"
          style={{ fontFamily: "'Inter', sans-serif" }}
        >
          {description}
        </p>

        {/* carousel */}
        <div
          className="relative mt-12"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          onFocus={() => setPaused(true)}
          onBlur={() => setPaused(false)}
        >
          {/* slides track */}
          <div className="overflow-hidden rounded-2xl">
            <div
              className="flex transition-transform duration-500 ease-out"
              style={{ transform: `translateX(-${page * 100}%)` }}
            >
              {pages.map((pair, pageIdx) => (
                <div
                  key={pageIdx}
                  className="grid w-full shrink-0 grid-cols-1 gap-5 sm:grid-cols-2"
                >
                  {pair.map((item) => (
                    <QACard key={item.question} item={item} />
                  ))}
                  {/* keep layout balanced on odd last page */}
                  {pair.length === 1 && <div className="hidden sm:block" />}
                </div>
              ))}
            </div>
          </div>

          {/* controls */}
          {totalPages > 1 && (
            <div className="mt-8 flex items-center justify-between">
              <div className="flex gap-2">
                {Array.from({ length: totalPages }).map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    aria-label={`Go to page ${i + 1}`}
                    onClick={() => goTo(i)}
                    className={`h-2 rounded-full transition-all duration-300 ${
                      i === page
                        ? "w-6 bg-[#E07A3D]"
                        : "w-2 bg-[#D8D5CC] hover:bg-[#0B6E4F]"
                    }`}
                  />
                ))}
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  aria-label="Previous"
                  onClick={() => goTo(page - 1)}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-[#D8D5CC] text-[#12181F] transition hover:border-[#E07A3D] hover:text-[#E07A3D]"
                >
                  <ChevronLeft size={18} strokeWidth={2} />
                </button>
                <button
                  type="button"
                  aria-label="Next"
                  onClick={() => goTo(page + 1)}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-[#D8D5CC] text-[#12181F] transition hover:border-[#E07A3D] hover:text-[#E07A3D]"
                >
                  <ChevronRight size={18} strokeWidth={2} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}