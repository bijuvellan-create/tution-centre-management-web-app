import { useState } from 'react';
import { Link } from 'react-router-dom';
import { PaymentsApi } from '../services/api.js';
import { useList } from '../hooks/useList.js';
import { Button, PageHeader } from '../components/ui/Primitives.jsx';
import { DataTable, Pagination } from '../components/ui/Table.jsx';
import { Modal } from '../components/ui/Modal.jsx';
import { useToast } from '../components/ui/Toast.jsx';
import Icon from '../components/ui/Icon.jsx';
import { formatDate, formatINR, titleCase } from '../utils/format.js';

const METHODS = ['cash', 'upi', 'bank_transfer', 'card', 'cheque', 'other'];

export default function PaymentsPage() {
  const toast = useToast();
  const list = useList(PaymentsApi.list, { page: 1, limit: 25, method: '', from: '', to: '' });
  const [receipt, setReceipt] = useState(null);
  const [loadingReceipt, setLoadingReceipt] = useState(false);

  const openReceipt = async (payment) => {
    setLoadingReceipt(true);
    try {
      const res = await PaymentsApi.receipt(payment._id);
      setReceipt(res.data);
    } catch (err) {
      toast.error('Could not load receipt', err.message);
    } finally {
      setLoadingReceipt(false);
    }
  };

  const columns = [
    {
      key: 'receiptNumber',
      header: 'Receipt',
      render: (row) => <span className="mono">{row.receiptNumber}</span>,
    },
    { key: 'date', header: 'Date', render: (row) => formatDate(row.paymentDate) },
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
    { key: 'fee', header: 'Fee', render: (row) => row.fee?.title || '—' },
    {
      key: 'amount',
      header: 'Amount',
      align: 'right',
      render: (row) => <span className="num">{formatINR(row.amountPaise)}</span>,
    },
    { key: 'method', header: 'Method', render: (row) => titleCase(row.method) },
    {
      key: 'recordedBy',
      header: 'Recorded by',
      render: (row) => row.recordedBy?.name || '—',
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (row) => (
        <Button variant="ghost" size="sm" onClick={() => openReceipt(row)}>
          <Icon name="receipt" size={15} /> Receipt
        </Button>
      ),
    },
  ];

  return (
    <>
      <PageHeader title="Payments" subtitle="Every collection, with a printable receipt." />

      <form className="toolbar" onSubmit={(e) => e.preventDefault()}>
        <select
          className="select"
          style={{ width: 170 }}
          value={list.params.method}
          onChange={(e) => list.updateParams({ method: e.target.value, page: 1 })}
        >
          <option value="">All methods</option>
          {METHODS.map((m) => (
            <option key={m} value={m}>
              {titleCase(m)}
            </option>
          ))}
        </select>
        <input
          className="input"
          style={{ width: 160 }}
          type="date"
          value={list.params.from}
          onChange={(e) => list.updateParams({ from: e.target.value, page: 1 })}
          aria-label="From date"
        />
        <input
          className="input"
          style={{ width: 160 }}
          type="date"
          value={list.params.to}
          onChange={(e) => list.updateParams({ to: e.target.value, page: 1 })}
          aria-label="To date"
        />
      </form>

      <DataTable
        columns={columns}
        rows={list.data}
        loading={list.loading || loadingReceipt}
        getRowKey={(row) => row._id}
        emptyTitle="No payments yet"
        emptyMessage="Record a payment from the Fees page and it will appear here."
      />
      <Pagination meta={list.meta} onPage={(page) => list.updateParams({ page })} />

      <Modal
        open={Boolean(receipt)}
        title="Payment receipt"
        onClose={() => setReceipt(null)}
        footer={
          <>
            <Button variant="ghost" onClick={() => setReceipt(null)}>
              Close
            </Button>
            <Button onClick={() => window.print()}>
              <Icon name="print" size={16} /> Print
            </Button>
          </>
        }
      >
        {receipt && (
          <div className="receipt">
            <div className="receipt__head">
              <div>
                <div className="receipt__brand">{receipt.organisation}</div>
                <div className="muted" style={{ fontSize: 13 }}>
                  Payment acknowledgement
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div className="muted" style={{ fontSize: 12 }}>
                  Receipt no.
                </div>
                <div className="mono">{receipt.receiptNumber}</div>
                <div className="muted" style={{ fontSize: 12, marginTop: 6 }}>
                  Date
                </div>
                <div>{formatDate(receipt.paymentDate)}</div>
              </div>
            </div>

            <table>
              <tbody>
                <tr>
                  <th style={{ width: 160 }}>Student</th>
                  <td>
                    {receipt.student?.fullName} <span className="muted">({receipt.student?.studentId})</span>
                  </td>
                </tr>
                <tr>
                  <th>Guardian</th>
                  <td>
                    {receipt.student?.guardianName} · {receipt.student?.guardianPhone}
                  </td>
                </tr>
                <tr>
                  <th>Towards</th>
                  <td>
                    {receipt.fee?.title}
                    {receipt.fee?.periodLabel ? ` (${receipt.fee.periodLabel})` : ''}
                  </td>
                </tr>
                <tr>
                  <th>Method</th>
                  <td>{titleCase(receipt.method)}</td>
                </tr>
                {receipt.reference && (
                  <tr>
                    <th>Reference</th>
                    <td className="mono">{receipt.reference}</td>
                  </tr>
                )}
                {receipt.notes && (
                  <tr>
                    <th>Notes</th>
                    <td>{receipt.notes}</td>
                  </tr>
                )}
                <tr>
                  <th className="total">Amount received</th>
                  <td className="total num" style={{ textAlign: 'right' }}>
                    {formatINR(receipt.amountPaise)}
                  </td>
                </tr>
              </tbody>
            </table>

            <div className="row row--between" style={{ marginTop: 28 }}>
              <span className="muted" style={{ fontSize: 12.5 }}>
                {receipt.disclaimer}
              </span>
              <div style={{ textAlign: 'center' }}>
                <div style={{ borderTop: '1px solid var(--ink)', width: 160, marginTop: 26 }} />
                <span className="muted" style={{ fontSize: 12 }}>
                  Received by {receipt.recordedBy || '—'}
                </span>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
