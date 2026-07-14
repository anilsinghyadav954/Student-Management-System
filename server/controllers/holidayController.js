import asyncHandler from "express-async-handler";
import Holiday from "../models/Holiday.js";
import { sendResponse, getPagination, buildMeta } from "../utils/apiResponse.js";
import { getNonWorkingDayInfo, toMidnightUTC } from "../utils/workingDayUtils.js";

/**
 * @desc   Create a holiday. Any title/reason — nothing hardcoded.
 * @route  POST /api/holidays
 * @access Private/Admin
 */
export const createHoliday = asyncHandler(async (req, res) => {
  const { date, title, reason, notes, status } = req.body;

  const existing = await Holiday.findOne({ date: toMidnightUTC(date) });
  if (existing) {
    res.status(400);
    throw new Error("A holiday already exists on this date. Edit it instead of creating a new one.");
  }

  const holiday = await Holiday.create({
    date,
    title,
    reason,
    notes,
    status: status || "active",
    createdBy: req.user._id,
  });

  sendResponse(res, 201, "Holiday created successfully", holiday);
});

/**
 * @desc   Update a holiday (date, title, reason, notes, status all editable)
 * @route  PUT /api/holidays/:id
 * @access Private/Admin
 */
export const updateHoliday = asyncHandler(async (req, res) => {
  const holiday = await Holiday.findById(req.params.id);
  if (!holiday) {
    res.status(404);
    throw new Error("Holiday not found");
  }

  const { date, title, reason, notes, status } = req.body;

  if (date && toMidnightUTC(date).getTime() !== holiday.date.getTime()) {
    const clash = await Holiday.findOne({ date: toMidnightUTC(date), _id: { $ne: holiday._id } });
    if (clash) {
      res.status(400);
      throw new Error("Another holiday already exists on that date");
    }
    holiday.date = date;
  }

  if (title !== undefined) holiday.title = title;
  if (reason !== undefined) holiday.reason = reason;
  if (notes !== undefined) holiday.notes = notes;
  if (status !== undefined) holiday.status = status;

  await holiday.save();
  sendResponse(res, 200, "Holiday updated successfully", holiday);
});

/**
 * @desc   Delete a holiday
 * @route  DELETE /api/holidays/:id
 * @access Private/Admin
 */
export const deleteHoliday = asyncHandler(async (req, res) => {
  const holiday = await Holiday.findByIdAndDelete(req.params.id);
  if (!holiday) {
    res.status(404);
    throw new Error("Holiday not found");
  }
  sendResponse(res, 200, "Holiday deleted successfully");
});

/**
 * @desc   List all holidays, paginated, newest first. Optional ?year= filter.
 * @route  GET /api/holidays?year=&page=&limit=
 * @access Private/Admin
 */
export const getHolidays = asyncHandler(async (req, res) => {
  const { year } = req.query;
  const { page, limit, skip } = getPagination(req.query, 20);

  const filter = {};
  if (year) {
    filter.date = {
      $gte: new Date(Date.UTC(Number(year), 0, 1)),
      $lte: new Date(Date.UTC(Number(year), 11, 31, 23, 59, 59)),
    };
  }

  const [holidays, total] = await Promise.all([
    Holiday.find(filter).sort({ date: -1 }).skip(skip).limit(limit),
    Holiday.countDocuments(filter),
  ]);

  sendResponse(res, 200, "Holidays fetched successfully", holidays, buildMeta(page, limit, total));
});

/**
 * @desc   Get all active holidays within a given month (used to render the
 *         🔵 markers on the attendance calendar without a separate call
 *         per day).
 * @route  GET /api/holidays/month?month=&year=
 * @access Private (any authenticated user — students need this for their
 *         own calendar view too)
 */
export const getHolidaysForMonth = asyncHandler(async (req, res) => {
  const { month, year } = req.query;
  const start = new Date(Date.UTC(Number(year), Number(month) - 1, 1));
  const end = new Date(Date.UTC(Number(year), Number(month), 0, 23, 59, 59));

  const holidays = await Holiday.find({ date: { $gte: start, $lte: end }, status: "active" }).sort({ date: 1 });
  sendResponse(res, 200, "Holidays fetched successfully", holidays);
});

/**
 * @desc   Check whether a specific date is a working day. Used by the
 *         frontend BEFORE loading the attendance-marking grid (so the UI
 *         can show "Attendance Disabled" immediately), and internally by
 *         attendanceController to enforce the same rule server-side.
 * @route  GET /api/holidays/check?date=
 * @access Private/Admin
 */
export const checkDateStatus = asyncHandler(async (req, res) => {
  const { date } = req.query;
  if (!date) {
    res.status(400);
    throw new Error("date query parameter is required");
  }

  const info = await getNonWorkingDayInfo(date);
  sendResponse(res, 200, "Date status checked", info);
});