import React from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Check } from "lucide-react";
import im from "../../assets/jobchanger.jpeg";

const PERKS = ["Better pay", "Room to grow", "A workplace you love"];

const JobChanger = () => {
  return (
    <section className="mx-auto my-16 max-w-7xl px-4 sm:px-6 lg:px-8">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-orange-50 via-white to-orange-100 ring-1 ring-orange-100">
        {/* soft decorative glow */}
        <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-orange-200/40 blur-3xl" />

        <div className="relative grid items-center gap-10 p-8 sm:p-12 lg:grid-cols-2 lg:gap-14 lg:p-16">
          {/* Left: text */}
          <div>
            <span className="inline-flex items-center rounded-full bg-orange-100 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-orange-700">
              Job changers
            </span>

            <h2 className="mt-5 text-4xl font-black leading-tight tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
              Ready to <span className="text-orange-600">change your job?</span>
            </h2>

            <p className="mt-5 max-w-xl text-lg font-medium leading-relaxed text-slate-600">
              Your next opportunity is waiting. Browse new openings and make your next career move with confidence.
            </p>

            <ul className="mt-6 flex flex-wrap gap-x-6 gap-y-3">
              {PERKS.map((perk) => (
                <li key={perk} className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-orange-600 text-white">
                    <Check className="h-3 w-3" strokeWidth={3} />
                  </span>
                  {perk}
                </li>
              ))}
            </ul>

            <Link
              to="/jobs"
              className="group mt-9 inline-flex items-center gap-2 rounded-xl bg-orange-600 px-8 py-4 text-base font-bold text-white shadow-lg shadow-orange-600/30 transition duration-300 hover:-translate-y-0.5 hover:bg-orange-700 hover:shadow-orange-600/40 focus:outline-none focus-visible:ring-4 focus-visible:ring-orange-300"
            >
              Browse jobs
              <ArrowRight className="h-5 w-5 transition-transform duration-300 group-hover:translate-x-1" />
            </Link>
          </div>

          {/* Right: image */}
          <div className="relative">
            <div className="absolute -bottom-4 -right-4 h-full w-full rounded-3xl bg-orange-500/20" />
            <img
              src={im}
              alt="Professional ready to start a new job"
              loading="lazy"
              className="relative h-72 w-full rounded-3xl object-cover shadow-2xl sm:h-96 lg:h-[26rem]"
            />
          </div>
        </div>
      </div>
    </section>
  );
};

export default JobChanger;