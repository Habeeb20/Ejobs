import {
  CalendarCheck,
  MessageSquare,
  HelpCircle,
  MailCheck,
} from "lucide-react";

// ── Hub card metadata (image 2) ─────────────────────────────
export const ARTICLE_CARDS = [
  {
    slug: "before-the-interview",
    icon: CalendarCheck,
    title: "Before the Interview",
    description:
      "Learn how to research companies, optimize your portfolio, and mentally prepare for success before you even step into the room.",
  },
  {
    slug: "during-the-interview",
    icon: MessageSquare,
    title: "During the Interview",
    description:
      "Master body language, confident communication, and the STAR method to effectively showcase your skills and experience.",
  },
  {
    slug: "common-interview-questions",
    icon: HelpCircle,
    title: "Common Interview Questions",
    description:
      "Discover the most frequently asked questions and learn how to formulate impactful, tailored responses that impress recruiters.",
  },
  {
    slug: "after-the-interview",
    icon: MailCheck,
    title: "After the Interview",
    description:
      "Navigate the post-interview phase with grace. Learn when to follow up, how to write a thank-you note, and how to handle offers.",
  },
];

// ── Full article content ────────────────────────────────────
// "before-the-interview" content below is transcribed directly from your
// screenshot. The other three articles are placeholder structures — same
// shape, generic copy — swap in your real content when ready.

