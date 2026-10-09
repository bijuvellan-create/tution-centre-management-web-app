import test, { before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';

import app from '../src/app.js';
import User from '../src/models/User.js';
import { startMemoryDB, stopMemoryDB, clearDB } from './helpers/db.js';

before(startMemoryDB);
after(stopMemoryDB);
beforeEach(clearDB);

async function makeAdminToken() {
  const admin = new User({ name: 'Admin', email: 'admin@example.com', role: 'admin' });
  await admin.setPassword('Password123');
  await admin.save();
  const res = await request(app)
    .post('/api/auth/login')
    .send({ email: 'admin@example.com', password: 'Password123' });
  return res.body.data.token;
}

test('full flow: course -> teacher -> batch -> student -> attendance -> fee -> payment', async () => {
  const token = await makeAdminToken();
  const auth = { Authorization: `Bearer ${token}` };

  // Course
  const course = await request(app)
    .post('/api/courses')
    .set(auth)
    .send({ name: 'Class 10 Maths', subject: 'Maths', grade: '10', standardFeePaise: 150000 })
    .expect(201);
  const courseId = course.body.data._id;

  // Teacher
  const teacher = await request(app)
    .post('/api/teachers')
    .set(auth)
    .send({ fullName: 'Jane Doe', phone: '9999999999', subjects: ['Maths'] })
    .expect(201);
  assert.match(teacher.body.data.teacherId, /^TCH-\d{4}$/);
  const teacherId = teacher.body.data._id;

  // Batch
  const batch = await request(app)
    .post('/api/batches')
    .set(auth)
    .send({ name: 'Evening A', course: courseId, teacher: teacherId, capacity: 2, classDays: ['Mon', 'Wed'], startTime: '18:00', endTime: '19:00' })
    .expect(201);
  const batchId = batch.body.data._id;

  // Schedule conflict should be rejected (same teacher, overlapping time).
  await request(app)
    .post('/api/batches')
    .set(auth)
    .send({ name: 'Evening B', course: courseId, teacher: teacherId, capacity: 5, classDays: ['Mon'], startTime: '18:30', endTime: '19:30' })
    .expect(409);

  // Student assigned to the batch
  const student = await request(app)
    .post('/api/students')
    .set(auth)
    .send({ fullName: 'Ravi Kumar', guardianName: 'Suresh', guardianPhone: '8888888888', batch: batchId, monthlyFeePaise: 150000 })
    .expect(201);
  assert.match(student.body.data.studentId, /^STU-\d{4}$/);
  const studentId = student.body.data._id;

  // The batch roster should now contain the student.
  const batchAfter = await request(app).get(`/api/batches/${batchId}`).set(auth).expect(200);
  assert.equal(batchAfter.body.data.students.length, 1);

  // Duplicate student (same name + guardian phone) rejected.
  await request(app)
    .post('/api/students')
    .set(auth)
    .send({ fullName: 'Ravi Kumar', guardianName: 'Suresh', guardianPhone: '8888888888' })
    .expect(409);

  // Attendance: save, then re-save the same day (must update, not duplicate)
  const date = '2026-03-02';
  await request(app)
    .post('/api/attendance')
    .set(auth)
    .send({ batch: batchId, date, records: [{ student: studentId, status: 'present' }] })
    .expect(200);
  await request(app)
    .post('/api/attendance')
    .set(auth)
    .send({ batch: batchId, date, records: [{ student: studentId, status: 'late' }] })
    .expect(200);

  const attendance = await request(app)
    .get(`/api/attendance?batch=${batchId}&date=${date}`)
    .set(auth)
    .expect(200);
  assert.equal(attendance.body.meta.total, 1, 'attendance must not be duplicated');
  assert.equal(attendance.body.data[0].status, 'late');

  // Fee + payment
  const fee = await request(app)
    .post('/api/fees')
    .set(auth)
    .send({ student: studentId, title: 'March Fee', periodLabel: '2026-03', amountPaise: 150000 })
    .expect(201);
  const feeId = fee.body.data._id;

  const partial = await request(app)
    .post('/api/payments')
    .set(auth)
    .send({ fee: feeId, amountPaise: 50000, method: 'upi' })
    .expect(201);
  assert.match(partial.body.data.receiptNumber, /^RCP-\d{4}-\d{5}$/);

  // Overpayment must be rejected.
  await request(app)
    .post('/api/payments')
    .set(auth)
    .send({ fee: feeId, amountPaise: 200000, method: 'cash' })
    .expect(409);

  // Pay the remaining balance.
  await request(app)
    .post('/api/payments')
    .set(auth)
    .send({ fee: feeId, amountPaise: 100000, method: 'cash' })
    .expect(201);

  // Fee is now fully paid.
  const feeState = await request(app).get(`/api/fees/${feeId}`).set(auth).expect(200);
  assert.equal(feeState.body.data.status, 'paid');
  assert.equal(feeState.body.data.balancePaise, 0);

  // Receipt
  const receipt = await request(app)
    .get(`/api/payments/${partial.body.data._id}/receipt`)
    .set(auth)
    .expect(200);
  assert.equal(receipt.body.data.receiptNumber, partial.body.data.receiptNumber);

  // Dashboard reflects the data.
  const summary = await request(app).get('/api/dashboard/summary').set(auth).expect(200);
  assert.equal(summary.body.data.counts.activeStudents, 1);
  assert.equal(summary.body.data.counts.batches, 1);
  assert.equal(summary.body.data.fees.outstandingPaise, 0);

  // Reports
  const studentsReport = await request(app).get('/api/reports/students').set(auth).expect(200);
  assert.equal(studentsReport.body.total, 1);

  const attendanceReport = await request(app)
    .get(`/api/reports/attendance?batch=${batchId}&from=${date}&to=${date}`)
    .set(auth)
    .expect(200);
  assert.equal(attendanceReport.body.summary.total, 1);
  assert.equal(attendanceReport.body.summary.late, 1);
  const csv = await request(app).get('/api/reports/students?format=csv').set(auth).expect(200);
  assert.match(csv.headers['content-type'], /text\/csv/);
  assert.match(csv.text, /Student ID/);
});

test('teachers are blocked from student management endpoints', async () => {
  const admin = new User({ name: 'Admin', email: 'admin@example.com', role: 'admin' });
  await admin.setPassword('Password123');
  await admin.save();

  const teacherUser = new User({ name: 'Teacher', email: 'teacher@example.com', role: 'teacher' });
  await teacherUser.setPassword('Password123');
  await teacherUser.save();

  const login = await request(app)
    .post('/api/auth/login')
    .send({ email: 'teacher@example.com', password: 'Password123' });
  const auth = { Authorization: `Bearer ${login.body.data.token}` };

  await request(app).get('/api/students').set(auth).expect(403);
  await request(app).get('/api/fees').set(auth).expect(403);
  // But the dashboard is allowed.
  await request(app).get('/api/dashboard/summary').set(auth).expect(200);
});
