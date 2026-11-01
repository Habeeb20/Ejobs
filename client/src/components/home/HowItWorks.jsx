import React, { useEffect, useRef, useState } from 'react';
import { VscAccount } from 'react-icons/vsc';
import { FaSearch, FaHandshake } from 'react-icons/fa';

export const ApplicationSteps = ({ logo, title, content }) => (
  <div className="flex flex-col items-center text-center">
    <div>{logo}</div>
    <h2 className="text-xl font-bold text-gray-800 mt-4">{title}</h2>
    <p className="text-gray-600 mt-2">{content}</p>
  </div>
);

export const HowItWorks = () => {
  const elementRef = useRef(null);
  const [inView, setInView] = useState(false);
  const [isIntersecting, setIsIntersecting] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsIntersecting(entry.isIntersecting);
      },
      { rootMargin: "-200px" }
    );

    if (elementRef.current) {
      observer.observe(elementRef.current);
    }

    return () => {
      if (elementRef.current) {
        observer.disconnect();
      }
    };
  }, [isIntersecting]);

  useEffect(() => {
    if (isIntersecting) {
      setInView(true);
    } else {
      setInView(false);
    }
  }, [isIntersecting]);

  return (
    <section className="my-20 sm:px-20 px-5">
      <h1 className="sm:text-3xl text-xl font-bold text-center text-gray-800 border-b-2 border-orange-500 pb-2 mb-8">
        How It Works
      </h1>
      <p className="text-center text-gray-600 mb-8 sm:text-base text-sm">
        Post your job to let us know what you are searching for, with simple-to-use job description layouts and eJobs will connect you with relevant and qualified candidates. With your job post on eJobs, it can be promoted through emails, notifications, and mobile alerts, making it easier for job seekers to find and apply for your position.
      </p>

      <div
        ref={elementRef}
        className={`flex flex-col sm:flex-row items-start justify-center gap-12 transition-all duration-500 ease-in-out`}
      >
        {[
          {
            logo: <VscAccount className="w-14 h-14 text-orange-500" />,
            title: 'Register an Account',
            content:
              'Connect with numerous companions, personnel, artisans, employed, unemployed, and general opportunities in your surroundings on eJobs.',
          },
          {
            logo: <FaSearch className="w-14 h-14 text-orange-500" />,
            title: 'Search for Jobs',
            content:
              'We have been working hard to enhance your experience, making it easier for you to find the right job fit.',
          },
          {
            logo: <FaHandshake className="w-14 h-14 text-orange-500" />,
            title: 'Apply for Jobs',
            content:
              'Explore a vast network of companies, organizations, and users to connect with numerous opportunities and advance your career.',
          },
        ].map((step, index) => (
          <div
            key={index}
            style={{ transitionDelay: `${index * 200}ms` }} // Delay each item
            className={`${
              inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
            } transform transition-all duration-700 ease-out`}
          >
            <ApplicationSteps
              logo={step.logo}
              title={step.title}
              content={step.content}
            />
          </div>
        ))}
      </div>
    </section>
  );
};


