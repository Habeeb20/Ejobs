import { Routes, Route, Navigate } from "react-router-dom";
import Onboarding from "./pages/auth/Onboarding";

import { Toaster } from 'sonner'; 
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

export default function App() {
  return (
    <>
               <Toaster
  position="top-center"
  richColors
  closeButton
  toastOptions={{
    className: 'pointer-events-auto',      // make sure clickable
    style: {
      zIndex: 10000,                       // above your modals
      minWidth: '320px'
    }
  }}
/>
     <Routes>

      <Route path="/" element={<Landingpage />} />
      <Route path="*" element={<  NotFound />} />
      <Route path="/onboarding" element={<Onboarding />} />
      <Route path="/signup" element={<Onboarding />} />
    
      <Route path="/register" element={<Onboarding />} />
      <Route path="/login" element={<Login />} />
      <Route path="/jobs" element={< JobPage/>} />
      <Route path="/jobs/:id" element={< PublicJobDetails/>} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/employers/:id" element={<EmployerDetails />} />
      <Route path="/admin" element={<Dashboard />} />
      <Route path="/interview-tips/:slug" element={<InterviewArticlePage />} />
      <Route path="/interview-tips" element={<InterviewTipsHub />} />
  <Route path="/statistics" element={<StatisticsPage />} />
  <Route path="/companies" element={<EmployerList />} />
  <Route path="/employers" element={<EmployerList />} />
  <Route path="/aboutus" element={<AboutUs />} />
    <Route path="/verify/callback" element={<VerifyCallback />} />

      <Route path="/agent" element={<Dashboard />} />
      <Route path="/jobseeker" element={<Dashboard />} />
      <Route path="/employer" element={<Dashboard />} />
      <Route path="/blacklist" element={<PublicBlacklist />} />

        <Route path="/admin/login" element={<AdminLogin />} />


      
    </Routes>
    </>
   
  );
}
