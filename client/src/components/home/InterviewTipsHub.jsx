import React from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { ARTICLE_CARDS } from "../../Utils/InterviewArticle";


const InterviewTipsHub = () => {
  return (
    <section className="bg-[#F7F7FB] py-16 sm:py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto text-center mb-12 sm:mb-16">
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 leading-tight">
          Interview tips you must know before you apply
          <br className="hidden sm:block" /> for any job being posted on this platform
        </h1>
        <p className="text-gray-500 text-sm sm:text-base mt-4 max-w-2xl mx-auto">
          Master every stage of the interview process with expert advice, proven
          strategies, and actionable insights designed for the modern job market.
        </p>
      </div>

      <div className="max-w-6xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {ARTICLE_CARDS.map(({ slug, icon: Icon, title, description }) => (
          <div
            key={slug}
            className="bg-white border border-gray-200 rounded-2xl p-6 flex flex-col hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
          >
            <div className="w-11 h-11 rounded-full bg-indigo-50 flex items-center justify-center mb-5">
              <Icon size={20} className="text-indigo-600" />
            </div>
            <h3 className="text-base font-bold text-gray-900 mb-2">{title}</h3>
            <p className="text-sm text-gray-500 leading-relaxed mb-6 flex-1">
              {description}
            </p>
            <Link
              to={`/interview-tips/${slug}`}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 hover:text-blue-700 transition-colors"
            >
              Read More <ArrowRight size={14} />
            </Link>
          </div>
        ))}
      </div>
    </section>
  );
};

export default InterviewTipsHub;