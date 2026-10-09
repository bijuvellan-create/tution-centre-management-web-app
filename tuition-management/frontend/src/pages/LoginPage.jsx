import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import { Button } from '../components/ui/Primitives.jsx';
import { Input } from '../components/ui/Form.jsx';
import { Banner } from '../components/ui/Primitives.jsx';
import { APP_NAME } from '../utils/config.js';

export default function LoginPage() {
  const { login, status } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const from = location.state?.from?.pathname || '/dashboard';

  useEffect(() => {
    if (status === 'authenticated') navigate(from, { replace: true });
  }, [status, navigate, from]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setBusy(true);
    try {
      await login(email.trim(), password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.message || 'Unable to sign in.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-shell">
      <aside className="auth-aside">
        <div className="auth-aside__grid" />
        <div style={{ position: 'relative' }}>
          <div className="brand" style={{ border: 0, padding: 0, marginBottom: 40 }}>
            <div className="brand__mark">T</div>
            <div className="brand__name" style={{ fontSize: 20 }}>
              {APP_NAME}
            </div>
          </div>
          <h2>Everything the centre runs on, in one ledger.</h2>
          <p style={{ marginTop: 18 }}>
            Admissions, batches, attendance, fees and receipts — recorded once and kept in order.
          </p>
        </div>
        <div className="auth-quote">
          “A tidy register today saves an hour of reconciliation tomorrow.”
        </div>
      </aside>

      <main className="auth-main">
        <div className="auth-card">
          <h1>Sign in</h1>
          <p className="sub">Use the account provided by your administrator.</p>

          {error && (
            <div style={{ marginBottom: 16 }}>
              <Banner tone="error">{error}</Banner>
            </div>
          )}

          <form className="auth-form" onSubmit={handleSubmit} noValidate>
            <Input
              label="Email address"
              type="email"
              name="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
            />
            <Input
              label="Password"
              type="password"
              name="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <Button type="submit" block disabled={busy}>
              {busy ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>

          <p className="auth-foot">
            Forgot your password? Ask an administrator to reset it for you.
          </p>
        </div>
      </main>
    </div>
  );
}
