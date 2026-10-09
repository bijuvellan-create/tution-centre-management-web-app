import { asyncHandler } from '../utils/asyncHandler.js';
import Student from '../models/Student.js';
import Teacher from '../models/Teacher.js';
import Course from '../models/Course.js';
import Batch from '../models/Batch.js';
import Attendance from '../models/Attendance.js';
import Fee from '../models/Fee.js';
import Payment from '../models/Payment.js';
import { parseCalendarDate, todayCalendarString } from '../utils/date.js';
import { attachBalances, totalOutstanding } from '../services/fee.service.js';

/** First and last day of the current month as calendar strings. */
function currentMonthRange() {
  const today = todayCalendarString();
  const [year, month] = today.split('-');
  const start = `${year}-${month}-01`;
  const lastDay = new Date(Date.UTC(Number(year), Number(month), 0)).getUTCDate();
  const end = `${year}-${month}-${String(lastDay).padStart(2, '0')}`;
  return { start, end };
}

/**
 * GET /api/dashboard/summary
 * Returns real numbers from the database. Admins get the full picture;
 * teachers get only the information relevant to their batches.
 */
export const getSummary = asyncHandler(async (req, res) => {
  const today = todayCalendarString();
  const todayDate = parseCalendarDate(today);
  const { start, end } = currentMonthRange();
  const from = req.query.from ? parseCalendarDate(req.query.from) : parseCalendarDate(start);
  const to = req.query.to ? parseCalendarDate(req.query.to) : parseCalendarDate(end);

  // ----- Teacher view (limited) -----
  if (req.user.role === 'teacher') {
    const teacher = await Teacher.findOne({ userId: req.user._id });
    if (!teacher) {
      return res.json({
        success: true,
        data: {
          role: 'teacher',
          message: 'Your account is not linked to a teacher profile yet.',
        },
      });
    }

    const batches = await Batch.find({ teacher: teacher._id, status: 'active' }).select(
      '_id name students capacity'
    );
    const batchIds = batches.map((b) => b._id);
    const studentIds = new Set(batches.flatMap((b) => b.students.map((s) => String(s))));

    const attendanceToday = await Attendance.aggregate([
      { $match: { batch: { $in: batchIds }, date: todayDate } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);

    return res.json({
      success: true,
      data: {
        role: 'teacher',
        today,
        counts: {
          myBatches: batches.length,
          myStudents: studentIds.size,
        },
        todayAttendance: Object.fromEntries(attendanceToday.map((a) => [a._id, a.count])),
        batches: batches.map((b) => ({
          id: b._id,
          name: b.name,
          enrolled: b.students.length,
          capacity: b.capacity,
        })),
      },
    });
  }

  // ----- Admin view (full) -----
  const [
    activeStudents,
    totalTeachers,
    activeCourses,
    activeBatches,
    attendanceToday,
    collected,
    outstanding,
    overdueCount,
    recentPayments,
    recentStudents,
  ] = await Promise.all([
    Student.countDocuments({ status: 'active' }),
    Teacher.countDocuments({ status: 'active' }),
    Course.countDocuments({ status: 'active' }),
    Batch.countDocuments({ status: 'active' }),
    Attendance.aggregate([
      { $match: { date: todayDate } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
    Payment.aggregate([
      { $match: { paymentDate: { $gte: from, $lte: new Date(to.getTime() + 86399999) } } },
      { $group: { _id: null, total: { $sum: '$amountPaise' } } },
    ]),
    totalOutstanding(),
    Fee.aggregate([
      { $match: { isCancelled: false, dueDate: { $lt: todayDate } } },
      { $lookup: { from: 'payments', localField: '_id', foreignField: 'fee', as: 'payments' } },
      { $addFields: { paid: { $sum: '$payments.amountPaise' } } },
      { $match: { $expr: { $lt: ['$paid', '$amountPaise'] } } },
      { $count: 'count' },
    ]),
    Payment.find()
      .sort({ paymentDate: -1, createdAt: -1 })
      .limit(5)
      .populate('student', 'studentId fullName'),
    Student.find().sort({ createdAt: -1 }).limit(5).select('studentId fullName createdAt'),
  ]);

  res.json({
    success: true,
    data: {
      role: 'admin',
      today,
      period: { from: from?.toISOString().slice(0, 10), to: to?.toISOString().slice(0, 10) },
      counts: {
        activeStudents,
        teachers: totalTeachers,
        courses: activeCourses,
        batches: activeBatches,
      },
      todayAttendance: Object.fromEntries(attendanceToday.map((a) => [a._id, a.count])),
      fees: {
        collectedPaise: collected[0]?.total || 0,
        outstandingPaise: outstanding,
        overdueFees: overdueCount[0]?.count || 0,
      },
      recentPayments,
      recentStudents,
    },
  });
});
