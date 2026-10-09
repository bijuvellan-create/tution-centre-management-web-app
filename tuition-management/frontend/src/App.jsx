import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.jsx';
import { ToastProvider } from './components/ui/Toast.jsx';
import ProtectedRoute, { AdminRoute } from './router/ProtectedRoute.jsx';
import DashboardLayout from './layouts/DashboardLayout.jsx';

import LoginPage from './pages/LoginPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import StudentsPage from './pages/StudentsPage.jsx';
import StudentDetailPage from './pages/StudentDetailPage.jsx';
import TeachersPage from './pages/TeachersPage.jsx';
import TeacherDetailPage from './pages/TeacherDetailPage.jsx';
import CoursesPage from './pages/CoursesPage.jsx';
import BatchesPage from './pages/BatchesPage.jsx';
import BatchDetailPage from './pages/BatchDetailPage.jsx';
import AttendancePage from './pages/AttendancePage.jsx';
import FeesPage from './pages/FeesPage.jsx';
import PaymentsPage from './pages/PaymentsPage.jsx';
import ReportsPage from './pages/ReportsPage.jsx';
import UsersPage from './pages/UsersPage.jsx';
import AccountPage from './pages/AccountPage.jsx';
import NotFoundPage from './pages/NotFoundPage.jsx';

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />

            <Route
              element={
                <ProtectedRoute>
                  <DashboardLayout />
                </ProtectedRoute>
              }
            >
              <Route path="/dashboard" element={<DashboardPage />} />

              <Route
                path="/students"
                element={
                  <AdminRoute>
                    <StudentsPage />
                  </AdminRoute>
                }
              />
              <Route
                path="/students/:id"
                element={
                  <AdminRoute>
                    <StudentDetailPage />
                  </AdminRoute>
                }
              />
              <Route
                path="/teachers"
                element={
                  <AdminRoute>
                    <TeachersPage />
                  </AdminRoute>
                }
              />
              <Route
                path="/teachers/:id"
                element={
                  <AdminRoute>
                    <TeacherDetailPage />
                  </AdminRoute>
                }
              />
              <Route
                path="/courses"
                element={
                  <AdminRoute>
                    <CoursesPage />
                  </AdminRoute>
                }
              />
              <Route path="/batches" element={<BatchesPage />} />
              <Route path="/batches/:id" element={<BatchDetailPage />} />
              <Route path="/attendance" element={<AttendancePage />} />

              <Route
                path="/fees"
                element={
                  <AdminRoute>
                    <FeesPage />
                  </AdminRoute>
                }
              />
              <Route
                path="/payments"
                element={
                  <AdminRoute>
                    <PaymentsPage />
                  </AdminRoute>
                }
              />
              <Route
                path="/reports"
                element={
                  <AdminRoute>
                    <ReportsPage />
                  </AdminRoute>
                }
              />
              <Route
                path="/users"
                element={
                  <AdminRoute>
                    <UsersPage />
                  </AdminRoute>
                }
              />
              <Route path="/account" element={<AccountPage />} />
            </Route>

            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
  );
}
