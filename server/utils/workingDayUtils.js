import Holiday from "../models/Holiday.js";

export const toMidnightUTC = (date) => {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  return d;
};


export const isSunday = (date) => new Date(date).getUTCDay() === 0;

export const findActiveHoliday = async (date) => {
  const day = toMidnightUTC(date);
  return Holiday.findOne({ date: day, status: "active" });
};

export const getNonWorkingDayInfo = async (date) => {
  if (isSunday(date)) {
    return {
      blocked: true,
      reason: "sunday",
      title: "Sunday",
      description: "Sundays are always non-working days.",
    };
  }

  const holiday = await findActiveHoliday(date);
  if (holiday) {
    return {
      blocked: true,
      reason: "holiday",
      title: holiday.title,
      description: holiday.reason,
      notes: holiday.notes,
    };
  }

  return { blocked: false };
};