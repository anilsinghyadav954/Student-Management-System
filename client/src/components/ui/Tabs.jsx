import { NavLink } from "react-router-dom";

const Tabs = ({ tabs }) => (
  <div className="flex gap-1 border-b border-slate-200 dark:border-slate-700">
    {tabs.map((tab) => (
      <NavLink
        key={tab.to}
        to={tab.to}
        end={tab.end}
        className={({ isActive }) =>
          `px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            isActive
              ? "border-primary-600 text-primary-600 dark:text-primary-400"
              : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
          }`
        }
      >
        {tab.label}
      </NavLink>
    ))}
  </div>
);

export default Tabs;
