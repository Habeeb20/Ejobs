import { Link } from "react-router-dom";
import { ArrowRight, BadgeCheck, Bell, FileText, Sparkles } from "lucide-react";

const PERKS = [
  { icon: FileText, text: "Build your CV in minutes" },
  { icon: Bell, text: "Get matched with new jobs" },
  { icon: BadgeCheck, text: "Free to join" },
];

export default function RegisterBanner() {
  return (
    <section aria-label="Register as a job seeker" className="px-4 py-8 sm:px-6 sm:py-12">
      <div className="relative isolate mx-auto max-w-6xl overflow-hidden rounded-3xl bg-gradient-to-br from-orange-500 via-orange-600 to-amber-600 px-6 py-10 shadow-2xl shadow-orange-600/25 sm:px-10 sm:py-14 lg:px-16">
        {/* decorative shapes */}
        <div aria-hidden="true" className="absolute -right-16 -top-16 -z-10 h-64 w-64 rounded-full bg-white/10" />
        <div aria-hidden="true" className="absolute -bottom-24 left-1/3 -z-10 h-72 w-72 rounded-full bg-white/10" />
        <div aria-hidden="true" className="absolute bottom-6 right-24 -z-10 hidden h-20 w-20 rounded-full border-4 border-white/20 sm:block" />

        <div className="flex flex-col items-start gap-8 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3.5 py-1.5 text-xs font-semibold uppercase tracking-wider text-white ring-1 ring-white/30 backdrop-blur">
              <Sparkles className="h-3.5 w-3.5" /> For job seekers
            </span>
            <h2 className="mt-4 text-3xl font-extrabold leading-tight tracking-tight text-white sm:text-4xl">
              Ready to land your next job? Register today.
            </h2>
            <p className="mt-3 text-base text-orange-50 sm:text-lg">
              Create your free profile, let employers find you, and apply to open roles across Nigeria.
            </p>

            <ul className="mt-6 flex flex-wrap gap-x-6 gap-y-3">
              {PERKS.map(({ icon: Icon, text }) => (
                <li key={text} className="flex items-center gap-2 text-sm font-medium text-white">
                  <span className="grid h-7 w-7 place-items-center rounded-full bg-white/20">
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  </span>
                  {text}
                </li>
              ))}
            </ul>
          </div>

          <Link
            to="/signup"
            className="group inline-flex w-full shrink-0 items-center justify-center gap-2 rounded-xl bg-white px-8 py-4 text-base font-bold text-orange-700 shadow-xl transition duration-300 hover:-translate-y-0.5 hover:bg-orange-50 focus:outline-none focus-visible:ring-4 focus-visible:ring-white/60 sm:w-auto"
          >
            Register now
            <ArrowRight className="h-5 w-5 transition-transform duration-300 group-hover:translate-x-1" />
          </Link>
        </div>
      </div>
    </section>
  );
}