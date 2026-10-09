import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button, StatusBadge, EmptyState } from './Primitives.jsx';

describe('Button', () => {
  it('renders its label and handles clicks', async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Save</Button>);
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('can be disabled', () => {
    render(<Button disabled>Save</Button>);
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
  });
});

describe('StatusBadge', () => {
  it('maps known statuses to friendly labels', () => {
    render(<StatusBadge status="paid" />);
    expect(screen.getByText('Paid')).toBeInTheDocument();
  });

  it('falls back to the raw status', () => {
    render(<StatusBadge status="mystery" />);
    expect(screen.getByText('mystery')).toBeInTheDocument();
  });
});

describe('EmptyState', () => {
  it('shows its title and message', () => {
    render(<EmptyState title="No students" message="Add one to begin." />);
    expect(screen.getByText('No students')).toBeInTheDocument();
    expect(screen.getByText('Add one to begin.')).toBeInTheDocument();
  });
});
