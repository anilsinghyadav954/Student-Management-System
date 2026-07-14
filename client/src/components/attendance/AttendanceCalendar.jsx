import { useState } from "react";
import Modal from "../ui/Modal.jsx";

const STATUS_STYLES = {
  present: { bg: "bg-green-500", label: "Present" },
  absent: { bg: "bg-red-500", label: "Absent" },
  leave: { bg: "bg-amber-400", label: "Leave" },
  late: { bg: "bg-green-500", label: "Present" }, // treated visually as present (counted as present in %)
  "half-day": { bg: "bg-amber-400", label: "Half-day" },
  holiday: { bg: "bg-blue-500", label: "Holiday" },
  sunday: { bg: "bg-slate-700", label: "Sunday" },
};

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/**
 * @param days [{ date: "YYYY-MM-DD", status: "present"|"absent"|"leave"|"holiday"|"sunday"|null, title?, reason?, notes? }]
 */
const AttendanceCalendar = ({ days }) => {
  const [selectedDay, setSelectedDay] = useState(null);

  if (!days || days.length === 0) return null;

  // Determine the weekday of the 1st of the month to pad the grid so
  // dates line up under the correct weekday column.
  const firstDayOfWeek = new Date(`${days[0].date}T00:00:00Z`).getUTCDay();
  const leadingBlanks = Array.from({ length: firstDayOfWeek }, (_, i) => `blank-${i}`);

  const handleClick = (day) => {
    if (day.status === "holiday") setSelectedDay(day);
  };

  return (
    <div>
      <div className="grid grid-cols-7 gap-1.5 text-center">
        {WEEKDAY_LABELS.map((label) => (
          <div key={label} className="pb-1 text-xs font-medium text-slate-400">
            {label}
          </div>
        ))}

        {leadingBlanks.map((key) => (
          <div key={key} />
        ))}

        {days.map((day) => {
          const dayNum = Number(day.date.split("-")[2]);
          const style = STATUS_STYLES[day.status];
          const isClickable = day.status === "holiday";

          return (
            <button
              key={day.date}
              type="button"
              onClick={() => handleClick(day)}
              disabled={!isClickable}
              title={style ? style.label : "Not yet marked"}
              className={`flex aspect-square flex-col items-center justify-center rounded-lg text-xs font-medium transition-transform
                ${style ? `${style.bg} text-white` : "bg-slate-100 text-slate-400 dark:bg-slate-700 dark:text-slate-500"}
                ${isClickable ? "cursor-pointer hover:scale-105" : "cursor-default"}`}
            >
              {dayNum}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-4 flex flex-wrap gap-3 text-xs text-slate-500 dark:text-slate-400">
        <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-full bg-green-500" /> Present</span>
        <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-full bg-red-500" /> Absent</span>
        <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-full bg-amber-400" /> Leave</span>
        <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-full bg-blue-500" /> Holiday</span>
        <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-full bg-slate-700" /> Sunday</span>
      </div>

      <Modal open={!!selectedDay} title="Holiday Details" onClose={() => setSelectedDay(null)} maxWidth="max-w-sm">
        {selectedDay && (
          <div className="space-y-2 text-sm">
            <p><span className="font-medium text-slate-700 dark:text-slate-200">Date:</span> {selectedDay.date}</p>
            <p><span className="font-medium text-slate-700 dark:text-slate-200">Title:</span> {selectedDay.title}</p>
            <p><span className="font-medium text-slate-700 dark:text-slate-200">Reason:</span> {selectedDay.reason}</p>
            {selectedDay.notes && (
              <p><span className="font-medium text-slate-700 dark:text-slate-200">Notes:</span> {selectedDay.notes}</p>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default AttendanceCalendar;