import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import AuthContext from '../context/AuthContext.jsx';
import ProtectedRoute, { AdminRoute } from './ProtectedRoute.jsx';

function renderAt(value, initialPath, element) {
  return render(
    <AuthContext.Provider value={value}>
      <MemoryRouter initialEntries={[initialPath]}>
        <Routes>
          <Route path="/login" element={<div>Login page</div>} />
          <Route path="/dashboard" element={<div>Dashboard page</div>} />
          <Route path={initialPath} element={element} />
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>
  );
}

describe('ProtectedRoute', () => {
  it('redirects unauthenticated users to the login page', () => {
    renderAt(
      { status: 'unauthenticated', isAdmin: false },
      '/secret',
      <ProtectedRoute>
        <div>Secret</div>
      </ProtectedRoute>
    );
    expect(screen.getByText('Login page')).toBeInTheDocument();
    expect(screen.queryByText('Secret')).not.toBeInTheDocument();
  });

  it('renders children for authenticated users', () => {
    renderAt(
      { status: 'authenticated', isAdmin: true },
      '/secret',
      <ProtectedRoute>
        <div>Secret</div>
      </ProtectedRoute>
    );
    expect(screen.getByText('Secret')).toBeInTheDocument();
  });

  it('shows a loading state while the session is checked', () => {
    renderAt(
      { status: 'loading', isAdmin: false },
      '/secret',
      <ProtectedRoute>
        <div>Secret</div>
      </ProtectedRoute>
    );
    expect(screen.getByRole('status')).toBeInTheDocument();
  });
});

describe('AdminRoute', () => {
  it('sends non-admins to the dashboard', () => {
    renderAt(
      { status: 'authenticated', isAdmin: false },
      '/secret',
      <AdminRoute>
        <div>Admin only</div>
      </AdminRoute>
    );
    expect(screen.getByText('Dashboard page')).toBeInTheDocument();
    expect(screen.queryByText('Admin only')).not.toBeInTheDocument();
  });

  it('allows admins through', () => {
    renderAt(
      { status: 'authenticated', isAdmin: true },
      '/secret',
      <AdminRoute>
        <div>Admin only</div>
      </AdminRoute>
    );
    expect(screen.getByText('Admin only')).toBeInTheDocument();
  });
});
