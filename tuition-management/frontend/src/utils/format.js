/** Formatting helpers shared across the UI. */

export function formatINR(paise) {
  const value = Number(paise || 0) / 100;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
  }).format(value);
}

export function rupeesToPaise(rupees) {
  const value = Number(rupees);
  if (!Number.isFinite(value)) return NaN;
  return Math.round(value * 100);
}

export function paiseToRupees(paise) {
  return Number(paise || 0) / 100;
}

/** Turns a Date/ISO string into "12 Mar 2026". */
export function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

/** Today as "YYYY-MM-DD" for <input type="date"> in local time. */
export function todayInputValue() {
  const now = new Date();
  const off = now.getTimezoneOffset();
  return new Date(now.getTime() - off * 60000).toISOString().slice(0, 10);
}

export function initials(name) {
  if (!name) return '?';
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('');
}

export function titleCase(value) {
  if (!value) return '';
  return String(value).replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}
