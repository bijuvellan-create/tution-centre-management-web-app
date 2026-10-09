import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { BatchesApi, AttendanceApi } from '../services/api.js';
import { Button, Card, PageHeader, Spinner, StatusBadge, Banner } from '../components/ui/Primitives.jsx';
import { useToast } from '../components/ui/Toast.jsx';
import Icon from '../components/ui/Icon.jsx';
import { todayInputValue } from '../utils/format.js';

const STATUSES = ['present', 'absent', 'late', 'excused'];

export default function AttendancePage() {
  const toast = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const [batches, setBatches] = useState([]);
  const [batch, setBatch] = useState(searchParams.get('batch') || '');
  const [date, setDate] = useState(searchParams.get('date') || todayInputValue());
  const [roster, setRoster] = useState([]);
  const [records, setRecords] = useState({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    BatchesApi.list({ limit: 100, status: 'active' })
      .then((res) => {
        const list = res.data || [];
        setBatches(list);
        if (!batch && list.length > 0) setBatch(list[0]._id);
      })
      .catch((err) => toast.error('Could not load batches', err.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadSheet = useCallback(async () => {
    if (!batch || !date) return;
    setLoading(true);
    setLoaded(false);
    try {
      const [batchRes, attendanceRes] = await Promise.all([
        BatchesApi.get(batch),
        AttendanceApi.list({ batch, date, limit: 200 }),
      ]);
      const students = batchRes.data?.students || [];
      const existing = attendanceRes.data || [];
      const map = {};
      existing.forEach((a) => {
        map[a.student?._id || a.student] = a.status;
      });
      const initial = {};
      students.forEach((s) => {
        initial[s._id] = map[s._id] || 'present';
      });
      setRoster(students);
      setRecords(initial);
      setLoaded(true);
    } catch (err) {
      toast.error('Could not load attendance', err.message);
    } finally {
      setLoading(false);
    }
  }, [batch, date, toast]);

  useEffect(() => {
    if (batch) {
      setSearchParams({ batch, date }, { replace: true });
      loadSheet();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [batch, date]);

  const setStatus = (studentId, status) => setRecords((prev) => ({ ...prev, [studentId]: status }));

  const markAll = (status) => {
    const next = {};
    roster.forEach((s) => {
      next[s._id] = status;
    });
    setRecords(next);
  };

  const save = async () => {
    setSaving(true);
    try {
      const payload = {
        batch,
        date,
        records: roster.map((s) => ({ student: s._id, status: records[s._id] || 'present' })),
      };
      const res = await AttendanceApi.save(payload);
      toast.success('Attendance saved', `${res.data.total} record(s) stored.`);
    } catch (err) {
      toast.error('Could not save attendance', err.message);
    } finally {
      setSaving(false);
    }
  };

  const summary = useMemo(() => {
    const counts = { present: 0, absent: 0, late: 0, excused: 0 };
    Object.values(records).forEach((status) => {
      if (counts[status] !== undefined) counts[status] += 1;
    });
    return counts;
  }, [records]);

  return (
    <>
      <PageHeader title="Attendance" subtitle="Pick a batch and date, then mark the register." />

      <form className="toolbar" onSubmit={(e) => e.preventDefault()}>
        <select
          className="select"
          style={{ minWidth: 220 }}
          value={batch}
          onChange={(e) => setBatch(e.target.value)}
        >
          <option value="">Select a batch…</option>
          {batches.map((b) => (
            <option key={b._id} value={b._id}>
              {b.name}
            </option>
          ))}
        </select>
        <input
          className="input"
          style={{ width: 180 }}
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
        {loaded && roster.length > 0 && (
          <>
            <Button variant="ghost" onClick={() => markAll('present')}>
              Mark all present
            </Button>
            <Button onClick={save} disabled={saving}>
              {saving ? 'Saving…' : 'Save attendance'}
            </Button>
          </>
        )}
      </form>

      {batches.length === 0 && (
        <Banner tone="warn">
          No active batches are available. Create a batch and enroll students before taking attendance.
        </Banner>
      )}

      {loading ? (
        <Spinner center />
      ) : batch && loaded ? (
        roster.length === 0 ? (
          <Card pad>
            <p className="muted" style={{ margin: 0 }}>
              This batch has no enrolled students yet.
            </p>
          </Card>
        ) : (
          <>
            <div className="row" style={{ marginBottom: 14, gap: 18 }}>
              <Summary label="Present" value={summary.present} />
              <Summary label="Absent" value={summary.absent} />
              <Summary label="Late" value={summary.late} />
              <Summary label="Excused" value={summary.excused} />
            </div>
            <div className="table-wrap">
              <table className="data">
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>ID</th>
                    <th style={{ width: 340 }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {roster.map((student) => (
                    <tr key={student._id}>
                      <td>{student.fullName}</td>
                      <td className="mono">{student.studentId}</td>
                      <td>
                        <div className="row" style={{ gap: 6 }}>
                          {STATUSES.map((status) => (
                            <button
                              key={status}
                              type="button"
                              className={`btn btn--sm ${
                                records[student._id] === status ? '' : 'btn--ghost'
                              }`}
                              onClick={() => setStatus(student._id, status)}
                            >
                              {status[0].toUpperCase() + status.slice(1)}
                            </button>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="row" style={{ marginTop: 16, justifyContent: 'flex-end' }}>
              <Button onClick={save} disabled={saving}>
                <Icon name="check" size={16} /> {saving ? 'Saving…' : 'Save attendance'}
              </Button>
            </div>
          </>
        )
      ) : (
        batch && <Card pad><p className="muted" style={{ margin: 0 }}>Loading register…</p></Card>
      )}
    </>
  );
}

function Summary({ label, value }) {
  return (
    <span className="row" style={{ gap: 8 }}>
      <StatusBadge status={label.toLowerCase()} />
      <strong className="num">{value}</strong>
    </span>
  );
}
