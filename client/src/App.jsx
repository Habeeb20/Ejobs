import { Routes, Route } from "react-router-dom";
import { Toaster } from "sonner";

import Onboarding from "./pages/auth/Onboarding";
import Login from "./pages/auth/Login";
import Dashboard from "./pages/dashboard/Dashboard";
import AdminLogin from "./pages/superAdmin/AdminLogin";
import JobPage from "./pages/home/JobPage";
import PublicJobDetails from "./pages/home/PublicJobdetails";
import Landingpage from "./pages/home/Landingpage";
import InterviewArticlePage from "./components/home/InterviewArticlePage";
import InterviewTipsHub from "./components/home/InterviewTipsHub";
import StatisticsPage from "./components/home/StatisticsPage";
import PublicBlacklist from "./pages/home/PublicBlacklist";
import EmployerList from "./pages/employer/Employerlist";
import EmployerDetails from "./pages/employer/EmployersDetails";
import NotFound from "./pages/home/NotFound";
import AboutUs from "./pages/home/AboutUs";
import VerifyCallback from "./hooks/VerifyCallback";
import InterviewRoom from "./pages/interview/InterviewRoom";
import RecruitmentDetailPage from "./pages/recruitment/RecruitmentDetailsPage";
import MyRecruitmentsPage from "./pages/recruitment/MyRecruitment";
import RecruitmentOrderPage from "./pages/recruitment/RecruitmentOrderPage";
import RecruitmentPlansPage from "./pages/recruitment/RecruitmentPlans";
import AdminRecruitmentDetailsPage from "./pages/admin/AdminRecruitmentDetailsPage";
import Contact from "./pages/home/ContactUs";
import Layout from "./components/Layout";

export default function App() {
  return (
    <>
      <Toaster
        position="top-center"
        richColors
        closeButton
        toastOptions={{
          className: "pointer-events-auto", // make sure it's clickable
          style: {
            zIndex: 10000, // above your modals
            minWidth: "320px",
          },
        }}
      />

      <Routes>
        {/* Layout renders Navbar + page + Footer, with the footer pinned to the bottom */}
        <Route element={<Layout />}>
          <Route path="/" element={<Landingpage />} />

          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="/signup" element={<Onboarding />} />
          <Route path="/register" element={<Onboarding />} />
          <Route path="/login" element={<Login />} />

          <Route path="/jobs" element={<JobPage />} />
          <Route path="/jobs/:id" element={<PublicJobDetails />} />

          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/admin" element={<Dashboard />} />
          <Route path="/agent" element={<Dashboard />} />
          <Route path="/jobseeker" element={<Dashboard />} />
          <Route path="/employer" element={<Dashboard />} />

          <Route path="/employers/:id" element={<EmployerDetails />} />
          <Route path="/employers" element={<EmployerList />} />
          <Route path="/companies" element={<EmployerList />} />

          <Route path="/contact" element={<Contact />} />
          <Route path="/aboutus" element={<AboutUs />} />
          <Route path="/about" element={<AboutUs />} />

          <Route path="/interview-tips/:slug" element={<InterviewArticlePage />} />
          <Route path="/interview-tips" element={<InterviewTipsHub />} />
          <Route path="/statistics" element={<StatisticsPage />} />
          <Route path="/blacklist" element={<PublicBlacklist />} />
          <Route path="/verify/callback" element={<VerifyCallback />} />

          <Route path="/employer/recruitment" element={<RecruitmentPlansPage />} />
          <Route path="/employer/recruitment/requests" element={<MyRecruitmentsPage />} />
          <Route path="/employer/recruitment/requests/:id" element={<RecruitmentDetailPage />} />
          <Route path="/employer/recruitment/new/:plan" element={<RecruitmentOrderPage />} />

          <Route path="/admin/recruitment/:id" element={<AdminRecruitmentDetailsPage />} />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/interview/:id" element={<InterviewRoom />} />

          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </>
  );
}