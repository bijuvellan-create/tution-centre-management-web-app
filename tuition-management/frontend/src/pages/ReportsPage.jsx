import { useCallback, useEffect, useState } from 'react';
import { ReportsApi, BatchesApi, downloadCsv } from '../services/api.js';
import { Button, Card, PageHeader, Spinner, StatCard, Banner } from '../components/ui/Primitives.jsx';
import { DataTable } from '../components/ui/Table.jsx';
import { useToast } from '../components/ui/Toast.jsx';
import Icon from '../components/ui/Icon.jsx';
import { formatINR, titleCase } from '../utils/format.js';

const TABS = [
  { key: 'students', label: 'Students', icon: 'students' },
  { key: 'teachers', label: 'Teachers', icon: 'teacher' },
  { key: 'attendance', label: 'Attendance', icon: 'calendar' },
  { key: 'fees', label: 'Fees collection', icon: 'rupee' },
];

export default function ReportsPage() {
  const toast = useToast();
  const [tab, setTab] = useState('students');

  return (
    <>
      <PageHeader title="Reports" subtitle="Preview the numbers, then export a CSV for your records." />

      <div className="row" style={{ marginBottom: 18, gap: 8 }}>
        {TABS.map((t) => (
          <button
            key={t.key}
            className={`btn ${tab === t.key ? '' : 'btn--ghost'}`}
            onClick={() => setTab(t.key)}
          >
            <Icon name={t.icon} size={16} /> {t.label}
          </button>
        ))}
      </div>

      {tab === 'students' && <StudentsReport toast={toast} />}
      {tab === 'teachers' && <TeachersReport toast={toast} />}
      {tab === 'attendance' && <AttendanceReport toast={toast} />}
      {tab === 'fees' && <FeesReport toast={toast} />}
    </>
  );
}

function useReport(loader) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const run = useCallback(
    async (params) => {
      setLoading(true);
      setError(null);
      try {
        const res = await loader(params);
        setData(res);
      } catch (err) {
        setError(err);
      } finally {
        setLoading(false);
      }
    },
    [loader]
  );

  return { data, loading, error, run };
}

function Toolbar({ children, onRun, onExport, busy }) {
  return (
    <form
      className="toolbar"
      onSubmit={(e) => {
        e.preventDefault();
        onRun();
      }}
    >
      {children}
      <Button type="submit" variant="ghost" disabled={busy}>
        Run report
      </Button>
      <Button type="button" variant="subtle" onClick={onExport} disabled={busy}>
        <Icon name="download" size={16} /> Download CSV
      </Button>
    </form>
  );
}

function StudentsReport({ toast }) {
  const [filters, setFilters] = useState({ status: '', search: '' });
  const { data, loading, error, run } = useReport(ReportsApi.students);

  useEffect(() => {
    run({});
  }, [run]);

  const exportCsv = async () => {
    try {
      await downloadCsv('/reports/students', filters, 'students-report.csv');
    } catch (err) {
      toast.error('Export failed', err.message);
    }
  };

  return (
    <>
      <Toolbar onRun={() => run(filters)} onExport={exportCsv} busy={loading}>
        <select
          className="select"
          style={{ width: 160 }}
          value={filters.status}
          onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
        >
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        <input
          className="input"
          style={{ minWidth: 220 }}
          placeholder="Search name, ID or phone…"
          value={filters.search}
          onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
        />
      </Toolbar>
      {error && <Banner tone="error">{error.message}</Banner>}
      {loading ? (
        <Spinner center />
      ) : (
        <DataTable
          rows={data?.data || []}
          getRowKey={(row) => row.studentId}
          emptyTitle="No students match"
          columns={[
            { key: 'studentId', header: 'ID', render: (r) => <span className="mono">{r.studentId}</span> },
            { key: 'fullName', header: 'Name' },
            { key: 'guardianName', header: 'Guardian' },
            { key: 'guardianPhone', header: 'Phone' },
            { key: 'batch', header: 'Batch', render: (r) => r.batch || '—' },
            {
              key: 'monthlyFee',
              header: 'Monthly fee',
              align: 'right',
              render: (r) => <span className="num">₹{r.monthlyFee}</span>,
            },
            { key: 'status', header: 'Status', render: (r) => titleCase(r.status) },
          ]}
        />
      )}
    </>
  );
}

