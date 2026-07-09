/**
 * Simple, reusable loading spinner.
 * `fullScreen` centers it in the viewport (used for route-level loading states).
 * Otherwise it renders inline (used inside buttons, cards, small sections).
 */
const Loader = ({ fullScreen = false, size = "md" }) => {
  const sizeClasses = {
    sm: "h-4 w-4 border-2",
    md: "h-8 w-8 border-2",
    lg: "h-12 w-12 border-[3px]",
  };

  const spinner = (
    <div
      className={`${sizeClasses[size]} animate-spin rounded-full border-primary-600 border-t-transparent dark:border-primary-400 dark:border-t-transparent`}
      role="status"
      aria-label="Loading"
    />
  );

  if (!fullScreen) return spinner;

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-light dark:bg-surface-dark">
      {spinner}
    </div>
  );
};

export default Loader;
