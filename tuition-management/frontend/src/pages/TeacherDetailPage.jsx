import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { TeachersApi } from '../services/api.js';
import { Button, Card, PageHeader, Spinner, StatusBadge } from '../components/ui/Primitives.jsx';
import { DataTable } from '../components/ui/Table.jsx';
import Icon from '../components/ui/Icon.jsx';
import { formatDate } from '../utils/format.js';

export default function TeacherDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [teacher, setTeacher] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await TeachersApi.get(id);
      setTeacher(res.data);
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
  if (error || !teacher) {
    return (
      <Card pad>
        <p className="muted" style={{ marginTop: 0 }}>
          {error?.message || 'Teacher not found.'}
        </p>
        <Button variant="ghost" onClick={() => navigate('/teachers')}>
          Back to teachers
        </Button>
      </Card>
    );
  }

  return (
    <>
      <PageHeader
        title={teacher.fullName}
        subtitle={`${teacher.teacherId} · ${teacher.status}`}
        actions={
          <Button variant="ghost" onClick={() => navigate('/teachers')}>
            <Icon name="chevronLeft" size={16} /> Back
          </Button>
        }
      />

      <div className="stack">
        <Card>
          <div className="card__head">
            <h2>Profile</h2>
          </div>
          <div className="card__body">
            <div className="detail-grid">
              <Item k="Phone" v={teacher.phone} />
              <Item k="Email" v={teacher.email || '—'} />
              <Item k="Subjects" v={(teacher.subjects || []).join(', ') || '—'} />
              <Item k="Qualifications" v={teacher.qualifications || '—'} />
              <Item k="Joining date" v={formatDate(teacher.joiningDate)} />
              <Item k="Notes" v={teacher.notes || '—'} />
            </div>
          </div>
        </Card>

        <Card>
          <div className="card__head">
            <h2>Assigned batches</h2>
          </div>
          <DataTable
            rows={teacher.batches || []}
            getRowKey={(row) => row._id}
            emptyTitle="No batches assigned"
            emptyMessage="Assign this teacher to a batch from the Batches page."
            columns={[
              {
                key: 'name',
                header: 'Batch',
                render: (row) => <Link to={`/batches/${row._id}`}>{row.name}</Link>,
              },
              {
                key: 'course',
                header: 'Course',
                render: (row) => row.course?.name || '—',
              },
              {
                key: 'students',
                header: 'Enrolled',
                align: 'right',
                render: (row) => <span className="num">{(row.students || []).length}</span>,
              },
              { key: 'status', header: 'Status', render: (row) => <StatusBadge status={row.status} /> },
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
