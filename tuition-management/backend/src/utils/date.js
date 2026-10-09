import { env } from '../config/env.js';

/**
 * Dates that represent a calendar day (attendance dates, due dates) are
 * stored as UTC midnight of that day. This keeps "2026-03-01" as
 * "2026-03-01" everywhere and avoids timezone drift between the servers
 * and the users' browsers.
 */
export function parseCalendarDate(value) {
  if (value instanceof Date) {
    return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
  }
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || ''));
  if (!match) return null;
  const [, y, m, d] = match;
  const date = new Date(Date.UTC(Number(y), Number(m) - 1, Number(d)));
  // Reject impossible dates like 2026-02-31.
  if (date.getUTCMonth() !== Number(m) - 1 || date.getUTCDate() !== Number(d)) return null;
  return date;
}

/** Returns today's calendar date in the configured timezone as "YYYY-MM-DD". */
export function todayCalendarString(timeZone = env.timezone) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

/** Formats a stored calendar Date back to "YYYY-MM-DD". */
export function formatCalendarDate(date) {
  if (!date) return null;
  return new Date(date).toISOString().slice(0, 10);
}
