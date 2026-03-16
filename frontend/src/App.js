import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import Navbar from "./components/Navbar";
import ProtectedRoute from "./components/ProtectedRoute";
import AppErrorBoundary from "./components/AppErrorBoundary";
// Page Imports
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import ProfilePage from "./pages/jobseeker/ProfilePage";
import AvailableJobsPage from "./pages/jobseeker/AvailableJobsPage";
import AppliedJobsPage from "./pages/jobseeker/AppliedJobsPage";
import DashboardPage from "./pages/jobseeker/DashboardPage";
import JobseekerLayout from './pages/jobseeker/JobseekerLayout';
import PostJobPage from "./pages/recruiter/PostJobPage";
import MyJobsPage from "./pages/recruiter/MyJobsPage";
import ApplicantsPage from "./pages/recruiter/ApplicantsPage";

export default function App() {
  const { user } = useAuth(); // Access global user state

  return (
    <BrowserRouter>
      {/* Navbar renders only once for logged-in users */}
      {user && <Navbar />}
      
      <div  className="dashboard-container">
        <AppErrorBoundary>
          <Routes>
      
          {/* Auth Routes */}
        
          <Route path="/" element={user ? <Navigate to={`/${user.role}/${user.role === "jobseeker" ? "dashboard" : "profile"}`} /> : <Login />} />
          <Route path="/register" element={<Register />} />

          {/* Job Seeker Routes - Protected by Role */}
          <Route path="/jobseeker" element={<ProtectedRoute role="jobseeker" />}>
            <Route element={<JobseekerLayout />}>
              <Route path="dashboard" element={<DashboardPage />} />
              <Route path="profile" element={<ProfilePage />} />
              <Route path="jobs" element={<AvailableJobsPage />} />
              <Route path="applied" element={<AppliedJobsPage />} />
            </Route>
          </Route>

          {/* Recruiter Routes - Protected by Role */}
          <Route path="/recruiter" element={<ProtectedRoute role="recruiter" />}>
            <Route path="profile" element={<ProfilePage />} />
            <Route path="post" element={<PostJobPage />} />
            <Route path="jobs" element={<MyJobsPage />} />
            <Route path="applicants/:jobId" element={<ApplicantsPage />} />
          </Route>
          
          {/* Fallback for undefined routes */}
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
        </AppErrorBoundary>
      </div>
    </BrowserRouter>
  );
}