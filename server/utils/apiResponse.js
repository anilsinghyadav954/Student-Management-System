/**
 * Standardizes every successful API response into the same shape so the
 * frontend can rely on { success, message, data, meta } everywhere.
 *
 * @param {import('express').Response} res
 * @param {number} statusCode
 * @param {string} message
 * @param {*} [data]
 * @param {Object} [meta] - e.g. pagination info { page, pages, total }
 */
export const sendResponse = (res, statusCode, message, data = null, meta = null) => {
  const body = { success: true, message };
  if (data !== null) body.data = data;
  if (meta !== null) body.meta = meta;
  return res.status(statusCode).json(body);
};

/**
 * Builds a Mongoose-ready pagination object from query params.
 * Usage: const { skip, limit, page } = getPagination(req.query);
 */
export const getPagination = (query, defaultLimit = 10) => {
  const page = Math.max(Number(query.page) || 1, 1);
  const limit = Math.max(Number(query.limit) || defaultLimit, 1);
  const skip = (page - 1) * limit;
  return { page, limit, skip };
};

export const buildMeta = (page, limit, total) => ({
  page,
  limit,
  total,
  pages: Math.ceil(total / limit) || 1,
});
