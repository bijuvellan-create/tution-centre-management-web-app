import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { StudentsApi, FeesApi, AttendanceApi } from '../services/api.js';
import { Button, Card, PageHeader, Spinner, StatusBadge, StatCard } from '../components/ui/Primitives.jsx';
import { DataTable } from '../components/ui/Table.jsx';
import Icon from '../components/ui/Icon.jsx';
import { formatDate, formatINR, titleCase } from '../utils/format.js';

export default function StudentDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [student, setStudent] = useState(null);
  const [fees, setFees] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [s, f, a] = await Promise.all([
        StudentsApi.get(id),
        FeesApi.list({ student: id, limit: 50 }),
        AttendanceApi.list({ student: id, limit: 50 }),
      ]);
      setStudent(s.data);
      setFees(f.data || []);
      setAttendance(a.data || []);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <Spinner center />;
  if (error || !student) {
    return (
      <Card pad>
        <p className="muted" style={{ marginTop: 0 }}>
          {error?.message || 'Student not found.'}
        </p>
        <Button variant="ghost" onClick={() => navigate('/students')}>
          Back to students
        </Button>
      </Card>
    );
  }

  const outstanding = fees.reduce((sum, f) => sum + (f.balancePaise || 0), 0);
  const paid = fees.reduce((sum, f) => sum + (f.paidPaise || 0), 0);
  const present = attendance.filter((a) => a.status === 'present' || a.status === 'late').length;

  return (
    <>
      <PageHeader
        title={student.fullName}
        subtitle={`${student.studentId} · ${student.status}`}
        actions={
          <Button variant="ghost" onClick={() => navigate('/students')}>
            <Icon name="chevronLeft" size={16} /> Back
          </Button>
        }
      />

      <div className="stat-grid">
        <StatCard label="Fees paid" value={formatINR(paid)} tone="primary" small />
        <StatCard label="Outstanding" value={formatINR(outstanding)} tone="danger" small />
        <StatCard
          label="Attendance marked"
          value={`${present}/${attendance.length}`}
          small
        />
        <StatCard label="Monthly fee" value={formatINR(student.monthlyFeePaise)} small />
      </div>

      <div className="stack">
        <Card>
          <div className="card__head">
            <h2>Profile</h2>
          </div>
          <div className="card__body">
            <div className="detail-grid">
              <Item k="Guardian" v={student.guardianName} />
              <Item k="Guardian phone" v={student.guardianPhone} />
              <Item k="Email" v={student.email || '—'} />
              <Item k="Gender" v={titleCase(student.gender)} />
              <Item k="Date of birth" v={formatDate(student.dateOfBirth)} />
              <Item k="Admission date" v={formatDate(student.admissionDate)} />
              <Item k="Batch" v={student.batch?.name || '—'} />
              <Item
                k="Courses"
                v={(student.courses || []).map((c) => c.name).join(', ') || '—'}
              />
              <Item k="Address" v={student.address || '—'} />
              <Item k="Notes" v={student.notes || '—'} />
            </div>
          </div>
        </Card>

        <Card>
          <div className="card__head">
            <h2>Fee history</h2>
          </div>
          <DataTable
            rows={fees}
            getRowKey={(row) => row._id}
            emptyTitle="No fees raised"
            emptyMessage="Fee invoices for this student will appear here."
            columns={[
              { key: 'title', header: 'Title' },
              {
                key: 'period',
                header: 'Period',
                render: (row) => row.periodLabel || '—',
              },
              {
                key: 'amount',
                header: 'Amount',
                align: 'right',
                render: (row) => <span className="num">{formatINR(row.amountPaise)}</span>,
              },
              {
                key: 'balance',
                header: 'Balance',
                align: 'right',
                render: (row) => <span className="num">{formatINR(row.balancePaise)}</span>,
              },
              {
                key: 'due',
                header: 'Due date',
                render: (row) => formatDate(row.dueDate),
              },
              {
                key: 'status',
                header: 'Status',
                render: (row) => (
                  <StatusBadge status={row.overdue ? 'overdue' : row.status} />
                ),
              },
            ]}
          />
        </Card>

        <Card>
          <div className="card__head">
            <h2>Recent attendance</h2>
          </div>
          <DataTable
            rows={attendance}
            getRowKey={(row) => row._id}
            emptyTitle="No attendance yet"
            emptyMessage="Attendance records for this student will appear here."
            columns={[
              { key: 'date', header: 'Date', render: (row) => formatDate(row.date) },
              {
                key: 'batch',
                header: 'Batch',
                render: (row) => row.batch?.name || '—',
              },
              {
                key: 'status',
                header: 'Status',
                render: (row) => <StatusBadge status={row.status} />,
              },
              {
                key: 'markedBy',
                header: 'Marked by',
                render: (row) => row.markedBy?.name || '—',
              },
            ]}
          />
        </Card>
      </div>
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