function TeachersReport({ toast }) {
  const [filters, setFilters] = useState({ status: '', search: '' });
  const { data, loading, error, run } = useReport(ReportsApi.teachers);

  useEffect(() => {
    run({});
  }, [run]);

  const exportCsv = async () => {
    try {
      await downloadCsv('/reports/teachers', filters, 'teachers-report.csv');
    } catch (err) {
      toast.error('Export failed', err.message);
    }
  };

  return (
    <>
      <Toolbar onRun={() => run(filters)} onExport={exportCsv} busy={loading}>
        <select
          className="select"
          style={{ width: 160 }}
          value={filters.status}
          onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
        >
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        <input
          className="input"
          style={{ minWidth: 220 }}
          placeholder="Search name, ID or phone…"
          value={filters.search}
          onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
        />
      </Toolbar>
      {error && <Banner tone="error">{error.message}</Banner>}
      {loading ? (
        <Spinner center />
      ) : (
        <DataTable
          rows={data?.data || []}
          getRowKey={(row) => row.teacherId}
          emptyTitle="No teachers match"
          columns={[
            { key: 'teacherId', header: 'ID', render: (r) => <span className="mono">{r.teacherId}</span> },
            { key: 'fullName', header: 'Name' },
            { key: 'phone', header: 'Phone' },
            { key: 'subjects', header: 'Subjects', render: (r) => r.subjects || '—' },
            { key: 'activeBatches', header: 'Active batches', align: 'right' },
            { key: 'status', header: 'Status', render: (r) => titleCase(r.status) },
          ]}
        />
      )}
    </>
  );
}

