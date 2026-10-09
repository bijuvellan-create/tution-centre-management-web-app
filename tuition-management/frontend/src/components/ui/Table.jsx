import { EmptyState, Spinner } from './Primitives.jsx';
import Icon from './Icon.jsx';

/**
 * A simple data table.
 * columns: [{ key, header, render?(row), align?, width? }]
 */
export function DataTable({ columns, rows, loading, emptyTitle = 'Nothing here yet', emptyMessage, emptyAction, getRowKey }) {
  if (loading) return <Spinner center />;

  if (!rows || rows.length === 0) {
    return <EmptyState title={emptyTitle} message={emptyMessage} action={emptyAction} />;
  }

  return (
    <div className="table-wrap">
      <table className="data">
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col.key} style={{ textAlign: col.align || 'left', width: col.width }}>
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={getRowKey ? getRowKey(row) : row._id || row.id || index}>
              {columns.map((col) => (
                <td key={col.key} style={{ textAlign: col.align || 'left' }}>
                  {col.render ? col.render(row) : row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Pagination({ meta, onPage }) {
  if (!meta || meta.total === 0) return null;
  const { page, totalPages, total, limit } = meta;
  const from = (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);

  return (
    <div className="pagination">
      <span>
        Showing <strong>{from}</strong>–<strong>{to}</strong> of <strong>{total}</strong>
      </span>
      <div className="pagination__pages">
        <button
          className="btn btn--ghost btn--sm"
          onClick={() => onPage(page - 1)}
          disabled={!meta.hasPrev}
          aria-label="Previous page"
        >
          <Icon name="chevronLeft" size={16} /> Prev
        </button>
        <span className="muted">
          Page {page} of {totalPages || 1}
        </span>
        <button
          className="btn btn--ghost btn--sm"
          onClick={() => onPage(page + 1)}
          disabled={!meta.hasNext}
          aria-label="Next page"
        >
          Next <Icon name="chevronRight" size={16} />
        </button>
      </div>
    </div>
  );
}
