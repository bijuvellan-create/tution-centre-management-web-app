import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { BatchesApi, StudentsApi } from '../services/api.js';
import { useAuth } from '../hooks/useAuth.js';
import { Button, Card, PageHeader, Spinner, StatusBadge, StatCard } from '../components/ui/Primitives.jsx';
import { DataTable } from '../components/ui/Table.jsx';
import { Select } from '../components/ui/Form.jsx';
import { Modal, ConfirmDialog } from '../components/ui/Modal.jsx';
import { useToast } from '../components/ui/Toast.jsx';
import Icon from '../components/ui/Icon.jsx';
import { formatDate, todayInputValue } from '../utils/format.js';

export default function BatchDetailPage() {
  const { id } = useParams();
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [batch, setBatch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [enrollOpen, setEnrollOpen] = useState(false);
  const [candidates, setCandidates] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState('');
  const [enrolling, setEnrolling] = useState(false);
  const [toRemove, setToRemove] = useState(null);
  const [removing, setRemoving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await BatchesApi.get(id);
      setBatch(res.data);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const openEnroll = async () => {
    setSelectedStudent('');
    setEnrollOpen(true);
    try {
      const res = await StudentsApi.list({ limit: 100, status: 'active' });
      const current = (res.data || []).filter((s) => {
        const sid = s.batch?._id || s.batch;
        return !sid || String(sid) === String(id);
      });
      setCandidates(current);
    } catch (err) {
      toast.error('Could not load students', err.message);
    }
  };

  const enroll = async () => {
    if (!selectedStudent) return;
    setEnrolling(true);
    try {
      await BatchesApi.enroll(id, selectedStudent);
      toast.success('Student enrolled');
      setEnrollOpen(false);
      load();
    } catch (err) {
      toast.error('Could not enroll student', err.message);
    } finally {
      setEnrolling(false);
    }
  };

  const confirmRemove = async () => {
    setRemoving(true);
    try {
      await BatchesApi.unenroll(id, toRemove._id);
      toast.success('Student removed');
      setToRemove(null);
      load();
    } catch (err) {
      toast.error('Could not remove student', err.message);
    } finally {
      setRemoving(false);
    }
  };

  if (loading) return <Spinner center />;
  if (error || !batch) {
    return (
      <Card pad>
        <p className="muted" style={{ marginTop: 0 }}>
          {error?.message || 'Batch not found.'}
        </p>
        <Button variant="ghost" onClick={() => navigate('/batches')}>
          Back to batches
        </Button>
      </Card>
    );
  }

  const enrolled = batch.students || [];

  return (
    <>
      <PageHeader
        title={batch.name}
        subtitle={`${batch.course?.name || 'No course'} · ${batch.status}`}
        actions={
          <>
            <Button variant="ghost" onClick={() => navigate('/batches')}>
              <Icon name="chevronLeft" size={16} /> Back
            </Button>
            <Button
              variant="subtle"
              onClick={() =>
                navigate(`/attendance?batch=${batch._id}&date=${todayInputValue()}`)
              }
            >
              <Icon name="calendar" size={16} /> Take attendance
            </Button>
            {isAdmin && (
              <Button onClick={openEnroll}>
                <Icon name="plus" size={16} /> Enroll student
              </Button>
            )}
          </>
        }
      />

      <div className="stat-grid">
        <StatCard label="Enrolled" value={`${enrolled.length}/${batch.capacity}`} />
        <StatCard
          label="Teacher"
          value={batch.teacher?.fullName || 'Unassigned'}
          small
        />
        <StatCard
          label="Schedule"
          value={(batch.classDays || []).join(', ') || '—'}
          small
          tone="primary"
        />
        <StatCard
          label="Time"
          value={batch.startTime ? `${batch.startTime}–${batch.endTime}` : '—'}
          small
          tone="primary"
        />
      </div>

      <div className="stack">
        <Card>
          <div className="card__head">
            <h2>Details</h2>
          </div>
          <div className="card__body">
            <div className="detail-grid">
              <Item k="Course" v={batch.course?.name || '—'} />
              <Item k="Teacher" v={batch.teacher?.fullName || '—'} />
              <Item k="Start date" v={formatDate(batch.startDate)} />
              <Item k="End date" v={formatDate(batch.endDate)} />
              <Item k="Status" v={<StatusBadge status={batch.status} />} />
            </div>
          </div>
        </Card>

        <Card>
          <div className="card__head">
            <h2>Roster</h2>
            <span className="muted" style={{ fontSize: 13.5 }}>
              {enrolled.length} enrolled
            </span>
          </div>
          <DataTable
            rows={enrolled}
            getRowKey={(row) => row._id}
            emptyTitle="No students enrolled"
            emptyMessage="Enroll active students to build this batch's roster."
            emptyAction={isAdmin ? <Button onClick={openEnroll}>Enroll student</Button> : null}
            columns={[
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
                key: 'phone',
                header: 'Guardian phone',
                render: (row) => row.guardianPhone || '—',
              },
              { key: 'status', header: 'Status', render: (row) => <StatusBadge status={row.status} /> },
              isAdmin && {
                key: 'actions',
                header: '',
                align: 'right',
                render: (row) => (
                  <div className="cell-actions">
                    <button className="icon-btn" onClick={() => setToRemove(row)} aria-label="Remove">
                      <Icon name="trash" size={16} />
                    </button>
                  </div>
                ),
              },
            ].filter(Boolean)}
          />
        </Card>
      </div>

      <Modal
        open={enrollOpen}
        title="Enroll a student"
        onClose={() => setEnrollOpen(false)}
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setEnrollOpen(false)} disabled={enrolling}>
              Cancel
            </Button>
            <Button onClick={enroll} disabled={enrolling || !selectedStudent}>
              {enrolling ? 'Enrolling…' : 'Enroll'}
            </Button>
          </>
        }
      >
        {candidates.length === 0 ? (
          <p className="muted" style={{ margin: 0 }}>
            No eligible students found. Students already assigned to another batch must be moved first.
          </p>
        ) : (
          <Select
            label="Student"
            value={selectedStudent}
            onChange={(e) => setSelectedStudent(e.target.value)}
          >
            <option value="">Select a student…</option>
            {candidates.map((s) => (
              <option key={s._id} value={s._id}>
                {s.fullName} ({s.studentId})
              </option>
            ))}
          </Select>
        )}
      </Modal>

      <ConfirmDialog
        open={Boolean(toRemove)}
        title="Remove student from batch?"
        message={toRemove ? `${toRemove.fullName} will be removed from this batch.` : ''}
        confirmLabel="Remove"
        busy={removing}
        onConfirm={confirmRemove}
        onCancel={() => setToRemove(null)}
      />
    </>
  );
}

function Item({ k, v }) {
  return (
    <div className="detail-item">
      <div className="k">{k}</div>
      <div className="v">{v}</div>
    </div>
  );
}
