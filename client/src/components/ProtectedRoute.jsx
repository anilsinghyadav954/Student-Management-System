import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import Loader from "./ui/Loader.jsx";

/**
 * Wraps a route (or set of nested routes) and enforces:
 *  1. The user must be authenticated (has a valid session)
 *  2. If `allowedRoles` is passed, the user's role must be included
 *
 * Usage:
 *   <ProtectedRoute allowedRoles={["admin"]}><AdminDashboard /></ProtectedRoute>
 */
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading, isAuthenticated } = useAuth();
  const location = useLocation();

  // Still verifying the session (e.g. on page refresh) — show a loader
  // instead of flashing a redirect to /login prematurely.
  if (loading) {
    return <Loader fullScreen />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Logged in, but wrong role (e.g. a student hitting an /admin route)
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
};

export default ProtectedRoute;
