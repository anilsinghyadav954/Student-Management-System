import { Routes, Route, Navigate } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import { useAuth } from "./context/AuthContext.jsx";
import { useTheme } from "./context/ThemeContext.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import Loader from "./components/ui/Loader.jsx";

import Login from "./pages/auth/Login.jsx";
import ForgotPassword from "./pages/auth/ForgotPassword.jsx";
import VerifyOtp from "./pages/auth/VerifyOtp.jsx";
import ResetPassword from "./pages/auth/ResetPassword.jsx";

import AdminLayout from "./layouts/AdminLayout.jsx";
import AdminDashboard from "./pages/admin/AdminDashboard.jsx";
import StudentList from "./pages/admin/students/StudentList.jsx";
import StudentView from "./pages/admin/students/StudentView.jsx";
import AttendanceMark from "./pages/admin/attendance/AttendanceMark.jsx";
import AttendanceReport from "./pages/admin/attendance/AttendanceReport.jsx";
import HolidayManage from "./pages/admin/attendance/HolidayManage.jsx";
import MarksManage from "./pages/admin/marks/MarksManage.jsx";
import BulkMarksEntry from "./pages/admin/marks/BulkMarksEntry.jsx";
import ResultExport from "./pages/admin/marks/ResultExport.jsx";
import NoticeManage from "./pages/admin/notices/NoticeManage.jsx";
import AdminProfile from "./pages/admin/profile/AdminProfile.jsx";

import StudentLayout from "./layouts/StudentLayout.jsx";
import StudentDashboard from "./pages/student/StudentDashboard.jsx";
import StudentAttendance from "./pages/student/StudentAttendance.jsx";
import StudentMarks from "./pages/student/StudentMarks.jsx";
import StudentNotices from "./pages/student/StudentNotices.jsx";
import StudentProfile from "./pages/student/profile/StudentProfile.jsx";

import NotFound from "./pages/error/NotFound.jsx";
import Unauthorized from "./pages/error/Unauthorized.jsx";

function App() {
  const { loading, isAuthenticated, user } = useAuth();
  const { darkMode } = useTheme();

  if (loading) {
    return <Loader fullScreen />;
  }

  return (
    <>
      <Routes>
        <Route
          path="/"
          element={
            isAuthenticated ? (
              <Navigate to={user.role === "admin" ? "/admin/dashboard" : "/student/dashboard"} replace />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />

        {/* ---- Public auth routes ---- */}
        <Route path="/login" element={isAuthenticated ? <Navigate to="/" replace /> : <Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/verify-otp" element={<VerifyOtp />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        {/* ---- Admin routes (nested under AdminLayout: sidebar + topbar) ---- */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="students" element={<StudentList />} />
          <Route path="students/:id" element={<StudentView />} />
          <Route path="attendance" element={<AttendanceMark />} />
          <Route path="attendance/report" element={<AttendanceReport />} />
          <Route path="marks" element={<MarksManage />} />
          <Route path="marks/bulk" element={<BulkMarksEntry />} />
          <Route path="marks/export" element={<ResultExport />} />
          <Route path="notices" element={<NoticeManage />} />
          <Route path="profile" element={<AdminProfile />} />
        </Route>

        {/* ---- Student routes (nested under StudentLayout: sidebar + topbar) ---- */}
        <Route
          path="/student"
          element={
            <ProtectedRoute allowedRoles={["student"]}>
              <StudentLayout />
            </ProtectedRoute>
          }
        >
          <Route path="dashboard" element={<StudentDashboard />} />
          <Route path="attendance" element={<StudentAttendance />} />
          <Route path="marks" element={<StudentMarks />} />
          <Route path="notices" element={<StudentNotices />} />
          <Route path="profile" element={<StudentProfile />} />
        </Route>

        {/* ---- Error routes ---- */}
        <Route path="/unauthorized" element={<Unauthorized />} />
        <Route path="*" element={<NotFound />} />
      </Routes>

      <ToastContainer position="top-right" autoClose={3000} theme={darkMode ? "dark" : "light"} />
    </>
  );
}

export default App;