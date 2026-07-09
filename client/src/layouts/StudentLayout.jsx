import { useEffect, useState } from "react";
import { Outlet } from "react-router-dom";
import { toast } from "react-toastify";
import { FiGrid, FiCheckSquare, FiBookOpen, FiBell, FiUser } from "react-icons/fi";
import Sidebar from "../components/Sidebar.jsx";
import Topbar from "../components/Topbar.jsx";
import Loader from "../components/ui/Loader.jsx";
import { studentService } from "../services/studentService";

const studentNavItems = [
  { to: "/student/dashboard", label: "Dashboard", icon: FiGrid },
  { to: "/student/attendance", label: "Attendance", icon: FiCheckSquare },
  { to: "/student/marks", label: "Marks", icon: FiBookOpen },
  { to: "/student/notices", label: "Notice Board", icon: FiBell },
  { to: "/student/profile", label: "Profile", icon: FiUser },
];

const StudentLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [studentProfile, setStudentProfile] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(true);

  // Fetched once here (not in every child page) since attendance, marks,
  // and the dashboard all need this student's own Student._id.
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const { data } = await studentService.getMyProfile();
        setStudentProfile(data.data);
      } catch (error) {
        toast.error("Failed to load your academic profile");
      } finally {
        setLoadingProfile(false);
      }
    };
    fetchProfile();
  }, []);

  return (
    <div className="flex min-h-screen w-full overflow-x-hidden bg-surface-light dark:bg-surface-dark">
      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        navItems={studentNavItems}
        brandLabel="SMS Student"
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar onMenuClick={() => setSidebarOpen(true)} profilePath="/student/profile" />
        <main className="flex-1 p-4 sm:p-6">
          {loadingProfile ? <Loader /> : <Outlet context={{ studentProfile }} />}
        </main>
      </div>
    </div>
  );
};

export default StudentLayout;
