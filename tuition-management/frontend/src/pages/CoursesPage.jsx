import { useState } from 'react';
import { CoursesApi } from '../services/api.js';
import { useList } from '../hooks/useList.js';
import { Button, PageHeader, StatusBadge } from '../components/ui/Primitives.jsx';
import { DataTable, Pagination } from '../components/ui/Table.jsx';
import { Input, Select, Textarea } from '../components/ui/Form.jsx';
import { Modal, ConfirmDialog } from '../components/ui/Modal.jsx';
import { useToast } from '../components/ui/Toast.jsx';
import Icon from '../components/ui/Icon.jsx';
import { fieldErrors } from '../utils/errors.js';
import { formatINR, paiseToRupees, rupeesToPaise } from '../utils/format.js';

const emptyForm = () => ({
  name: '',
  subject: '',
  grade: '',
  durationMonths: '',
  standardFee: '',
  description: '',
  status: 'active',
});

export default function CoursesPage() {
  const toast = useToast();
  const list = useList(CoursesApi.list, { page: 1, limit: 10, search: '', status: '' });
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

  const openEdit = (course) => {
    setEditing(course);
    setForm({
      name: course.name || '',
      subject: course.subject || '',
      grade: course.grade || '',
      durationMonths: course.durationMonths ?? '',
      standardFee: paiseToRupees(course.standardFeePaise) || '',
      description: course.description || '',
      status: course.status || 'active',
    });
    setErrors({});
    setModalOpen(true);
  };

  const submit = async (event) => {
    event.preventDefault();
    setErrors({});
    setBusy(true);
    const payload = {
      name: form.name.trim(),
      subject: form.subject.trim() || undefined,
      grade: form.grade.trim() || undefined,
      durationMonths: form.durationMonths === '' ? 0 : Number(form.durationMonths),
      standardFeePaise: form.standardFee === '' ? 0 : rupeesToPaise(form.standardFee),
      description: form.description.trim() || undefined,
      status: form.status,
    };
    try {
      if (editing) {
        await CoursesApi.update(editing._id, payload);
        toast.success('Course updated');
      } else {
        await CoursesApi.create(payload);
        toast.success('Course added');
      }
      setModalOpen(false);
      list.reload();
    } catch (err) {
      setErrors(fieldErrors(err));
      toast.error('Could not save course', err.message);
    } finally {
      setBusy(false);
    }
  };

  const toggleStatus = async (course) => {
    try {
      if (course.status === 'active') await CoursesApi.deactivate(course._id);
      else await CoursesApi.activate(course._id);
      toast.success(course.status === 'active' ? 'Course deactivated' : 'Course activated');
      list.reload();
    } catch (err) {
      toast.error('Could not change status', err.message);
    }
  };

  const confirmDelete = async () => {
    setDeleting(true);
    try {
      await CoursesApi.remove(toDelete._id);
      toast.success('Course deleted');
      setToDelete(null);
      list.reload();
    } catch (err) {
      toast.error('Could not delete course', err.message);
    } finally {
      setDeleting(false);
    }
  };

  const columns = [
    {
      key: 'name',
      header: 'Course',
      render: (row) => (
        <div>
          <div style={{ fontWeight: 600 }}>{row.name}</div>
          {row.subject && (
            <div className="muted" style={{ fontSize: 12.5 }}>
              {row.subject}
            </div>
          )}
        </div>
      ),
    },
    { key: 'grade', header: 'Grade', render: (row) => row.grade || <span className="muted">—</span> },
    {
      key: 'duration',
      header: 'Duration',
      render: (row) => (row.durationMonths ? `${row.durationMonths} months` : '—'),
    },
    {
      key: 'fee',
      header: 'Standard fee',
      align: 'right',
      render: (row) => <span className="num">{formatINR(row.standardFeePaise)}</span>,
    },
    { key: 'status', header: 'Status', render: (row) => <StatusBadge status={row.status} /> },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (row) => (
        <div className="cell-actions">
          <button className="icon-btn" onClick={() => toggleStatus(row)} aria-label="Toggle status">
            <Icon name={row.status === 'active' ? 'close' : 'check'} size={16} />
          </button>
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
        title="Courses"
        subtitle="What the centre teaches, and the standard monthly rate."
        actions={
          <Button onClick={openCreate}>
            <Icon name="plus" size={16} /> Add course
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
            placeholder="Search courses…"
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
        emptyTitle="No courses yet"
        emptyMessage="Create a course before adding batches."
        emptyAction={<Button onClick={openCreate}>Add course</Button>}
      />
      <Pagination meta={list.meta} onPage={(page) => list.updateParams({ page })} />

      <Modal
        open={modalOpen}
        title={editing ? 'Edit course' : 'Add course'}
        onClose={() => setModalOpen(false)}
        footer={
          <>
            <Button variant="ghost" onClick={() => setModalOpen(false)} disabled={busy}>
              Cancel
            </Button>
            <Button onClick={submit} disabled={busy}>
              {busy ? 'Saving…' : editing ? 'Save changes' : 'Add course'}
            </Button>
          </>
        }
      >
        <form onSubmit={submit} className="form-grid" noValidate>
          <Input
            label="Course name"
            fieldClassName="span-2"
            value={form.name}
            onChange={set('name')}
            error={errors.name}
            required
          />
          <Input label="Subject" value={form.subject} onChange={set('subject')} error={errors.subject} />
          <Input label="Grade / level" value={form.grade} onChange={set('grade')} error={errors.grade} />
          <Input
            label="Duration (months)"
            type="number"
            min="0"
            value={form.durationMonths}
            onChange={set('durationMonths')}
            error={errors.durationMonths}
          />
          <Input
            label="Standard monthly fee (₹)"
            type="number"
            min="0"
            step="0.01"
            value={form.standardFee}
            onChange={set('standardFee')}
            error={errors.standardFeePaise}
          />
          <Select label="Status" value={form.status} onChange={set('status')}>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </Select>
          <Textarea
            label="Description"
            value={form.description}
            onChange={set('description')}
            fieldClassName="span-2"
          />
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(toDelete)}
        title="Delete course?"
        message={
          toDelete
            ? `This removes "${toDelete.name}". Courses used by a batch cannot be deleted — deactivate instead.`
            : ''
        }
        confirmLabel="Delete course"
        busy={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
      />
    </>
  );
}
