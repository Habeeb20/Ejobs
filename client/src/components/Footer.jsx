import { Link, useLocation } from "react-router-dom";
import im from "../assets/eJobs@4x.png";

const HIDDEN_ON = ["/dashboard", "/jobseeker", "/employer", "/admin", "/login", "/signup", "/register"];

const LINKS = [
  { label: "About us", href: "/about" },
  { label: "Privacy policy", href: "/privacy" },
  { label: "Terms of service", href: "/terms" },
];

export default function Footer() {
  const { pathname } = useLocation();
  const hidden = HIDDEN_ON.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  if (hidden) return null;

  const year = new Date().getFullYear();

  return (
    // mt-auto + shrink-0 push the footer to the bottom of the page layout's flex column
    <footer className="mt-auto w-full shrink-0 bg-[#12202B] text-[#C4CFD6]">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <div className="flex flex-col gap-8 py-10 sm:py-12 md:flex-row md:items-start md:justify-between">
          <div className="max-w-sm">
            <Link to="/" className="flex items-center" aria-label="EJobs">
              <img src={im} alt="EJobs" className="h-10 w-auto object-contain md:h-12" />
            </Link>
            <p className="mt-4 text-[15px] leading-relaxed">
              Find work you want, or the people your business needs. Simple, fair and fast.
            </p>
          </div>

          <nav aria-label="Footer">
            <ul className="flex flex-wrap gap-x-8 gap-y-3 text-[15px]">
              {LINKS.map(({ label, href }) => (
                <li key={href}>
                  <Link
                    to={href}
                    className="rounded text-[#C4CFD6] underline-offset-4 transition-colors hover:text-white hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#5FD1A4]"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <div className="border-t border-white/10 py-6 text-sm text-[#8FA0AB]">
          © {year} ejobs. All rights reserved.
        </div>
      </div>
    </footer>
  );
}