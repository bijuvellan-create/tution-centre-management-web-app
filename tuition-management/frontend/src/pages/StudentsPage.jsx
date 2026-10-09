import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { StudentsApi, CoursesApi, BatchesApi } from '../services/api.js';
import { useList } from '../hooks/useList.js';
import { Button, PageHeader, StatusBadge } from '../components/ui/Primitives.jsx';
import { DataTable, Pagination } from '../components/ui/Table.jsx';
import { Input, Select, Textarea } from '../components/ui/Form.jsx';
import { Modal, ConfirmDialog } from '../components/ui/Modal.jsx';
import { useToast } from '../components/ui/Toast.jsx';
import Icon from '../components/ui/Icon.jsx';
import { fieldErrors } from '../utils/errors.js';
import { formatINR, todayInputValue, paiseToRupees, rupeesToPaise } from '../utils/format.js';

const GENDERS = [
  { value: 'unspecified', label: 'Not specified' },
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other' },
];

const emptyForm = () => ({
  fullName: '',
  guardianName: '',
  guardianPhone: '',
  email: '',
  dateOfBirth: '',
  gender: 'unspecified',
  admissionDate: todayInputValue(),
  monthlyFee: '',
  status: 'active',
  batch: '',
  courses: [],
  address: '',
  notes: '',
});

