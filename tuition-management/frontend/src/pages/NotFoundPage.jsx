import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <div className="auth-main" style={{ minHeight: '100vh' }}>
      <div className="auth-card" style={{ textAlign: 'center' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 64, lineHeight: 1 }}>404</div>
        <h1 style={{ marginTop: 8 }}>Page not found</h1>
        <p className="sub">The page you were looking for does not exist or has moved.</p>
        <Link className="btn" to="/dashboard">
          Back to dashboard
        </Link>
      </div>
    </div>
  );
}
