import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { DashboardApi } from '../services/api.js';
import { useAuth } from '../hooks/useAuth.js';
import { Card, PageHeader, Spinner, StatCard, StatusBadge } from '../components/ui/Primitives.jsx';
import { DataTable } from '../components/ui/Table.jsx';
import { formatDate, formatINR } from '../utils/format.js';

const METHOD_LABELS = {
  cash: 'Cash',
  upi: 'UPI',
  bank_transfer: 'Bank transfer',
  card: 'Card',
  cheque: 'Cheque',
  other: 'Other',
};

export default function DashboardPage() {
  const { user, isAdmin } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await DashboardApi.summary();
      setData(res.data);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <Spinner center />;
  if (error) {
    return (
      <Card pad>
        <p className="muted mb-0">Could not load the dashboard. {error.message}</p>
      </Card>
    );
  }

  const firstName = (user?.name || '').split(' ')[0];

  if (!isAdmin) {
    return (
      <>
        <PageHeader title={`Hello, ${firstName}`} subtitle={data?.today ? `Today is ${formatDate(data.today)}` : undefined} />
        {data?.message ? (
          <Card pad>
            <p className="muted mb-0">{data.message}</p>
          </Card>
        ) : (
          <>
            <div className="stat-grid">
              <StatCard label="My batches" value={data.counts?.myBatches ?? 0} />
              <StatCard label="My students" value={data.counts?.myStudents ?? 0} />
              <StatCard
                label="Present today"
                value={data.todayAttendance?.present ?? 0}
                tone="primary"
              />
              <StatCard label="Absent today" value={data.todayAttendance?.absent ?? 0} tone="danger" />
            </div>
            <Card>
              <div className="card__head">
                <h2>My batches</h2>
                <Link className="btn btn--ghost btn--sm" to="/batches">
                  View all
                </Link>
              </div>
              <div className="card__body">
                {(data.batches || []).length === 0 ? (
                  <p className="muted mb-0">You have no active batches assigned yet.</p>
                ) : (
                  <div className="stack">
                    {data.batches.map((b) => (
                      <div className="row row--between" key={b.id}>
                        <Link to={`/batches/${b.id}`}>{b.name}</Link>
                        <span className="muted num">
                          {b.enrolled}/{b.capacity} enrolled
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Card>
          </>
        )}
      </>
    );
  }

  const fees = data?.fees || {};
  return (
    <>
      <PageHeader
        title={`Hello, ${firstName}`}
        subtitle={data?.today ? `Today is ${formatDate(data.today)}` : undefined}
      />

      <div className="stat-grid">
        <StatCard label="Active students" value={data?.counts?.activeStudents ?? 0} />
        <StatCard label="Teachers" value={data?.counts?.teachers ?? 0} />
        <StatCard label="Active courses" value={data?.counts?.courses ?? 0} />
        <StatCard label="Active batches" value={data?.counts?.batches ?? 0} />
      </div>

      <div className="stat-grid">
        <StatCard
          label="Collected this month"
          value={formatINR(fees.collectedPaise)}
          tone="primary"
          small
        />
        <StatCard
          label="Outstanding"
          value={formatINR(fees.outstandingPaise)}
          tone="danger"
          small
        />
        <StatCard label="Overdue fees" value={fees.overdueFees ?? 0} tone="danger" />
      </div>

      <div className="grid-2">
        <Card>
          <div className="card__head">
            <h2>Recent payments</h2>
            <Link className="btn btn--ghost btn--sm" to="/payments">
              All payments
            </Link>
          </div>
          <DataTable
            rows={data?.recentPayments || []}
            getRowKey={(row) => row._id}
            emptyTitle="No payments yet"
            emptyMessage="Payments you record will appear here."
            columns={[
              {
                key: 'receipt',
                header: 'Receipt',
                render: (row) => <span className="mono">{row.receiptNumber}</span>,
              },
              {
                key: 'student',
                header: 'Student',
                render: (row) => row.student?.fullName || '—',
              },
              {
                key: 'amount',
                header: 'Amount',
                align: 'right',
                render: (row) => <span className="num">{formatINR(row.amountPaise)}</span>,
              },
              {
                key: 'method',
                header: 'Method',
                render: (row) => METHOD_LABELS[row.method] || row.method,
              },
            ]}
          />
        </Card>

        <Card>
          <div className="card__head">
            <h2>Newest students</h2>
            <Link className="btn btn--ghost btn--sm" to="/students">
              All students
            </Link>
          </div>
          <DataTable
            rows={data?.recentStudents || []}
            getRowKey={(row) => row._id}
            emptyTitle="No students yet"
            emptyMessage="Add your first student to get started."
            columns={[
              {
                key: 'name',
                header: 'Student',
                render: (row) => (
                  <Link to={`/students/${row._id}`}>{row.fullName}</Link>
                ),
              },
              {
                key: 'id',
                header: 'ID',
                render: (row) => <span className="mono">{row.studentId}</span>,
              },
              {
                key: 'joined',
                header: 'Added',
                render: (row) => formatDate(row.createdAt),
              },
            ]}
          />
        </Card>
      </div>

      <div style={{ marginTop: 20 }}>
        <Card pad>
          <div className="row row--between">
            <div>
              <strong>Attendance today</strong>
              <div className="muted" style={{ fontSize: 13.5 }}>
                {data?.todayAttendance?.present ?? 0} present · {data?.todayAttendance?.absent ?? 0}{' '}
                absent · {data?.todayAttendance?.late ?? 0} late
              </div>
            </div>
            <Link className="btn btn--subtle btn--sm" to="/attendance">
              Take attendance
            </Link>
          </div>
        </Card>
      </div>
    </>
  );
}
