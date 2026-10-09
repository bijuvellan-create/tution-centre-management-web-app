import { useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import Icon from '../components/ui/Icon.jsx';
import { useAuth } from '../hooks/useAuth.js';
import { APP_NAME } from '../utils/config.js';
import { initials } from '../utils/format.js';

const NAV = [
  { group: 'Overview', items: [{ to: '/dashboard', label: 'Dashboard', icon: 'home' }] },
  {
    group: 'People',
    items: [
      { to: '/students', label: 'Students', icon: 'students', admin: true },
      { to: '/teachers', label: 'Teachers', icon: 'teacher', admin: true },
    ],
  },
  {
    group: 'Academics',
    items: [
      { to: '/courses', label: 'Courses', icon: 'book', admin: true },
      { to: '/batches', label: 'Batches', icon: 'layers' },
      { to: '/attendance', label: 'Attendance', icon: 'calendar' },
    ],
  },
  {
    group: 'Finance',
    items: [
      { to: '/fees', label: 'Fees', icon: 'rupee', admin: true },
      { to: '/payments', label: 'Payments', icon: 'receipt', admin: true },
      { to: '/reports', label: 'Reports', icon: 'chart', admin: true },
    ],
  },
  {
    group: 'System',
    items: [{ to: '/users', label: 'User accounts', icon: 'settings', admin: true }],
  },
];

const TITLES = {
  '/dashboard': 'Dashboard',
  '/students': 'Students',
  '/teachers': 'Teachers',
  '/courses': 'Courses',
  '/batches': 'Batches',
  '/attendance': 'Attendance',
  '/fees': 'Fees',
  '/payments': 'Payments',
  '/reports': 'Reports',
  '/users': 'User accounts',
  '/account': 'My account',
};

export default function DashboardLayout() {
  const { user, isAdmin, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const title = TITLES[location.pathname] || APP_NAME;

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="app-shell">
      {open && <div className="scrim" onClick={() => setOpen(false)} aria-hidden="true" />}

      <aside className={`sidebar${open ? ' open' : ''}`}>
        <div className="brand">
          <div className="brand__mark">T</div>
          <div>
            <div className="brand__name">{APP_NAME}</div>
            <div className="brand__sub">Centre admin</div>
          </div>
        </div>

        <nav aria-label="Main navigation">
          {NAV.map((group) => {
            const items = group.items.filter((item) => isAdmin || !item.admin);
            if (items.length === 0) return null;
            return (
              <div key={group.group}>
                <div className="nav-group-label">{group.group}</div>
                {items.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
                    onClick={() => setOpen(false)}
                  >
                    <span className="nav-icon">
                      <Icon name={item.icon} size={18} />
                    </span>
                    {item.label}
                  </NavLink>
                ))}
              </div>
            );
          })}
        </nav>

        <div className="sidebar__footer">
          <div>{user?.email}</div>
          <div style={{ marginTop: 2 }}>Signed in as {isAdmin ? 'Administrator' : 'Teacher'}</div>
        </div>
      </aside>

      <div className="main">
        <header className="topbar">
          <button
            className="icon-btn topbar__burger"
            onClick={() => setOpen((v) => !v)}
            aria-label="Toggle navigation"
          >
            <Icon name="menu" />
          </button>
          <div className="topbar__title">{title}</div>
          <div className="topbar__spacer" />

          <div className="menu">
            <button
              className="user-chip"
              onClick={() => setMenuOpen((v) => !v)}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
            >
              <span className="user-chip__meta" style={{ textAlign: 'right' }}>
                <span className="user-chip__name">{user?.name}</span>
                <br />
                <span className="user-chip__role">{user?.role}</span>
              </span>
              <span className="user-chip__avatar">{initials(user?.name)}</span>
            </button>
            {menuOpen && (
              <div className="menu__panel" role="menu">
                <button
                  className="menu__item"
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false);
                    navigate('/account');
                  }}
                >
                  <Icon name="user" size={16} /> My account
                </button>
                <button className="menu__item danger" role="menuitem" onClick={handleLogout}>
                  <Icon name="logout" size={16} /> Log out
                </button>
              </div>
            )}
          </div>
        </header>

        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
