import React from "react";
import { useParams, Link, Navigate } from "react-router-dom";
import { ArrowLeft, Check, X, Phone } from "lucide-react";
import { ARTICLES } from "../../utils/InterviewArticle";


const SectionHeading = ({ number, title }) => (
  <div className="flex items-baseline gap-3 mb-3">
    <span className="text-orange-500 font-bold text-lg sm:text-xl flex-shrink-0">
      {number}.
    </span>
    <h2 className="text-lg sm:text-xl font-bold text-gray-900">{title}</h2>
  </div>
);

const InterviewArticlePage = () => {
  const { slug } = useParams();
  const article = ARTICLES[slug];

  if (!article) return <Navigate to="/interview-tips" replace />;

  return (
    <article className="bg-white min-h-screen pb-16">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-8 sm:pt-12">
        <Link
          to="/interview-tips"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 mb-6 transition-colors"
        >
          <ArrowLeft size={14} /> All interview tips
        </Link>

        <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-gray-900 leading-tight mb-4">
          {article.title}
        </h1>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs sm:text-sm text-gray-500 mb-6">
          <span>By {article.author}</span>
          <span>•</span>
          <span>{article.readTime}</span>
          <span>•</span>
          <span>Updated {article.updated}</span>
        </div>

        {article.heroImage && (
          <img
            src={article.heroImage}
            alt={article.title}
            className="w-full h-56 sm:h-80 md:h-96 object-cover rounded-xl mb-8"
          />
        )}

        {article.intro.split("\n\n").map((para, i) => (
          <p key={i} className="text-gray-600 text-sm sm:text-base leading-relaxed mb-4">
            {para}
          </p>
        ))}

        <div className="mt-10 space-y-10">
          {article.sections.map((section) => (
            <div key={section.number}>
              <SectionHeading number={section.number} title={section.title} />
              <p className="text-gray-600 text-sm sm:text-base leading-relaxed">
                {section.body}
              </p>

              {/* text-with-box: blue "Key Research Areas" style box */}
              {section.type === "text-with-box" && section.box && (
                <div className="mt-4 bg-blue-50 border border-blue-100 rounded-xl p-4 sm:p-5">
                  <p className="text-xs font-bold text-blue-700 uppercase tracking-wide mb-3">
                    {section.box.heading}
                  </p>
                  <ul className="space-y-2">
                    {section.box.items.map((item, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 flex-shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* star-grid: Situation / Task / Action / Result 4-box grid */}
              {section.type === "star-grid" && section.star && (
                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {section.star.map((s) => (
                    <div
                      key={s.letter}
                      className="border border-gray-200 rounded-xl p-4"
                    >
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="w-6 h-6 rounded-md bg-orange-100 text-orange-600 text-xs font-bold flex items-center justify-center">
                          {s.letter}
                        </span>
                        <span className="text-sm font-bold text-gray-900">{s.label}</span>
                      </div>
                      <p className="text-xs text-gray-500 leading-relaxed">{s.text}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* do-dont: green DO / red DON'T two-column box */}
              {section.type === "do-dont" && (
                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4">
                    <p className="text-xs font-bold text-emerald-700 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                      <Check size={14} /> Do
                    </p>
                    <ul className="space-y-2">
                      {section.dos.map((item, i) => (
                        <li key={i} className="text-sm text-gray-700">{item}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="bg-rose-50 border border-rose-100 rounded-xl p-4">
                    <p className="text-xs font-bold text-rose-600 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                      <X size={14} /> Don't
                    </p>
                    <ul className="space-y-2">
                      {section.donts.map((item, i) => (
                        <li key={i} className="text-sm text-gray-700">{item}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {/* phone-steps: horizontal numbered colored circles */}
              {section.type === "phone-steps" && (
                <div className="mt-5 flex flex-wrap sm:flex-nowrap items-start justify-between gap-4 sm:gap-2">
                  {section.steps.map((step, i) => (
                    <div
                      key={i}
                      className="flex flex-col items-center text-center w-16 sm:w-auto sm:flex-1"
                    >
                      <div
                        className={`w-10 h-10 rounded-full ${step.color} text-white flex items-center justify-center mb-2`}
                      >
                        <Phone size={16} />
                      </div>
                      <span className="text-[11px] sm:text-xs font-medium text-gray-600 leading-tight">
                        {step.label}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </article>
  );
};

export default InterviewArticlePage;