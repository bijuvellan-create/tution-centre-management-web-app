import { useState } from 'react';
import { useAuth } from '../hooks/useAuth.js';
import { AuthApi } from '../services/api.js';
import { tokenStore } from '../services/apiClient.js';
import { Button, Card, PageHeader } from '../components/ui/Primitives.jsx';
import { Input } from '../components/ui/Form.jsx';
import { useToast } from '../components/ui/Toast.jsx';
import { fieldErrors } from '../utils/errors.js';
import { formatDate } from '../utils/format.js';

export default function AccountPage() {
  const { user, reload } = useAuth();
  const toast = useToast();
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  const set = (key) => (event) => setForm((prev) => ({ ...prev, [key]: event.target.value }));

  const handleSubmit = async (event) => {
    event.preventDefault();
    setErrors({});
    if (form.newPassword !== form.confirm) {
      setErrors({ confirm: 'The two passwords do not match.' });
      return;
    }
    setBusy(true);
    try {
      const res = await AuthApi.changePassword({
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
      });
      tokenStore.set(res.data.token);
      await reload();
      setForm({ currentPassword: '', newPassword: '', confirm: '' });
      toast.success('Password updated', 'Your new password is now active.');
    } catch (err) {
      setErrors(fieldErrors(err));
      toast.error('Could not update password', err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeader title="My account" subtitle="Your profile details and password." />

      <div className="grid-2">
        <Card>
          <div className="card__head">
            <h2>Profile</h2>
          </div>
          <div className="card__body">
            <div className="detail-grid">
              <div className="detail-item">
                <div className="k">Name</div>
                <div className="v">{user?.name}</div>
              </div>
              <div className="detail-item">
                <div className="k">Email</div>
                <div className="v">{user?.email}</div>
              </div>
              <div className="detail-item">
                <div className="k">Role</div>
                <div className="v" style={{ textTransform: 'capitalize' }}>
                  {user?.role}
                </div>
              </div>
              <div className="detail-item">
                <div className="k">Last sign-in</div>
                <div className="v">{formatDate(user?.lastLoginAt)}</div>
              </div>
            </div>
            <p className="muted" style={{ marginBottom: 0, fontSize: 13.5 }}>
              To change your name or email, ask an administrator.
            </p>
          </div>
        </Card>

        <Card>
          <div className="card__head">
            <h2>Change password</h2>
          </div>
          <div className="card__body">
            <form onSubmit={handleSubmit} className="stack" noValidate>
              <Input
                label="Current password"
                type="password"
                autoComplete="current-password"
                value={form.currentPassword}
                onChange={set('currentPassword')}
                error={errors.currentPassword}
                required
              />
              <Input
                label="New password"
                type="password"
                autoComplete="new-password"
                value={form.newPassword}
                onChange={set('newPassword')}
                error={errors.newPassword}
                hint="At least 8 characters, with a letter and a number."
                required
              />
              <Input
                label="Confirm new password"
                type="password"
                autoComplete="new-password"
                value={form.confirm}
                onChange={set('confirm')}
                error={errors.confirm}
                required
              />
              <Button type="submit" disabled={busy}>
                {busy ? 'Updating…' : 'Update password'}
              </Button>
            </form>
          </div>
        </Card>
      </div>
    </>
  );
}
