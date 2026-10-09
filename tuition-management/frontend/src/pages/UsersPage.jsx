import { useEffect, useState } from 'react';
import { UsersApi, TeachersApi } from '../services/api.js';
import { useList } from '../hooks/useList.js';
import { useAuth } from '../hooks/useAuth.js';
import { Badge, Button, PageHeader } from '../components/ui/Primitives.jsx';
import { DataTable, Pagination } from '../components/ui/Table.jsx';
import { Input, Select } from '../components/ui/Form.jsx';
import { Modal, ConfirmDialog } from '../components/ui/Modal.jsx';
import { useToast } from '../components/ui/Toast.jsx';
import Icon from '../components/ui/Icon.jsx';
import { fieldErrors } from '../utils/errors.js';
import { formatDate } from '../utils/format.js';

export default function UsersPage() {
  const toast = useToast();
  const { user: currentUser } = useAuth();
  const list = useList(UsersApi.list, { page: 1, limit: 10, search: '', role: '', status: '' });
  const [searchText, setSearchText] = useState('');
  const [teachers, setTeachers] = useState([]);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm());
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  const [resetTarget, setResetTarget] = useState(null);
  const [resetPassword, setResetPassword] = useState('');
  const [resetErrors, setResetErrors] = useState({});
  const [resetBusy, setResetBusy] = useState(false);

  const [toDelete, setToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    TeachersApi.list({ limit: 100 })
      .then((res) => setTeachers(res.data || []))
      .catch(() => {});
  }, []);

  const set = (key) => (event) => setForm((prev) => ({ ...prev, [key]: event.target.value }));

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm());
    setErrors({});
    setModalOpen(true);
  };

  const openEdit = (account) => {
    setEditing(account);
    setForm({
      name: account.name || '',
      email: account.email || '',
      password: '',
      role: account.role || 'teacher',
      isActive: account.isActive,
      teacherProfile: account.teacherProfile?._id || account.teacherProfile || '',
    });
    setErrors({});
    setModalOpen(true);
  };

  const submit = async (event) => {
    event.preventDefault();
    setErrors({});
    setBusy(true);
    try {
      if (editing) {
        await UsersApi.update(editing._id, {
          name: form.name.trim(),
          role: form.role,
          isActive: Boolean(form.isActive),
          teacherProfile: form.teacherProfile || undefined,
        });
        toast.success('Account updated');
      } else {
        await UsersApi.create({
          name: form.name.trim(),
          email: form.email.trim(),
          password: form.password,
          role: form.role,
          teacherProfile: form.teacherProfile || undefined,
        });
        toast.success('Account created');
      }
      setModalOpen(false);
      list.reload();
    } catch (err) {
      setErrors(fieldErrors(err));
      toast.error('Could not save account', err.message);
    } finally {
      setBusy(false);
    }
  };

  const submitReset = async (event) => {
    event.preventDefault();
    setResetErrors({});
    setResetBusy(true);
    try {
      await UsersApi.resetPassword(resetTarget._id, resetPassword);
      toast.success('Password reset');
      setResetTarget(null);
      setResetPassword('');
    } catch (err) {
      setResetErrors(fieldErrors(err));
      toast.error('Could not reset password', err.message);
    } finally {
      setResetBusy(false);
    }
  };

  const confirmDelete = async () => {
    setDeleting(true);
    try {
      await UsersApi.remove(toDelete._id);
      toast.success('Account deleted');
      setToDelete(null);
      list.reload();
    } catch (err) {
      toast.error('Could not delete account', err.message);
    } finally {
      setDeleting(false);
    }
  };

  const columns = [
    {
      key: 'name',
      header: 'Name',
      render: (row) => (
        <div>
          <div style={{ fontWeight: 600 }}>{row.name}</div>
          <div className="muted" style={{ fontSize: 12.5 }}>
            {row.email}
          </div>
        </div>
      ),
    },
    {
      key: 'role',
      header: 'Role',
      render: (row) => <Badge tone={row.role === 'admin' ? 'brass' : 'primary'}>{row.role}</Badge>,
    },
    {
      key: 'teacherProfile',
      header: 'Linked teacher',
      render: (row) => row.teacherProfile?.fullName || <span className="muted">—</span>,
    },
    { key: 'lastLogin', header: 'Last sign-in', render: (row) => formatDate(row.lastLoginAt) },
    {
      key: 'isActive',
      header: 'Status',
      render: (row) => (
        <Badge tone={row.isActive ? 'success' : 'neutral'} dot>
          {row.isActive ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (row) => (
        <div className="cell-actions">
          <button
            className="icon-btn"
            onClick={() => {
              setResetTarget(row);
              setResetPassword('');
              setResetErrors({});
            }}
            aria-label="Reset password"
            title="Reset password"
          >
            <Icon name="settings" size={16} />
          </button>
          <button className="icon-btn" onClick={() => openEdit(row)} aria-label="Edit">
            <Icon name="edit" size={16} />
          </button>
          <button
            className="icon-btn"
            onClick={() => setToDelete(row)}
            aria-label="Delete"
            disabled={row._id === currentUser?._id}
          >
            <Icon name="trash" size={16} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="User accounts"
        subtitle="Who can sign in, and what they can access."
        actions={
          <Button onClick={openCreate}>
            <Icon name="plus" size={16} /> Add account
          </Button>
        }
      />

      <form
        className="toolbar"
        onSubmit={(e) => {
          e.preventDefault();
          list.updateParams({ search: searchText, page: 1 });
        }}
      >
        <div className="search">
          <span className="search__icon">
            <Icon name="search" size={16} />
          </span>
          <input
            className="input"
            placeholder="Search name or email…"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
        </div>
        <select
          className="select"
          style={{ width: 140 }}
          value={list.params.role}
          onChange={(e) => list.updateParams({ role: e.target.value, page: 1 })}
        >
          <option value="">All roles</option>
          <option value="admin">Admin</option>
          <option value="teacher">Teacher</option>
        </select>
        <select
          className="select"
          style={{ width: 150 }}
          value={list.params.status}
          onChange={(e) => list.updateParams({ status: e.target.value, page: 1 })}
        >
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        <Button type="submit" variant="ghost">
          Search
        </Button>
      </form>

      <DataTable
        columns={columns}
        rows={list.data}
        loading={list.loading}
        getRowKey={(row) => row._id}
        emptyTitle="No accounts found"
        emptyMessage="Create an account for an administrator or teacher."
        emptyAction={<Button onClick={openCreate}>Add account</Button>}
      />
      <Pagination meta={list.meta} onPage={(page) => list.updateParams({ page })} />

      <Modal
        open={modalOpen}
        title={editing ? 'Edit account' : 'Add account'}
        onClose={() => setModalOpen(false)}
        footer={
          <>
            <Button variant="ghost" onClick={() => setModalOpen(false)} disabled={busy}>
              Cancel
            </Button>
            <Button onClick={submit} disabled={busy}>
              {busy ? 'Saving…' : editing ? 'Save changes' : 'Create account'}
            </Button>
          </>
        }
      >
        <form onSubmit={submit} className="form-grid" noValidate>
          <Input
            label="Name"
            fieldClassName="span-2"
            value={form.name}
            onChange={set('name')}
            error={errors.name}
            required
          />
          <Input
            label="Email"
            type="email"
            fieldClassName="span-2"
            value={form.email}
            onChange={set('email')}
            error={errors.email}
            disabled={Boolean(editing)}
            required
          />
          {!editing && (
            <Input
              label="Temporary password"
              type="password"
              fieldClassName="span-2"
              value={form.password}
              onChange={set('password')}
              error={errors.password}
              hint="At least 8 characters, with a letter and a number."
              required
            />
          )}
          <Select label="Role" value={form.role} onChange={set('role')} error={errors.role}>
            <option value="teacher">Teacher</option>
            <option value="admin">Administrator</option>
          </Select>
          <Select
            label="Link to teacher profile"
            value={form.teacherProfile}
            onChange={set('teacherProfile')}
            hint="Optional — used to scope batches and attendance."
          >
            <option value="">Not linked</option>
            {teachers.map((t) => (
              <option key={t._id} value={t._id}>
                {t.fullName}
              </option>
            ))}
          </Select>
          {editing && (
            <div className="field span-2">
              <label className="checkbox-row">
                <input
                  type="checkbox"
                  checked={Boolean(form.isActive)}
                  onChange={(e) => setForm((prev) => ({ ...prev, isActive: e.target.checked }))}
                />
                Account is active (can sign in)
              </label>
            </div>
          )}
        </form>
      </Modal>

      <Modal
        open={Boolean(resetTarget)}
        title="Reset password"
        onClose={() => setResetTarget(null)}
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setResetTarget(null)} disabled={resetBusy}>
              Cancel
            </Button>
            <Button onClick={submitReset} disabled={resetBusy}>
              {resetBusy ? 'Resetting…' : 'Reset password'}
            </Button>
          </>
        }
      >
        <form onSubmit={submitReset} noValidate>
          <p className="muted" style={{ marginTop: 0 }}>
            Set a new password for {resetTarget?.name}. They will use it on their next sign-in.
          </p>
          <Input
            label="New password"
            type="password"
            value={resetPassword}
            onChange={(e) => setResetPassword(e.target.value)}
            error={resetErrors.newPassword}
            required
          />
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(toDelete)}
        title="Delete account?"
        message={
          toDelete
            ? `${toDelete.name} (${toDelete.email}) will no longer be able to sign in.`
            : ''
        }
        confirmLabel="Delete account"
        busy={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
      />
    </>
  );
}

function emptyForm() {
  return { name: '', email: '', password: '', role: 'teacher', isActive: true, teacherProfile: '' };
}
