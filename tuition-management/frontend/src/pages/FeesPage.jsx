import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FeesApi, PaymentsApi, StudentsApi } from '../services/api.js';
import { useList } from '../hooks/useList.js';
import { Button, PageHeader, StatusBadge } from '../components/ui/Primitives.jsx';
import { DataTable, Pagination } from '../components/ui/Table.jsx';
import { Input, Select, Textarea } from '../components/ui/Form.jsx';
import { Modal, ConfirmDialog } from '../components/ui/Modal.jsx';
import { useToast } from '../components/ui/Toast.jsx';
import Icon from '../components/ui/Icon.jsx';
import { fieldErrors } from '../utils/errors.js';
import { formatDate, formatINR, paiseToRupees, rupeesToPaise, todayInputValue } from '../utils/format.js';

const METHODS = [
  { value: 'cash', label: 'Cash' },
  { value: 'upi', label: 'UPI' },
  { value: 'bank_transfer', label: 'Bank transfer' },
  { value: 'card', label: 'Card' },
  { value: 'cheque', label: 'Cheque' },
  { value: 'other', label: 'Other' },
];

export default function FeesPage() {
  const toast = useToast();
  const list = useList(FeesApi.list, {
    page: 1,
    limit: 10,
    status: '',
    overdue: '',
    from: '',
    to: '',
  });
  const [students, setStudents] = useState([]);

  const [feeOpen, setFeeOpen] = useState(false);
  const [feeForm, setFeeForm] = useState(emptyFee());
  const [feeErrors, setFeeErrors] = useState({});
  const [feeBusy, setFeeBusy] = useState(false);

  const [payTarget, setPayTarget] = useState(null);
  const [payForm, setPayForm] = useState(emptyPayment());
  const [payErrors, setPayErrors] = useState({});
  const [payBusy, setPayBusy] = useState(false);

  const [toCancel, setToCancel] = useState(null);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    StudentsApi.list({ limit: 100, status: 'active' })
      .then((res) => setStudents(res.data || []))
      .catch(() => {});
  }, []);

  const openFee = () => {
    setFeeForm(emptyFee());
    setFeeErrors({});
    setFeeOpen(true);
  };

  const onStudentChange = (id) => {
    const student = students.find((s) => s._id === id);
    setFeeForm((prev) => ({
      ...prev,
      student: id,
      batch: student?.batch?._id || prev.batch,
      courses: student ? (student.courses || []).map((c) => c._id) : [],
      amount:
        prev.amount === '' && student?.monthlyFeePaise
          ? String(paiseToRupees(student.monthlyFeePaise))
          : prev.amount,
    }));
  };

  const submitFee = async (event) => {
    event.preventDefault();
    setFeeErrors({});
    setFeeBusy(true);
    const payload = {
      student: feeForm.student,
      course: feeForm.courses[0] || undefined,
      batch: feeForm.batch || undefined,
      title: feeForm.title.trim(),
      periodLabel: feeForm.periodLabel.trim() || undefined,
      amountPaise: rupeesToPaise(feeForm.amount),
      dueDate: feeForm.dueDate || undefined,
      notes: feeForm.notes.trim() || undefined,
    };
    try {
      await FeesApi.create(payload);
      toast.success('Fee raised');
      setFeeOpen(false);
      list.reload();
    } catch (err) {
      setFeeErrors(fieldErrors(err));
      toast.error('Could not raise fee', err.message);
    } finally {
      setFeeBusy(false);
    }
  };

  const openPayment = (fee) => {
    setPayTarget(fee);
    setPayForm({
      amount: String(paiseToRupees(fee.balancePaise)),
      paymentDate: todayInputValue(),
      method: 'cash',
      reference: '',
      notes: '',
    });
    setPayErrors({});
  };

  const submitPayment = async (event) => {
    event.preventDefault();
    setPayErrors({});
    setPayBusy(true);
    try {
      const res = await PaymentsApi.create({
        student: payTarget.student?._id || payTarget.student,
        fee: payTarget._id,
        amountPaise: rupeesToPaise(payForm.amount),
        paymentDate: payForm.paymentDate || undefined,
        method: payForm.method,
        reference: payForm.reference.trim() || undefined,
        notes: payForm.notes.trim() || undefined,
      });
      toast.success('Payment recorded', `Receipt ${res.data.receiptNumber}`);
      setPayTarget(null);
      list.reload();
    } catch (err) {
      setPayErrors(fieldErrors(err));
      toast.error('Could not record payment', err.message);
    } finally {
      setPayBusy(false);
    }
  };

  const confirmCancel = async () => {
    setCancelling(true);
    try {
      await FeesApi.cancel(toCancel._id);
      toast.success('Fee cancelled');
      setToCancel(null);
      list.reload();
    } catch (err) {
      toast.error('Could not cancel fee', err.message);
    } finally {
      setCancelling(false);
    }
  };

  const columns = [
    {
      key: 'student',
      header: 'Student',
      render: (row) =>
        row.student ? (
          <Link to={`/students/${row.student._id}`}>{row.student.fullName}</Link>
        ) : (
          '—'
        ),
    },
    {
      key: 'title',
      header: 'Fee',
      render: (row) => (
        <div>
          <div>{row.title}</div>
          {row.periodLabel && (
            <div className="muted" style={{ fontSize: 12.5 }}>
              {row.periodLabel}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'amount',
      header: 'Amount',
      align: 'right',
      render: (row) => <span className="num">{formatINR(row.amountPaise)}</span>,
    },
    {
      key: 'paid',
      header: 'Paid',
      align: 'right',
      render: (row) => <span className="num">{formatINR(row.paidPaise)}</span>,
    },
    {
      key: 'balance',
      header: 'Balance',
      align: 'right',
      render: (row) => <span className="num">{formatINR(row.balancePaise)}</span>,
    },
    { key: 'due', header: 'Due', render: (row) => formatDate(row.dueDate) },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <StatusBadge status={row.overdue ? 'overdue' : row.status} />,
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (row) => (
        <div className="cell-actions">
          {!row.isCancelled && row.balancePaise > 0 && (
            <Button variant="subtle" size="sm" onClick={() => openPayment(row)}>
              Collect
            </Button>
          )}
          {!row.isCancelled && row.paidPaise === 0 && (
            <button className="icon-btn" onClick={() => setToCancel(row)} aria-label="Cancel fee">
              <Icon name="close" size={16} />
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Fees"
        subtitle="Raise invoices and record collections."
        actions={
          <Button onClick={openFee}>
            <Icon name="plus" size={16} /> Raise fee
          </Button>
        }
      />

      <form className="toolbar" onSubmit={(e) => e.preventDefault()}>
        <select
          className="select"
          style={{ width: 170 }}
          value={list.params.status}
          onChange={(e) => list.updateParams({ status: e.target.value, page: 1 })}
        >
          <option value="">All fees</option>
          <option value="unpaid">Unpaid</option>
          <option value="partial">Partial</option>
          <option value="paid">Paid</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <label className="checkbox-row">
          <input
            type="checkbox"
            checked={list.params.overdue === 'true'}
            onChange={(e) => list.updateParams({ overdue: e.target.checked ? 'true' : '', page: 1 })}
          />
          Overdue only
        </label>
        <input
          className="input"
          style={{ width: 160 }}
          type="date"
          value={list.params.from}
          onChange={(e) => list.updateParams({ from: e.target.value, page: 1 })}
          aria-label="Due from"
        />
        <input
          className="input"
          style={{ width: 160 }}
          type="date"
          value={list.params.to}
          onChange={(e) => list.updateParams({ to: e.target.value, page: 1 })}
          aria-label="Due to"
        />
      </form>

      <DataTable
        columns={columns}
        rows={list.data}
        loading={list.loading}
        getRowKey={(row) => row._id}
        emptyTitle="No fees found"
        emptyMessage="Raise a fee to start tracking payments."
        emptyAction={<Button onClick={openFee}>Raise fee</Button>}
      />
      <Pagination meta={list.meta} onPage={(page) => list.updateParams({ page })} />

      <Modal
        open={feeOpen}
        title="Raise a fee"
        onClose={() => setFeeOpen(false)}
        footer={
          <>
            <Button variant="ghost" onClick={() => setFeeOpen(false)} disabled={feeBusy}>
              Cancel
            </Button>
            <Button onClick={submitFee} disabled={feeBusy}>
              {feeBusy ? 'Saving…' : 'Raise fee'}
            </Button>
          </>
        }
      >
        <form onSubmit={submitFee} className="form-grid" noValidate>
          <Select
            label="Student"
            fieldClassName="span-2"
            value={feeForm.student}
            onChange={(e) => onStudentChange(e.target.value)}
            error={feeErrors.student}
            required
          >
            <option value="">Select a student…</option>
            {students.map((s) => (
              <option key={s._id} value={s._id}>
                {s.fullName} ({s.studentId})
              </option>
            ))}
          </Select>
          <Input
            label="Title"
            fieldClassName="span-2"
            value={feeForm.title}
            onChange={(e) => setFeeForm((p) => ({ ...p, title: e.target.value }))}
            placeholder="e.g. Monthly tuition fee"
            error={feeErrors.title}
            required
          />
          <Input
            label="Amount (₹)"
            type="number"
            min="0.01"
            step="0.01"
            value={feeForm.amount}
            onChange={(e) => setFeeForm((p) => ({ ...p, amount: e.target.value }))}
            error={feeErrors.amountPaise}
            required
          />
          <Input
            label="Period (month)"
            type="month"
            value={feeForm.periodLabel}
            onChange={(e) => setFeeForm((p) => ({ ...p, periodLabel: e.target.value }))}
            hint="Optional, e.g. 2026-03"
            error={feeErrors.periodLabel}
          />
          <Input
            label="Due date"
            type="date"
            value={feeForm.dueDate}
            onChange={(e) => setFeeForm((p) => ({ ...p, dueDate: e.target.value }))}
            error={feeErrors.dueDate}
          />
          <Textarea
            label="Notes"
            fieldClassName="span-2"
            value={feeForm.notes}
            onChange={(e) => setFeeForm((p) => ({ ...p, notes: e.target.value }))}
          />
        </form>
      </Modal>

      <Modal
        open={Boolean(payTarget)}
        title="Record a payment"
        onClose={() => setPayTarget(null)}
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setPayTarget(null)} disabled={payBusy}>
              Cancel
            </Button>
            <Button onClick={submitPayment} disabled={payBusy}>
              {payBusy ? 'Recording…' : 'Record payment'}
            </Button>
          </>
        }
      >
        {payTarget && (
          <form onSubmit={submitPayment} className="stack" noValidate>
            <div className="row row--between">
              <span className="muted">Outstanding balance</span>
              <strong className="num">{formatINR(payTarget.balancePaise)}</strong>
            </div>
            <Input
              label="Amount (₹)"
              type="number"
              min="0.01"
              step="0.01"
              value={payForm.amount}
              onChange={(e) => setPayForm((p) => ({ ...p, amount: e.target.value }))}
              error={payErrors.amountPaise}
              required
            />
            <Input
              label="Payment date"
              type="date"
              value={payForm.paymentDate}
              onChange={(e) => setPayForm((p) => ({ ...p, paymentDate: e.target.value }))}
            />
            <Select
              label="Method"
              value={payForm.method}
              onChange={(e) => setPayForm((p) => ({ ...p, method: e.target.value }))}
            >
              {METHODS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </Select>
            <Input
              label="Reference"
              value={payForm.reference}
              onChange={(e) => setPayForm((p) => ({ ...p, reference: e.target.value }))}
              hint="Optional — UPI/cheque/transaction number."
            />
            <Textarea
              label="Notes"
              value={payForm.notes}
              onChange={(e) => setPayForm((p) => ({ ...p, notes: e.target.value }))}
            />
          </form>
        )}
      </Modal>

      <ConfirmDialog
        open={Boolean(toCancel)}
        title="Cancel this fee?"
        message={toCancel ? `"${toCancel.title}" will be marked cancelled. This cannot be undone.` : ''}
        confirmLabel="Cancel fee"
        busy={cancelling}
        onConfirm={confirmCancel}
        onCancel={() => setToCancel(null)}
      />
    </>
  );
}

function emptyFee() {
  return { student: '', title: '', amount: '', periodLabel: '', dueDate: '', notes: '', batch: '', courses: [] };
}
function emptyPayment() {
  return { amount: '', paymentDate: todayInputValue(), method: 'cash', reference: '', notes: '' };
}
