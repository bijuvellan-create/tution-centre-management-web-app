import { useState } from 'react';
import { Link } from 'react-router-dom';
import { TeachersApi } from '../services/api.js';
import { useList } from '../hooks/useList.js';
import { Button, PageHeader, StatusBadge } from '../components/ui/Primitives.jsx';
import { DataTable, Pagination } from '../components/ui/Table.jsx';
import { Input, Select, Textarea } from '../components/ui/Form.jsx';
import { Modal, ConfirmDialog } from '../components/ui/Modal.jsx';
import { useToast } from '../components/ui/Toast.jsx';
import Icon from '../components/ui/Icon.jsx';
import { fieldErrors } from '../utils/errors.js';
import { todayInputValue } from '../utils/format.js';

const emptyForm = () => ({
  fullName: '',
  phone: '',
  email: '',
  subjects: '',
  qualifications: '',
  joiningDate: todayInputValue(),
  status: 'active',
  notes: '',
});

export default function TeachersPage() {
  const toast = useToast();
  const list = useList(TeachersApi.list, { page: 1, limit: 10, search: '', status: '' });
  const [searchText, setSearchText] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm());
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [toDelete, setToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const set = (key) => (event) => setForm((prev) => ({ ...prev, [key]: event.target.value }));

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm());
    setErrors({});
    setModalOpen(true);
  };

  const openEdit = (teacher) => {
    setEditing(teacher);
    setForm({
      fullName: teacher.fullName || '',
      phone: teacher.phone || '',
      email: teacher.email || '',
      subjects: (teacher.subjects || []).join(', '),
      qualifications: teacher.qualifications || '',
      joiningDate: teacher.joiningDate ? teacher.joiningDate.slice(0, 10) : todayInputValue(),
      status: teacher.status || 'active',
      notes: teacher.notes || '',
    });
    setErrors({});
    setModalOpen(true);
  };

  const submit = async (event) => {
    event.preventDefault();
    setErrors({});
    setBusy(true);
    const payload = {
      fullName: form.fullName.trim(),
      phone: form.phone.trim(),
      email: form.email.trim() || undefined,
      subjects: form.subjects
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      qualifications: form.qualifications.trim() || undefined,
      joiningDate: form.joiningDate || undefined,
      status: form.status,
      notes: form.notes.trim() || undefined,
    };
    try {
      if (editing) {
        await TeachersApi.update(editing._id, payload);
        toast.success('Teacher updated');
      } else {
        await TeachersApi.create(payload);
        toast.success('Teacher added');
      }
      setModalOpen(false);
      list.reload();
    } catch (err) {
      setErrors(fieldErrors(err));
      toast.error('Could not save teacher', err.message);
    } finally {
      setBusy(false);
    }
  };

  const confirmDelete = async () => {
    setDeleting(true);
    try {
      await TeachersApi.remove(toDelete._id);
      toast.success('Teacher deleted');
      setToDelete(null);
      list.reload();
    } catch (err) {
      toast.error('Could not delete teacher', err.message);
    } finally {
      setDeleting(false);
    }
  };

  const columns = [
    { key: 'teacherId', header: 'ID', render: (row) => <span className="mono">{row.teacherId}</span> },
    {
      key: 'fullName',
      header: 'Name',
      render: (row) => <Link to={`/teachers/${row._id}`}>{row.fullName}</Link>,
    },
    {
      key: 'subjects',
      header: 'Subjects',
      render: (row) => (row.subjects || []).join(', ') || <span className="muted">—</span>,
    },
    {
      key: 'contact',
      header: 'Contact',
      render: (row) => (
        <div>
          <div>{row.phone}</div>
          {row.email && (
            <div className="muted" style={{ fontSize: 12.5 }}>
              {row.email}
            </div>
          )}
        </div>
      ),
    },
    { key: 'status', header: 'Status', render: (row) => <StatusBadge status={row.status} /> },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (row) => (
        <div className="cell-actions">
          <Link className="icon-btn" to={`/teachers/${row._id}`} aria-label="View">
            <Icon name="eye" size={16} />
          </Link>
          <button className="icon-btn" onClick={() => openEdit(row)} aria-label="Edit">
            <Icon name="edit" size={16} />
          </button>
          <button className="icon-btn" onClick={() => setToDelete(row)} aria-label="Delete">
            <Icon name="trash" size={16} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Teachers"
        subtitle="Staff records and the batches they run."
        actions={
          <Button onClick={openCreate}>
            <Icon name="plus" size={16} /> Add teacher
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
            placeholder="Search name, ID, phone or email…"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
        </div>
        <select
          className="select"
          style={{ width: 160 }}
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
        emptyTitle="No teachers found"
        emptyMessage="Add your first teacher to start assigning batches."
        emptyAction={<Button onClick={openCreate}>Add teacher</Button>}
      />
      <Pagination meta={list.meta} onPage={(page) => list.updateParams({ page })} />

      <Modal
        open={modalOpen}
        title={editing ? 'Edit teacher' : 'Add teacher'}
        onClose={() => setModalOpen(false)}
        footer={
          <>
            <Button variant="ghost" onClick={() => setModalOpen(false)} disabled={busy}>
              Cancel
            </Button>
            <Button onClick={submit} disabled={busy}>
              {busy ? 'Saving…' : editing ? 'Save changes' : 'Add teacher'}
            </Button>
          </>
        }
      >
        <form onSubmit={submit} className="form-grid" noValidate>
          <Input
            label="Full name"
            fieldClassName="span-2"
            value={form.fullName}
            onChange={set('fullName')}
            error={errors.fullName}
            required
          />
          <Input
            label="Phone"
            value={form.phone}
            onChange={set('phone')}
            error={errors.phone}
            required
          />
          <Input label="Email" type="email" value={form.email} onChange={set('email')} error={errors.email} />
          <Input
            label="Subjects"
            fieldClassName="span-2"
            value={form.subjects}
            onChange={set('subjects')}
            hint="Separate multiple subjects with commas."
            error={errors.subjects}
          />
          <Input
            label="Qualifications"
            fieldClassName="span-2"
            value={form.qualifications}
            onChange={set('qualifications')}
          />
          <Input label="Joining date" type="date" value={form.joiningDate} onChange={set('joiningDate')} />
          <Select label="Status" value={form.status} onChange={set('status')}>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </Select>
          <Textarea label="Notes" value={form.notes} onChange={set('notes')} fieldClassName="span-2" />
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(toDelete)}
        title="Delete teacher?"
        message={
          toDelete
            ? `This removes ${toDelete.fullName}. Teachers assigned to a batch cannot be deleted — reassign them or set them inactive instead.`
            : ''
        }
        confirmLabel="Delete teacher"
        busy={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
      />
    </>
  );
}