export default function StudentsPage() {
  const toast = useToast();
  const list = useList(StudentsApi.list, { page: 1, limit: 10, search: '', status: '' });
  const [searchText, setSearchText] = useState('');
  const [courses, setCourses] = useState([]);
  const [batches, setBatches] = useState([]);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm());
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [toDelete, setToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    Promise.all([
      CoursesApi.list({ limit: 100, status: 'active' }),
      BatchesApi.list({ limit: 100 }),
    ])
      .then(([c, b]) => {
        setCourses(c.data || []);
        setBatches(b.data || []);
      })
      .catch(() => {});
  }, []);

  const set = (key) => (event) => setForm((prev) => ({ ...prev, [key]: event.target.value }));

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm());
    setErrors({});
    setModalOpen(true);
  };

  const openEdit = (student) => {
    setEditing(student);
    setForm({
      fullName: student.fullName || '',
      guardianName: student.guardianName || '',
      guardianPhone: student.guardianPhone || '',
      email: student.email || '',
      dateOfBirth: student.dateOfBirth ? student.dateOfBirth.slice(0, 10) : '',
      gender: student.gender || 'unspecified',
      admissionDate: student.admissionDate ? student.admissionDate.slice(0, 10) : todayInputValue(),
      monthlyFee: paiseToRupees(student.monthlyFeePaise) || '',
      status: student.status || 'active',
      batch: student.batch?._id || student.batch || '',
      courses: (student.courses || []).map((c) => c._id || c),
      address: student.address || '',
      notes: student.notes || '',
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
      guardianName: form.guardianName.trim(),
      guardianPhone: form.guardianPhone.trim(),
      email: form.email.trim() || undefined,
      gender: form.gender,
      status: form.status,
      address: form.address.trim() || undefined,
      notes: form.notes.trim() || undefined,
      monthlyFeePaise: form.monthlyFee === '' ? 0 : rupeesToPaise(form.monthlyFee),
      dateOfBirth: form.dateOfBirth || undefined,
      admissionDate: form.admissionDate || undefined,
      batch: form.batch || undefined,
      courses: form.courses,
    };
    try {
      if (editing) {
        await StudentsApi.update(editing._id, payload);
        toast.success('Student updated');
      } else {
        await StudentsApi.create(payload);
        toast.success('Student added');
      }
      setModalOpen(false);
      list.reload();
    } catch (err) {
      setErrors(fieldErrors(err));
      toast.error('Could not save student', err.message);
    } finally {
      setBusy(false);
    }
  };

  const confirmDelete = async () => {
    setDeleting(true);
    try {
      await StudentsApi.remove(toDelete._id);
      toast.success('Student deleted');
      setToDelete(null);
      list.reload();
    } catch (err) {
      toast.error('Could not delete student', err.message);
    } finally {
      setDeleting(false);
    }
  };

  const columns = [
    {
      key: 'studentId',
      header: 'ID',
      render: (row) => <span className="mono">{row.studentId}</span>,
    },
    {
      key: 'fullName',
      header: 'Name',
      render: (row) => <Link to={`/students/${row._id}`}>{row.fullName}</Link>,
    },
    {
      key: 'guardian',
      header: 'Guardian',
      render: (row) => (
        <div>
          <div>{row.guardianName}</div>
          <div className="muted" style={{ fontSize: 12.5 }}>
            {row.guardianPhone}
          </div>
        </div>
      ),
    },
    {
      key: 'batch',
      header: 'Batch',
      render: (row) => row.batch?.name || <span className="muted">—</span>,
    },
    {
      key: 'fee',
      header: 'Monthly fee',
      align: 'right',
      render: (row) => <span className="num">{formatINR(row.monthlyFeePaise)}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (row) => (
        <div className="cell-actions">
          <Link className="icon-btn" to={`/students/${row._id}`} aria-label="View">
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
        title="Students"
        subtitle="Admissions, guardians and current batch."
        actions={
          <Button onClick={openCreate}>
            <Icon name="plus" size={16} /> Add student
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
            placeholder="Search name, ID, guardian or phone…"
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
        emptyTitle="No students found"
        emptyMessage="Adjust your search, or add a new student."
        emptyAction={<Button onClick={openCreate}>Add student</Button>}
      />
      <Pagination meta={list.meta} onPage={(page) => list.updateParams({ page })} />

      <Modal
        open={modalOpen}
        title={editing ? 'Edit student' : 'Add student'}
        onClose={() => setModalOpen(false)}
        footer={
          <>
            <Button variant="ghost" onClick={() => setModalOpen(false)} disabled={busy}>
              Cancel
            </Button>
            <Button onClick={submit} disabled={busy}>
              {busy ? 'Saving…' : editing ? 'Save changes' : 'Add student'}
            </Button>
          </>
        }
      >
        <form onSubmit={submit} className="form-grid" noValidate id="student-form">
          <Input
            label="Full name"
            fieldClassName="span-2"
            value={form.fullName}
            onChange={set('fullName')}
            error={errors.fullName}
            required
          />
          <Input
            label="Guardian name"
            value={form.guardianName}
            onChange={set('guardianName')}
            error={errors.guardianName}
            required
          />
          <Input
            label="Guardian phone"
            value={form.guardianPhone}
            onChange={set('guardianPhone')}
            error={errors.guardianPhone}
            required
          />
          <Input label="Email" type="email" value={form.email} onChange={set('email')} error={errors.email} />
          <Input
            label="Date of birth"
            type="date"
            value={form.dateOfBirth}
            onChange={set('dateOfBirth')}
            error={errors.dateOfBirth}
          />
          <Select label="Gender" value={form.gender} onChange={set('gender')}>
            {GENDERS.map((g) => (
              <option key={g.value} value={g.value}>
                {g.label}
              </option>
            ))}
          </Select>
          <Input
            label="Admission date"
            type="date"
            value={form.admissionDate}
            onChange={set('admissionDate')}
          />
          <Input
            label="Monthly fee (₹)"
            type="number"
            min="0"
            step="0.01"
            value={form.monthlyFee}
            onChange={set('monthlyFee')}
            error={errors.monthlyFeePaise}
          />
          <Select label="Batch" value={form.batch} onChange={set('batch')} error={errors.batch}>
            <option value="">No batch</option>
            {batches.map((b) => (
              <option key={b._id} value={b._id}>
                {b.name}
              </option>
            ))}
          </Select>
          <Select label="Status" value={form.status} onChange={set('status')}>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </Select>
          <div className="field span-2">
            <label className="field__label" htmlFor="courses-select">
              Courses
            </label>
            <select
              id="courses-select"
              className="select"
              multiple
              size={4}
              value={form.courses}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  courses: Array.from(e.target.selectedOptions).map((o) => o.value),
                }))
              }
            >
              {courses.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name}
                  {c.subject ? ` — ${c.subject}` : ''}
                </option>
              ))}
            </select>
            <div className="field__hint">Hold Ctrl (or Cmd) to select more than one.</div>
          </div>
          <Textarea
            label="Address"
            value={form.address}
            onChange={set('address')}
            fieldClassName="span-2"
          />
          <Textarea label="Notes" value={form.notes} onChange={set('notes')} fieldClassName="span-2" />
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(toDelete)}
        title="Delete student?"
        message={
          toDelete
            ? `This permanently removes ${toDelete.fullName}. Students with attendance or payment history cannot be deleted — set them to inactive instead.`
            : ''
        }
        confirmLabel="Delete student"
        busy={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
      />
    </>
  );
}
