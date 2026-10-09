import Icon from './Icon.jsx';

export function Button({ variant = 'primary', size, block, type = 'button', children, ...props }) {
  const classes = [
    'btn',
    variant !== 'primary' ? `btn--${variant}` : '',
    size === 'sm' ? 'btn--sm' : '',
    block ? 'btn--block' : '',
  ]
    .filter(Boolean)
    .join(' ');
  return (
    <button type={type} className={classes} {...props}>
      {children}
    </button>
  );
}

export function Badge({ tone = 'neutral', children, dot }) {
  return (
    <span className={`badge badge--${tone}`}>
      {dot && <span className="dot" />}
      {children}
    </span>
  );
}

/** Maps common status strings to a badge tone + label. */
export function StatusBadge({ status }) {
  const map = {
    active: ['success', 'Active'],
    inactive: ['neutral', 'Inactive'],
    paid: ['success', 'Paid'],
    partial: ['warn', 'Partial'],
    unpaid: ['neutral', 'Unpaid'],
    overdue: ['danger', 'Overdue'],
    cancelled: ['neutral', 'Cancelled'],
    present: ['success', 'Present'],
    absent: ['danger', 'Absent'],
    late: ['warn', 'Late'],
    excused: ['primary', 'Excused'],
  };
  const [tone, label] = map[status] || ['neutral', status];
  return (
    <Badge tone={tone} dot>
      {label}
    </Badge>
  );
}

export function Spinner({ center }) {
  return <div className={`spinner${center ? ' spinner--center' : ''}`} role="status" aria-label="Loading" />;
}

export function Card({ children, className = '', pad }) {
  return <div className={`card ${pad ? 'card--pad' : ''} ${className}`}>{children}</div>;
}

export function StatCard({ label, value, foot, tone = 'brass', small }) {
  return (
    <div className={`stat ${tone !== 'brass' ? `stat--${tone}` : ''}`}>
      <div className="stat__label">{label}</div>
      <div className={`stat__value${small ? ' sm' : ''}`}>{value}</div>
      {foot && <div className="stat__foot">{foot}</div>}
    </div>
  );
}

export function PageHeader({ title, subtitle, actions }) {
  return (
    <div className="page-header">
      <div>
        <h1>{title}</h1>
        {subtitle && <div className="page-header__sub">{subtitle}</div>}
      </div>
      {actions && <div className="page-header__actions">{actions}</div>}
    </div>
  );
}

export function EmptyState({ title, message, action, icon = 'layers' }) {
  return (
    <div className="empty">
      <div className="empty__mark">
        <Icon name={icon} size={22} />
      </div>
      <h3>{title}</h3>
      {message && <p>{message}</p>}
      {action}
    </div>
  );
}

export function Banner({ tone = 'error', children }) {
  return <div className={`banner banner--${tone}`}>{children}</div>;
}

export function SegmentedBar({ segments }) {
  // segments: [{ value, color, label }]
  const total = segments.reduce((sum, s) => sum + s.value, 0) || 1;
  return (
    <div>
      <div className="seg" role="img" aria-label="Attendance breakdown">
        {segments.map((s) => (
          <span key={s.label} style={{ width: `${(s.value / total) * 100}%`, background: s.color }} />
        ))}
      </div>
      <div className="legend">
        {segments.map((s) => (
          <span className="k" key={s.label}>
            <span className="swatch" style={{ background: s.color }} />
            {s.label}: <strong>{s.value}</strong>
          </span>
        ))}
      </div>
    </div>
  );
}
