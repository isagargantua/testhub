// Clamp pagination query params to safe positive integers. Without this,
// `?page=abc` or `?page=-1` produce NaN/negative `skip`, which makes Prisma
// throw and the route 500s. Mirrors the clamping auth-service already does on
// its /users route.
function parsePagination(query, { defaultLimit = 10, maxLimit = 100 } = {}) {
  const page = Math.max(Number(query.page) || 1, 1);
  const limit = Math.min(
    Math.max(Number(query.limit) || defaultLimit, 1),
    maxLimit,
  );

  return { page, limit, skip: (page - 1) * limit };
}

// Prisma throws P2025 ("record to update/delete not found") when an update or
// delete targets a row that doesn't exist. That's a 404, not a 500.
function isNotFoundError(error) {
  return Boolean(error) && error.code === "P2025";
}

// RFC 4180 CSV field escaping: quote and double-up internal quotes if the value
// contains a comma, quote, or newline. Shared by the run and test-case exporters.
function csvEscape(value) {
  const str = value === null || value === undefined ? "" : String(value);

  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }

  return str;
}

module.exports = { parsePagination, isNotFoundError, csvEscape };
