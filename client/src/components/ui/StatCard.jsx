const colorMap = {
  primary: "bg-primary-50 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400",
  green: "bg-green-50 text-green-600 dark:bg-green-900/30 dark:text-green-400",
  amber: "bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400",
  red: "bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400",
};

const StatCard = ({ label, value, icon: Icon, color = "primary", suffix = "" }) => (
  <div className="card flex items-center gap-4 transition-shadow hover:shadow-card-hover">
    <div className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl text-xl ${colorMap[color]}`}>
      <Icon />
    </div>
    <div className="min-w-0">
      <p className="truncate text-xs font-medium text-slate-500 dark:text-slate-400">{label}</p>
      <p className="text-2xl font-bold text-slate-900 dark:text-white">
        {value}
        {suffix}
      </p>
    </div>
  </div>
);

export default StatCard;
