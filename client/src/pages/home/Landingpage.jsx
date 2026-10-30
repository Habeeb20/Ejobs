// import React from 'react'
// import Hero from '../../components/home/Hero'
// import AdBanner from '../ads/AdBanner'

// const Landingpage = () => {
//   return (
//     <div>
//         <Hero/>
//         <AdBanner />
      
//     </div>
//   )
// }

// export default Landingpage



import React from 'react'
import Hero from '../../components/home/Hero'
import AdBanner from '../ads/AdBanner'
import JobGrid from '../../components/home/JobGrid'
import StatsGrid from '../../components/home/statsGrid'
import InterviewTipsHub from '../../components/home/InterviewTipsHub'
import RegisterBanner from '../../components/home/RegisterBanner'
import IndustryGrid from '../../components/home/IndustryGrid'
import JobChanger from '../../components/home/JobChanger'

const Landingpage = () => {
  return (
    <div>
      {/* Hero stays full width so its background image reaches both edges */}
      <div className="w-full">
        <Hero />
      </div>

      {/* Ad banner: centered, capped width, side padding on mobile */}
      <div className="mx-auto w-full max-w-9xl px-4 sm:px-6 my-8">
        <AdBanner />
      </div>
      <StatsGrid/>
      <JobGrid />
      <InterviewTipsHub/>
      <RegisterBanner />
      <IndustryGrid/>
      <JobChanger />
    </div>
  )
}

export default Landingpage