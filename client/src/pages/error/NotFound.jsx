import { Link } from "react-router-dom";
import { FiHome } from "react-icons/fi";

const NotFound = () => (
  <div className="min-h-screen flex items-center justify-center px-4 text-center">
    <div className="animate-fade-in">
      <p className="text-7xl font-black text-primary-600 dark:text-primary-400">404</p>
      <h1 className="mt-4 text-2xl font-bold text-slate-900 dark:text-white">Page not found</h1>
      <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
        The page you're looking for doesn't exist or has been moved.
      </p>
      <Link to="/" className="btn-primary mt-6 inline-flex">
        <FiHome /> Back to Home
      </Link>
    </div>
  </div>
);

export default NotFound;
