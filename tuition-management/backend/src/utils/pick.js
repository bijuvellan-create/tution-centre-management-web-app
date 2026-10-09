/**
 * Returns a new object containing only the allowed keys from source.
 * Used to prevent "mass assignment": a client cannot set protected fields
 * like role, studentId, recordedBy, createdAt, etc.
 */
export function pick(source, keys) {
  const out = {};
  if (!source) return out;
  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(source, key)) {
      out[key] = source[key];
    }
  }
  return out;
}

export default pick;
