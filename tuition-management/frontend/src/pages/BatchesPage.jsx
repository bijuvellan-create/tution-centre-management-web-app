import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BatchesApi, CoursesApi, TeachersApi } from '../services/api.js';
import { useList } from '../hooks/useList.js';
import { useAuth } from '../hooks/useAuth.js';
import { Button, PageHeader, StatusBadge } from '../components/ui/Primitives.jsx';
import { DataTable, Pagination } from '../components/ui/Table.jsx';
import { Input, Select } from '../components/ui/Form.jsx';
import { Modal, ConfirmDialog } from '../components/ui/Modal.jsx';
import { useToast } from '../components/ui/Toast.jsx';
import Icon from '../components/ui/Icon.jsx';
import { fieldErrors } from '../utils/errors.js';
import { todayInputValue } from '../utils/format.js';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const emptyForm = () => ({
  name: '',
  course: '',
  teacher: '',
  startDate: todayInputValue(),
  endDate: '',
  classDays: [],
  startTime: '',
  endTime: '',
  capacity: 30,
  status: 'active',
});

export default function BatchesPage() {
  const { isAdmin } = useAuth();
  const toast = useToast();
  const list = useList(BatchesApi.list, { page: 1, limit: 10, search: '', status: '' });
  const [searchText, setSearchText] = useState('');
  const [courses, setCourses] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm());
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [toDelete, setToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    Promise.all([CoursesApi.list({ limit: 100, status: 'active' }), TeachersApi.list({ limit: 100, status: 'active' })])
      .then(([c, t]) => {
        setCourses(c.data || []);
        setTeachers(t.data || []);
      })
      .catch(() => {});
  }, []);

  const set = (key) => (event) => setForm((prev) => ({ ...prev, [key]: event.target.value }));

  const toggleDay = (day) =>
    setForm((prev) => ({
      ...prev,
      classDays: prev.classDays.includes(day)
        ? prev.classDays.filter((d) => d !== day)
        : [...prev.classDays, day],
    }));

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm());
    setErrors({});
    setModalOpen(true);
  };

  const openEdit = (batch) => {
    setEditing(batch);
    setForm({
      name: batch.name || '',
      course: batch.course?._id || batch.course || '',
      teacher: batch.teacher?._id || batch.teacher || '',
      startDate: batch.startDate ? batch.startDate.slice(0, 10) : todayInputValue(),
      endDate: batch.endDate ? batch.endDate.slice(0, 10) : '',
      classDays: batch.classDays || [],
      startTime: batch.startTime || '',
      endTime: batch.endTime || '',
      capacity: batch.capacity ?? 30,
      status: batch.status || 'active',
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
      course: form.course,
      teacher: form.teacher || undefined,
      startDate: form.startDate || undefined,
      endDate: form.endDate || undefined,
      classDays: form.classDays,
      startTime: form.startTime || undefined,
      endTime: form.endTime || undefined,
      capacity: form.capacity === '' ? 30 : Number(form.capacity),
      status: form.status,
    };
    try {
      if (editing) {
        await BatchesApi.update(editing._id, payload);
        toast.success('Batch updated');
      } else {
        await BatchesApi.create(payload);
        toast.success('Batch added');
      }
      setModalOpen(false);
      list.reload();
    } catch (err) {
      setErrors(fieldErrors(err));
      toast.error('Could not save batch', err.message);
    } finally {
      setBusy(false);
    }
  };

  const toggleStatus = async (batch) => {
    try {
      if (batch.status === 'active') await BatchesApi.deactivate(batch._id);
      else await BatchesApi.activate(batch._id);
      toast.success(batch.status === 'active' ? 'Batch deactivated' : 'Batch activated');
      list.reload();
    } catch (err) {
      toast.error('Could not change status', err.message);
    }
  };

  const confirmDelete = async () => {
    setDeleting(true);
    try {
      await BatchesApi.remove(toDelete._id);
      toast.success('Batch deleted');
      setToDelete(null);
      list.reload();
    } catch (err) {
      toast.error('Could not delete batch', err.message);
    } finally {
      setDeleting(false);
    }
  };

  const columns = [
    {
      key: 'name',
      header: 'Batch',
      render: (row) => <Link to={`/batches/${row._id}`}>{row.name}</Link>,
    },
    { key: 'course', header: 'Course', render: (row) => row.course?.name || '—' },
    { key: 'teacher', header: 'Teacher', render: (row) => row.teacher?.fullName || <span className="muted">—</span> },
    {
      key: 'schedule',
      header: 'Schedule',
      render: (row) => (
        <div>
          <div>{(row.classDays || []).join(', ') || '—'}</div>
          {row.startTime && (
            <div className="muted" style={{ fontSize: 12.5 }}>
              {row.startTime}–{row.endTime}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'enrolled',
      header: 'Enrolled',
      align: 'right',
      render: (row) => (
        <span className="num">
          {(row.students || []).length}/{row.capacity}
        </span>
      ),
    },
    { key: 'status', header: 'Status', render: (row) => <StatusBadge status={row.status} /> },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (row) => (
        <div className="cell-actions">
          <Link className="icon-btn" to={`/batches/${row._id}`} aria-label="View">
            <Icon name="eye" size={16} />
          </Link>
          {isAdmin && (
            <>
              <button className="icon-btn" onClick={() => toggleStatus(row)} aria-label="Toggle status">
                <Icon name={row.status === 'active' ? 'close' : 'check'} size={16} />
              </button>
              <button className="icon-btn" onClick={() => openEdit(row)} aria-label="Edit">
                <Icon name="edit" size={16} />
              </button>
              <button className="icon-btn" onClick={() => setToDelete(row)} aria-label="Delete">
                <Icon name="trash" size={16} />
              </button>
            </>
          )}
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Batches"
        subtitle={isAdmin ? 'Class groups, schedules and rosters.' : 'The batches assigned to you.'}
        actions={
          isAdmin && (
            <Button onClick={openCreate}>
              <Icon name="plus" size={16} /> Add batch
            </Button>
          )
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
            placeholder="Search batches…"
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
        emptyTitle="No batches yet"
        emptyMessage={isAdmin ? 'Create a batch and start enrolling students.' : 'No batches are assigned to you.'}
        emptyAction={isAdmin ? <Button onClick={openCreate}>Add batch</Button> : null}
      />
      <Pagination meta={list.meta} onPage={(page) => list.updateParams({ page })} />

      <Modal
        open={modalOpen}
        title={editing ? 'Edit batch' : 'Add batch'}
        onClose={() => setModalOpen(false)}
        footer={
          <>
            <Button variant="ghost" onClick={() => setModalOpen(false)} disabled={busy}>
              Cancel
            </Button>
            <Button onClick={submit} disabled={busy}>
              {busy ? 'Saving…' : editing ? 'Save changes' : 'Add batch'}
            </Button>
          </>
        }
      >
        <form onSubmit={submit} className="form-grid" noValidate>
          <Input
            label="Batch name"
            fieldClassName="span-2"
            value={form.name}
            onChange={set('name')}
            error={errors.name}
            required
          />
          <Select label="Course" value={form.course} onChange={set('course')} error={errors.course} required>
            <option value="">Select a course…</option>
            {courses.map((c) => (
              <option key={c._id} value={c._id}>
                {c.name}
              </option>
            ))}
          </Select>
          <Select label="Teacher" value={form.teacher} onChange={set('teacher')} error={errors.teacher}>
            <option value="">Unassigned</option>
            {teachers.map((t) => (
              <option key={t._id} value={t._id}>
                {t.fullName}
              </option>
            ))}
          </Select>
          <Input label="Start date" type="date" value={form.startDate} onChange={set('startDate')} />
          <Input label="End date" type="date" value={form.endDate} onChange={set('endDate')} />
          <Input label="Start time" type="time" value={form.startTime} onChange={set('startTime')} />
          <Input label="End time" type="time" value={form.endTime} onChange={set('endTime')} />
          <Input
            label="Capacity"
            type="number"
            min="1"
            max="500"
            value={form.capacity}
            onChange={set('capacity')}
            error={errors.capacity}
          />
          <Select label="Status" value={form.status} onChange={set('status')}>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </Select>
          <div className="field span-2">
            <span className="field__label">Class days</span>
            <div className="row" style={{ gap: 14 }}>
              {DAYS.map((day) => (
                <label className="checkbox-row" key={day}>
                  <input
                    type="checkbox"
                    checked={form.classDays.includes(day)}
                    onChange={() => toggleDay(day)}
                  />
                  {day}
                </label>
              ))}
            </div>
            {errors.classDays && <div className="field__error">{errors.classDays}</div>}
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(toDelete)}
        title="Delete batch?"
        message={
          toDelete
            ? `This removes "${toDelete.name}". Batches that still have students or attendance cannot be deleted — deactivate instead.`
            : ''
        }
        confirmLabel="Delete batch"
        busy={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
      />
    </>
  );
}
