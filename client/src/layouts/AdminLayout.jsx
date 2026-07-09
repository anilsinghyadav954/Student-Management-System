import { useState } from "react";
import { Outlet } from "react-router-dom";
import { FiGrid, FiUsers, FiCheckSquare, FiBookOpen, FiBell, FiUser } from "react-icons/fi";
import Sidebar from "../components/Sidebar.jsx";
import Topbar from "../components/Topbar.jsx";

const adminNavItems = [
  { to: "/admin/dashboard", label: "Dashboard", icon: FiGrid },
  { to: "/admin/students", label: "Students", icon: FiUsers },
  { to: "/admin/attendance", label: "Attendance", icon: FiCheckSquare },
  { to: "/admin/marks", label: "Marks", icon: FiBookOpen },
  { to: "/admin/notices", label: "Notices", icon: FiBell },
  { to: "/admin/profile", label: "Profile", icon: FiUser },
];

const AdminLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen w-full overflow-x-hidden bg-surface-light dark:bg-surface-dark">
      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        navItems={adminNavItems}
        brandLabel="SMS Admin"
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar onMenuClick={() => setSidebarOpen(true)} profilePath="/admin/profile" />
        <main className="flex-1 p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
