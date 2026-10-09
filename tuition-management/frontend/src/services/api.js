import http from './apiClient.js';

/** Unwraps the standard API envelope { success, data, meta }. */
const unwrap = (request) => request.then((res) => res.data);

export const AuthApi = {
  login: (payload) => unwrap(http.post('/auth/login', payload)),
  logout: () => unwrap(http.post('/auth/logout')),
  me: () => unwrap(http.get('/auth/me')),
  changePassword: (payload) => unwrap(http.post('/auth/change-password', payload)),
};

export const DashboardApi = {
  summary: (params) => unwrap(http.get('/dashboard/summary', { params })),
};

export const StudentsApi = {
  list: (params) => unwrap(http.get('/students', { params })),
  get: (id) => unwrap(http.get(`/students/${id}`)),
  create: (payload) => unwrap(http.post('/students', payload)),
  update: (id, payload) => unwrap(http.put(`/students/${id}`, payload)),
  remove: (id) => unwrap(http.delete(`/students/${id}`)),
};

export const TeachersApi = {
  list: (params) => unwrap(http.get('/teachers', { params })),
  get: (id) => unwrap(http.get(`/teachers/${id}`)),
  create: (payload) => unwrap(http.post('/teachers', payload)),
  update: (id, payload) => unwrap(http.put(`/teachers/${id}`, payload)),
  remove: (id) => unwrap(http.delete(`/teachers/${id}`)),
};

export const CoursesApi = {
  list: (params) => unwrap(http.get('/courses', { params })),
  get: (id) => unwrap(http.get(`/courses/${id}`)),
  create: (payload) => unwrap(http.post('/courses', payload)),
  update: (id, payload) => unwrap(http.put(`/courses/${id}`, payload)),
  deactivate: (id) => unwrap(http.patch(`/courses/${id}/deactivate`)),
  activate: (id) => unwrap(http.patch(`/courses/${id}/activate`)),
  remove: (id) => unwrap(http.delete(`/courses/${id}`)),
};

export const BatchesApi = {
  list: (params) => unwrap(http.get('/batches', { params })),
  get: (id) => unwrap(http.get(`/batches/${id}`)),
  create: (payload) => unwrap(http.post('/batches', payload)),
  update: (id, payload) => unwrap(http.put(`/batches/${id}`, payload)),
  deactivate: (id) => unwrap(http.patch(`/batches/${id}/deactivate`)),
  activate: (id) => unwrap(http.patch(`/batches/${id}/activate`)),
  remove: (id) => unwrap(http.delete(`/batches/${id}`)),
  enroll: (id, studentId) => unwrap(http.post(`/batches/${id}/students`, { studentId })),
  unenroll: (id, studentId) => unwrap(http.delete(`/batches/${id}/students/${studentId}`)),
};

export const AttendanceApi = {
  list: (params) => unwrap(http.get('/attendance', { params })),
  save: (payload) => unwrap(http.post('/attendance', payload)),
  update: (id, payload) => unwrap(http.put(`/attendance/${id}`, payload)),
};

export const FeesApi = {
  list: (params) => unwrap(http.get('/fees', { params })),
  get: (id) => unwrap(http.get(`/fees/${id}`)),
  create: (payload) => unwrap(http.post('/fees', payload)),
  update: (id, payload) => unwrap(http.put(`/fees/${id}`, payload)),
  cancel: (id) => unwrap(http.patch(`/fees/${id}/cancel`)),
};

export const PaymentsApi = {
  list: (params) => unwrap(http.get('/payments', { params })),
  create: (payload) => unwrap(http.post('/payments', payload)),
  receipt: (id) => unwrap(http.get(`/payments/${id}/receipt`)),
};

export const UsersApi = {
  list: (params) => unwrap(http.get('/users', { params })),
  create: (payload) => unwrap(http.post('/users', payload)),
  update: (id, payload) => unwrap(http.put(`/users/${id}`, payload)),
  resetPassword: (id, newPassword) => unwrap(http.put(`/users/${id}/password`, { newPassword })),
  remove: (id) => unwrap(http.delete(`/users/${id}`)),
};

export const ReportsApi = {
  students: (params) => unwrap(http.get('/reports/students', { params })),
  teachers: (params) => unwrap(http.get('/reports/teachers', { params })),
  attendance: (params) => unwrap(http.get('/reports/attendance', { params })),
  fees: (params) => unwrap(http.get('/reports/fees', { params })),
};

/**
 * Downloads a report as CSV. Because the API requires an Authorization header,
 * we fetch it as a blob and trigger a browser download (a plain link would not
 * include the token).
 */
export async function downloadCsv(path, params, filename) {
  const response = await http.get(path, { params: { ...params, format: 'csv' }, responseType: 'blob' });
  const url = URL.createObjectURL(response.data);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
