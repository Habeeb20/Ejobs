import { Routes, Route, Navigate } from "react-router-dom";
import Onboarding from "./pages/auth/Onboarding";

import { Toaster } from 'sonner'; 
import Login from "./pages/auth/Login";
import Dashboard from "./pages/dashboard/Dashboard";
import AdminLogin from "./pages/superAdmin/AdminLogin";
import JobPage from "./pages/home/JobPage";

import PublicJobDetails from "./pages/home/PublicJobdetails";

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

      <Route path="/" element={<Navigate to="/onboarding" replace />} />
      <Route path="/onboarding" element={<Onboarding />} />
      <Route path="/signup" element={<Onboarding />} />
      <Route path="/register" element={<Onboarding />} />
      <Route path="/login" element={<Login />} />
      <Route path="/jobs" element={< JobPage/>} />
      <Route path="/jobs/:id" element={< PublicJobDetails/>} />
      <Route path="/dashboard" element={<Dashboard />} />


      <Route path="/agent" element={<Dashboard />} />
      <Route path="/jobseeker" element={<Dashboard />} />
      <Route path="/employer" element={<Dashboard />} />

        <Route path="/admin/login" element={<AdminLogin />} />


      
    </Routes>
    </>
   
  );
}