function AttendanceReport({ toast }) {
  const [batches, setBatches] = useState([]);
  const [filters, setFilters] = useState({ batch: '', from: '', to: '', mode: 'daily' });
  const { data, loading, error, run } = useReport(ReportsApi.attendance);

  useEffect(() => {
    BatchesApi.list({ limit: 100 })
      .then((res) => setBatches(res.data || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    run({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const exportCsv = async () => {
    try {
      await downloadCsv('/reports/attendance', filters, `attendance-${filters.mode}-report.csv`);
    } catch (err) {
      toast.error('Export failed', err.message);
    }
  };

  const summary = data?.summary || {};
  const isStudentMode = data?.mode === 'student';

  return (
    <>
      <Toolbar onRun={() => run(filters)} onExport={exportCsv} busy={loading}>
        <select
          className="select"
          style={{ minWidth: 200 }}
          value={filters.batch}
          onChange={(e) => setFilters((f) => ({ ...f, batch: e.target.value }))}
        >
          <option value="">All batches</option>
          {batches.map((b) => (
            <option key={b._id} value={b._id}>
              {b.name}
            </option>
          ))}
        </select>
        <select
          className="select"
          style={{ width: 140 }}
          value={filters.mode}
          onChange={(e) => setFilters((f) => ({ ...f, mode: e.target.value }))}
        >
          <option value="daily">Daily</option>
          <option value="monthly">Monthly</option>
          <option value="student">Per student</option>
        </select>
        <input
          className="input"
          style={{ width: 160 }}
          type="date"
          value={filters.from}
          onChange={(e) => setFilters((f) => ({ ...f, from: e.target.value }))}
          aria-label="From"
        />
        <input
          className="input"
          style={{ width: 160 }}
          type="date"
          value={filters.to}
          onChange={(e) => setFilters((f) => ({ ...f, to: e.target.value }))}
          aria-label="To"
        />
      </Toolbar>
      {error && <Banner tone="error">{error.message}</Banner>}
      {loading ? (
        <Spinner center />
      ) : data ? (
        <>
          <div className="stat-grid">
            <StatCard label="Present" value={summary.present ?? 0} tone="primary" />
            <StatCard label="Absent" value={summary.absent ?? 0} tone="danger" />
            <StatCard label="Late" value={summary.late ?? 0} />
            <StatCard label="Attendance rate" value={`${summary.attendanceRate ?? 0}%`} small />
          </div>
          <p className="muted" style={{ marginTop: 0 }}>
            {data.range?.from} to {data.range?.to} · {summary.total ?? 0} records
          </p>
          <DataTable
            rows={data.data || []}
            getRowKey={(row, i) => row.studentId || row.period || i}
            emptyTitle="No attendance in this range"
            columns={
              isStudentMode
                ? [
                    { key: 'studentId', header: 'ID', render: (r) => <span className="mono">{r.studentId}</span> },
                    { key: 'fullName', header: 'Student' },
                    { key: 'present', header: 'Present', align: 'right' },
                    { key: 'absent', header: 'Absent', align: 'right' },
                    { key: 'late', header: 'Late', align: 'right' },
                    { key: 'total', header: 'Total', align: 'right' },
                    { key: 'attendanceRate', header: 'Rate %', align: 'right' },
                  ]
                : [
                    { key: 'period', header: 'Period' },
                    { key: 'present', header: 'Present', align: 'right' },
                    { key: 'absent', header: 'Absent', align: 'right' },
                    { key: 'late', header: 'Late', align: 'right' },
                    { key: 'total', header: 'Total', align: 'right' },
                    { key: 'attendanceRate', header: 'Rate %', align: 'right' },
                  ]
            }
          />
        </>
      ) : null}
    </>
  );
}

function FeesReport({ toast }) {
  const [filters, setFilters] = useState({ from: '', to: '' });
  const { data, loading, error, run } = useReport(ReportsApi.fees);

  useEffect(() => {
    run({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const exportCsv = async () => {
    try {
      await downloadCsv('/reports/fees', filters, 'fees-collection-report.csv');
    } catch (err) {
      toast.error('Export failed', err.message);
    }
  };

  const summary = data?.summary || {};

  return (
    <>
      <Toolbar onRun={() => run(filters)} onExport={exportCsv} busy={loading}>
        <input
          className="input"
          style={{ width: 160 }}
          type="date"
          value={filters.from}
          onChange={(e) => setFilters((f) => ({ ...f, from: e.target.value }))}
          aria-label="From"
        />
        <input
          className="input"
          style={{ width: 160 }}
          type="date"
          value={filters.to}
          onChange={(e) => setFilters((f) => ({ ...f, to: e.target.value }))}
          aria-label="To"
        />
      </Toolbar>
      {error && <Banner tone="error">{error.message}</Banner>}
      {loading ? (
        <Spinner center />
      ) : data ? (
        <>
          <div className="stat-grid">
            <StatCard
              label="Collected"
              value={formatINR(summary.totalCollectedPaise)}
              tone="primary"
              small
            />
            <StatCard
              label="Outstanding (all time)"
              value={formatINR(summary.totalOutstandingPaise)}
              tone="danger"
              small
            />
            <StatCard label="Payments" value={summary.paymentCount ?? 0} />
          </div>

          {(summary.byMethod || []).length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <Card pad>
                <strong>Collections by method</strong>
                <div className="legend" style={{ marginTop: 10 }}>
                  {summary.byMethod.map((m) => (
                    <span className="k" key={m.method}>
                      {titleCase(m.method)}: <strong className="num">{formatINR(m.totalPaise)}</strong> ({m.count})
                    </span>
                  ))}
                </div>
              </Card>
            </div>
          )}

          <DataTable
            rows={data.data || []}
            getRowKey={(row, i) => row.receiptNumber || i}
            emptyTitle="No payments in this range"
            columns={[
              { key: 'receiptNumber', header: 'Receipt', render: (r) => <span className="mono">{r.receiptNumber}</span> },
              { key: 'paymentDate', header: 'Date' },
              { key: 'studentName', header: 'Student' },
              { key: 'feeTitle', header: 'Fee' },
              { key: 'amount', header: 'Amount (₹)', align: 'right', render: (r) => <span className="num">₹{r.amount}</span> },
              { key: 'method', header: 'Method', render: (r) => titleCase(r.method) },
            ]}
          />
        </>
      ) : null}
    </>
  );
}
