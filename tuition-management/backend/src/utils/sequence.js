import Counter from '../models/Counter.js';

/**
 * Atomically increments and returns the next number for a named counter.
 * findOneAndUpdate with upsert means two requests can never get the same value.
 */
export async function nextSequence(key) {
  const doc = await Counter.findOneAndUpdate(
    { _id: key },
    { $inc: { seq: 1 } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
  return doc.seq;
}

function pad(value, size) {
  return String(value).padStart(size, '0');
}

/** e.g. STU-0001 */
export async function nextStudentId() {
  const n = await nextSequence('student');
  return `STU-${pad(n, 4)}`;
}

/** e.g. TCH-0001 */
export async function nextTeacherId() {
  const n = await nextSequence('teacher');
  return `TCH-${pad(n, 4)}`;
}

/** e.g. RCP-2026-00042 */
export async function nextReceiptNumber() {
  const year = new Date().getFullYear();
  const n = await nextSequence(`receipt:${year}`);
  return `RCP-${year}-${pad(n, 5)}`;
}
