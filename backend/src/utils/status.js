/**
 * Inventory status policy (single source of truth).
 *
 * Dates: expiry dates are calendar dates (stored as Postgres DATE, read as UTC midnight).
 * "Today" is the calendar date in Africa/Lagos (UTC+1, no DST). A batch is usable through
 * its expiry date and counts as EXPIRED the day after.
 *
 *   quantity <= 0            -> OUT_OF_STOCK
 *   expiry before today      -> EXPIRED
 *   expiry within 30 days    -> NEAR_EXPIRY
 *   quantity <= 50           -> LOW_STOCK
 *   otherwise                -> HEALTHY
 */
const NEAR_EXPIRY_DAYS = 30;
const LOW_STOCK_THRESHOLD = 50;
const DAY_MS = 86400000;
const LAGOS_OFFSET_MS = 3600000;

function todayLagosUtcMs(now = new Date()) {
  const t = new Date(now.getTime() + LAGOS_OFFSET_MS);
  return Date.UTC(t.getUTCFullYear(), t.getUTCMonth(), t.getUTCDate());
}

function toUtcDayMs(d) {
  const e = new Date(d);
  return Date.UTC(e.getUTCFullYear(), e.getUTCMonth(), e.getUTCDate());
}

function daysToExpiry(expiryDate, now = new Date()) {
  return Math.round((toUtcDayMs(expiryDate) - todayLagosUtcMs(now)) / DAY_MS);
}

function computeStatus({ quantity, expiryDate }, now = new Date()) {
  if (quantity <= 0) return 'OUT_OF_STOCK';
  const days = daysToExpiry(expiryDate, now);
  if (days < 0) return 'EXPIRED';
  if (days <= NEAR_EXPIRY_DAYS) return 'NEAR_EXPIRY';
  if (quantity <= LOW_STOCK_THRESHOLD) return 'LOW_STOCK';
  return 'HEALTHY';
}

function parseDateOnly(str) {
  return new Date(`${str}T00:00:00.000Z`);
}

function isoDate(d) {
  return new Date(d).toISOString().slice(0, 10);
}

module.exports = { NEAR_EXPIRY_DAYS, LOW_STOCK_THRESHOLD, computeStatus, daysToExpiry, todayLagosUtcMs, parseDateOnly, isoDate };
