/**
 * All money is stored as an integer number of paise (1 rupee = 100 paise).
 * Integers avoid floating point rounding errors that would corrupt totals.
 */

/** Converts a rupee amount to paise, rounded to the nearest paise. */
export function rupeesToPaise(rupees) {
  const value = Number(rupees);
  if (!Number.isFinite(value)) return NaN;
  return Math.round(value * 100);
}

/** Converts paise back to a number of rupees (for display only). */
export function paiseToRupees(paise) {
  return Number(paise) / 100;
}

/** Formats paise as an Indian Rupee string, e.g. "₹1,234.50". */
export function formatINR(paise) {
  const value = paiseToRupees(paise || 0);
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
  }).format(value);
}

/** True when the value is a valid, non-negative integer amount of paise. */
export function isValidPaise(value) {
  return Number.isInteger(value) && value >= 0;
}
