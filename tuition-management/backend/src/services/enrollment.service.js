import Batch from '../models/Batch.js';
import Student from '../models/Student.js';
import { ApiError } from '../utils/ApiError.js';

/**
 * Adds a student to a batch (and records the batch's course on the student).
 * Enforces the batch capacity so it can never be overfilled.
 */
export async function enrollStudentInBatch(student, batch) {
  if (!batch) return;
  const already = (batch.students || []).some((id) => String(id) === String(student._id));
  if (already) return;

  if ((batch.students || []).length >= batch.capacity) {
    throw new ApiError(409, `Batch "${batch.name}" is full (capacity ${batch.capacity}).`);
  }

  await Batch.updateOne({ _id: batch._id }, { $addToSet: { students: student._id } });
  if (batch.course) {
    await Student.updateOne({ _id: student._id }, { $addToSet: { courses: batch.course } });
  }
}

/** Removes a student from a batch (does not touch fee or attendance history). */
export async function unenrollStudentFromBatch(studentId, batchId) {
  if (!batchId) return;
  await Batch.updateOne({ _id: batchId }, { $pull: { students: studentId } });
}
