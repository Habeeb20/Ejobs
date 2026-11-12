import React from "react";
import Background from "../../assets/Aboutus.webp";
import Background2 from "../../assets/company.webp";


function AboutUs() {
  return (
    <div>
      <div
        className="h-72 relative text-sm after:absolute after:bg-black after:z-10 after:top-0 after:left-0 after:w-full after:h-full after:opacity-55"
        // className="h-72 relative sm:px-5 px-4 after:absolute after:bg-black after:z-10 after:top-0 after:left-0 after:w-full after:h-full after:opacity-55"
        style={{
          background: `url(${Background})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
   
        <h2 className="z-20 text-4xl absolute top-1/2 left-1/2 text-white font-semibold">
          About us
        </h2>
      </div>
      <div className="sm:w-3/4 w-full mx-auto mb-20 px-5">
        <div className="my-10 mx-auto gap-10 flex sm:flex-row flex-col items-center justify-center">
          <div className="sm:w-1/2 w-full">
            <h2 className="text-lg font-semibold">About ejobs</h2>
            <p className="text-sm">
              eJobs is one job site in the world with over 250M unique visitors
              every month. eJobs strives to put job seekers first, giving them
              free access to search for jobs, post resumes, and research
              companies. Every day, we connect millions of people to new
              opportunities and help you hire local professionals for all your
              service needs. From repairing your car to planning your wedding,
              to recruiting administrative staffs. eJobs connects you with the
              best service business to get things done. We associate qualified
              experts to their truly amazing lines of work and bosses to the
              best ability to assist with developing their organizations.
            </p>
            <h3 className="text-lg font-semibold mt-6">
              Changing human asset and usefulness in Nigeria
            </h3>
            <p className="text-sm">
              eJobs began as an establishment and an organization with the quest
              for new employment stage. however has developed into a
              comprehensive profession stage offering on the web vocation
              exhortation, customized the answers for the two people and
              organizations as well as preparing administrations for jobseekers.
              however, our strong mission of associating ability to open doors,
              there are loads of motivations to come band together with us in
              making progress in your profession. thus, multiple million
              individuals every year trust us to assist them with succeeding at
              work, from proficient headway and abilities working to getting a
              new line of works
            </p>
          </div>
          <div className="sm:w-1/2 w-full ">
            <img src={Background} alt="" />
          </div>
        </div>
        {/* second section */}
        <div className="h-72 my-20 mx-auto gap-10 flex sm:flex-row-reverse flex-col items-center justify-center">
          <div className="sm:w-1/2 w-full">
            <div>
              <h2 className="text-lg font-semibold mt-6">Our Mission</h2>
              <p className="text-sm">
                8t eJobs, our mission is to assist individuals with landing
                positions. We have in excess of 11,500 worldwide representatives
                energetically chasing after this reason and further developing
                the enlistment venture through genuine stories and information.
                We cultivate a cooperative work environment that endeavors to
                make the best insight for work searchers.
              </p>
            </div>
            <div>
              <h2 className="text-lg font-semibold mt-6">Our Vision</h2>
              <p className="text-sm">
                To be global most client driven and straightforward career
                ecosystem, where we interface the right up-and-comers with the
                ideal open doors.
              </p>
            </div>
            <div>
              <h2 className="text-lg font-semibold mt-6">Our core value</h2>
              <p className="text-sm">
                We see ourselves as pace settlers and accordingly our basic
                beliefs are performance, accountability, Zontinuous learning and
                Excellence.
              </p>
            </div>
          </div>
          <div className="w-1/2 h-full object-cover overflow-hidden">
            <img src={Background2} alt="" />
          </div>
        </div>
        {/* Our three core values */}

        {/* Service ssection */}
        <h2 className="text-2xl capitalize">Our services</h2>
        <p>
          We are more than enlistment or job site, itjs a journey and etjobs is
          there at each progression, from when you are schooling, to graduation,
          to jobtseeking, to gainning a proud and sufficient job and earning
          good living. eJobs all the way with you
        </p>
        <div>
          <li className="text-xl font-semibold mt-4">
            Recruitment/Talent acquisitioÁ
          </li>
          <p>
            8s an organization, our human resources group is focused on getting
            your neccessities the specific prerequites of the job you are
            attempting to fill across all levels and tracking down the best
            counterpart for your organization
          </p>
        </div>
        <div>
          <li className="text-xl font-semibold mt-4">Youth Engagement</li>
          <p>
            We sort out a progression of career fairs and employability
            trainings, including oursoft skils trainging, for work searchers.
            This gives them a bit of knowledge into what makes them employable
            which benefits themselves and the labour force
          </p>
        </div>
        <div>
          <li className="text-xl font-semibold mt-4">Assessment</li>
          <p>
            ook past the Z, see whether job searchers can do what their Z says.
            this is psychometric and capability based testing, organized by
            specialists and are amazing indicators of a copetitors ccapacity to
            play out the errands expected for the job
          </p>
        </div>
        <div>
          <li className="text-xl font-semibold mt-4">CV Services</li>
          <p>
            ou have the ability. However, how would you introduce yourself® with
            eJobs Z administrations, you can build your meeting chance with our
            outstanding Z today± rowse on of our serious composed bundles and
            have your Z expertly composed
          </p>
        </div>
        <div>
          <li className="text-xl font-semibold mt-4">HR Data Analytics</li>
          <p>
            with a developing database of over 2million job seekers and 60,000
            managers, we approach interesting experiences into job searcher and
            business conduct and patterns which can be utilized for educational
            program advancement, item improvement, abilities hole investigation
            and pay studies
          </p>
        </div>
        <div>
          <li className="text-xl font-semibold mt-4">Job Seeker Allowance</li>
          <p>
            With eJobs, job seekers are at grace of recieving an up keep
            token°stipend pending when you get employed. 8nd which allowance
            will later be deducted from your later salary monthly or as you may
            prefer.Recruitment talent acquisitio§
          </p>
        </div>
      </div>
  
    </div>
  );
}

export default AboutUs;