export const ARTICLES = {
  "before-the-interview": {
    title:
      "How to Ace a Job Interview: The Complete Guide to Making a Great Impression and Getting Hired",
    author: "Alison Career Coach",
    readTime: "16 min read",
    updated: "Oct 24, 2024",
    heroImage:
      "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=1400&q=80",
    intro:
      "Walking into a job interview can feel daunting, but it's essentially a structured conversation where both you and the employer determine if you're a mutual fit. Your preparation is the foundation of your confidence.\n\nIn Nigeria's competitive job market, standing out requires more than a strong CV. It demands excellent communication, a clear understanding of the company's needs, and the ability to articulate your value succinctly. This comprehensive guide covers every critical step, from the moment you receive the invitation to the post-interview follow-up.",
    sections: [
      {
        number: 1,
        title: "Research the Company Extensively",
        type: "text-with-box",
        body: "Never walk into an interview blind. Understand the company's products, mission, recent news, core products, and competitors. Review their \"About Us\" page, recent press releases, and corporate social media profiles.",
        box: {
          heading: "Key Research Areas",
          items: [
            "Recent company milestones or product launches",
            "The organizational culture and values",
            "The specific challenges the department you are interviewing for might be facing",
          ],
        },
      },
      {
        number: 2,
        title: "Analyze the Job Description",
        type: "text",
        body: "The job description is your cheat sheet. Highlight the required skills and map them directly to your past experiences. Prepare specific anecdotes using the STAR method that demonstrate your competency in each area.",
      },
      {
        number: 3,
        title: "Master the STAR Method",
        type: "star-grid",
        body: "Behavioral questions (\"Tell me about a time when…\") are best answered using the STAR method — an structured way to give clear and focused positive outcomes.",
        star: [
          {
            letter: "S",
            label: "Situation",
            text: "Set the stage and provide necessary context or detail about the situation you were in.",
          },
          {
            letter: "T",
            label: "Task",
            text: "Describe what your responsibility was in that situation.",
          },
          {
            letter: "A",
            label: "Action",
            text: "Explain exactly what steps you took to address it.",
          },
          {
            letter: "R",
            label: "Result",
            text: "Share the outcomes your actions achieved.",
          },
        ],
      },
      {
        number: 4,
        title: "Dress for Success",
        type: "do-dont",
        body: "Your attire sets the initial tone. Dress one notch more formal than the company's daily dress code. When in doubt, formal corporate attire is safer than casual.",
        dos: [
          "Wear ironed, clean clothes",
          "Keep accessories minimal",
          "Choose professional footwear",
        ],
        donts: [
          "Skip overpowering cologne/perfume",
          "Don't wear distracting patterns",
          "Avoid casual denim or sneakers",
        ],
      },
      {
        number: 5,
        title: "The Phone Etiquette Sequence",
        type: "phone-steps",
        body: "A ringing phone during an interview is a major red flag.",
        steps: [
          { label: "1. Check phone", color: "bg-blue-600" },
          { label: "2. Silent mode", color: "bg-orange-500" },
          { label: "3. Stow it away", color: "bg-purple-500" },
          { label: "4. Stay present", color: "bg-teal-500" },
          { label: "5. Focus", color: "bg-rose-500" },
        ],
      },
      {
        number: 6,
        title: "Prepare Thoughtful Questions to Ask",
        type: "text",
        body: "Interviews are two-way conversations. Prepare 3–5 genuine questions about the role, team structure, or company direction — this signals real interest rather than a rehearsed script.",
      },
      {
        number: 7,
        title: "Understand Salary Expectations",
        type: "text",
        body: "Research market rates for the role before you're asked. Give a realistic range rather than a single figure, and defer specifics until you understand the full scope of the role.",
      },
      {
        number: 8,
        title: "Master Body Language and Nonverbal Cues",
        type: "text",
        body: "Maintain steady eye contact, sit upright, and mirror the interviewer's energy. Nonverbal signals often communicate confidence louder than your words do.",
      },
      {
        number: 9,
        title: "Follow Up After the Interview",
        type: "text",
        body: "Send a thank-you note within 24 hours. Reference something specific from the conversation to show you were genuinely engaged, not sending a template.",
      },
      {
        number: 10,
        title: 'Nailing the "Tell Me About Yourself"',
        type: "text",
        body: "This is usually the first question. Keep it professional, concise, and relevant to the role. Do not recite your entire resume — instead give a brief present-past-future arc: what you do now, how you got here, and what you're looking for next.",
      },
    ],
  },

  "during-the-interview": {
    title: "During the Interview: Communication, Body Language & The STAR Method",
    author: "Alison Career Coach",
    readTime: "10 min read",
    updated: "Oct 24, 2024",
    heroImage:
      "https://images.unsplash.com/photo-1573497491208-6b1acb260507?auto=format&fit=crop&w=1400&q=80",
    intro:
      "The interview itself is where preparation meets performance. How you carry yourself, structure your answers, and read the room matters as much as what you say.",
    sections: [
      {
        number: 1,
        title: "Set the Tone in the First Two Minutes",
        type: "text",
        body: "First impressions form fast. A firm handshake, genuine smile, and confident opening line set the tone for everything that follows.",
      },
      {
        number: 2,
        title: "Structure Every Answer with STAR",
        type: "star-grid",
        body: "Behavioral questions are best answered with a clear, structured format.",
        star: [
          { letter: "S", label: "Situation", text: "Set the context briefly." },
          { letter: "T", label: "Task", text: "State your specific responsibility." },
          { letter: "A", label: "Action", text: "Explain the steps you took." },
          { letter: "R", label: "Result", text: "Share the measurable outcome." },
        ],
      },
      {
        number: 3,
        title: "Read the Room",
        type: "text",
        body: "Pay attention to the interviewer's tone and pacing. Adjust your energy to match a formal or conversational interview style accordingly.",
      },
    ],
  },

  "common-interview-questions": {
    title: "Common Interview Questions and How to Answer Them",
    author: "Alison Career Coach",
    readTime: "12 min read",
    updated: "Oct 24, 2024",
    heroImage:
      "https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=1400&q=80",
    intro:
      "Certain questions come up in almost every interview. Preparing tight, honest answers in advance takes the pressure off on the day.",
    sections: [
      {
        number: 1,
        title: '"What Are Your Strengths?"',
        type: "text",
        body: "Choose a strength genuinely relevant to the role, and back it with a brief concrete example rather than a generic adjective.",
      },
      {
        number: 2,
        title: '"What Are Your Weaknesses?"',
        type: "text",
        body: "Pick a real, minor weakness and pair it with the specific steps you've taken to improve on it.",
      },
      {
        number: 3,
        title: '"Why Do You Want to Work Here?"',
        type: "text",
        body: "Connect the company's mission or recent work to your own career goals — this is where your earlier research pays off.",
      },
    ],
  },

  "after-the-interview": {
    title: "After the Interview: Follow-Up, Thank-You Notes & Handling Offers",
    author: "Alison Career Coach",
    readTime: "8 min read",
    updated: "Oct 24, 2024",
    heroImage:
      "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=1400&q=80",
    intro:
      "The interview isn't over when you leave the room. How you follow up can influence a close decision in your favor.",
    sections: [
      {
        number: 1,
        title: "Send a Thank-You Note Within 24 Hours",
        type: "text",
        body: "Reference a specific detail from the conversation. A short, personal note stands out far more than a generic template.",
      },
      {
        number: 2,
        title: "Know When to Follow Up",
        type: "text",
        body: "If you haven't heard back by the timeline they gave you, a polite check-in email a few days later is appropriate — not before.",
      },
      {
        number: 3,
        title: "Evaluating and Negotiating an Offer",
        type: "text",
        body: "Take time to review the full package, not just salary. It's reasonable to ask for a day or two before responding to an offer.",
      },
    ],
  },
};