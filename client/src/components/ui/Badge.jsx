const colorMap = {
  active: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  present: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  inactive: "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300",
  absent: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  suspended: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  graduated: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  late: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  "half-day": "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  high: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  normal: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  low: "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300",
};

const Badge = ({ children, status }) => {
  const classes = colorMap[status?.toLowerCase()] || "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300";
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${classes}`}>
      {children}
    </span>
  );
};

export default Badge;
