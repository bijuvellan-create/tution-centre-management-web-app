/**
 * Tiny CSV helpers. Values are escaped so commas, quotes and newlines are
 * safe. A UTF-8 BOM is added so Excel opens rupee/unicode text correctly.
 */

function escapeValue(value) {
  if (value === null || value === undefined) return '';
  const text = String(value);
  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

/**
 * @param {Array<object>} rows
 * @param {Array<{ label: string, value: (row) => any }>} columns
 */
export function toCsv(rows, columns) {
  const header = columns.map((c) => escapeValue(c.label)).join(',');
  const lines = rows.map((row) => columns.map((c) => escapeValue(c.value(row))).join(','));
  return `${header}\n${lines.join('\n')}\n`;
}

/** Sends a CSV download response. */
export function sendCsv(res, filename, csv) {
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(`\uFEFF${csv}`);
}
