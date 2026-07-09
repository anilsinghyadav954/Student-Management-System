import { Link } from "react-router-dom";
import { FiLock, FiArrowLeft } from "react-icons/fi";

const Unauthorized = () => (
  <div className="min-h-screen flex items-center justify-center px-4 text-center">
    <div className="animate-fade-in">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 text-2xl">
        <FiLock />
      </div>
      <h1 className="mt-4 text-2xl font-bold text-slate-900 dark:text-white">Access denied</h1>
      <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
        You don't have permission to view this page.
      </p>
      <Link to="/login" className="btn-primary mt-6 inline-flex">
        <FiArrowLeft /> Back to Login
      </Link>
    </div>
  </div>
);

export default Unauthorized;
