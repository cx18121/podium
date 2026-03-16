import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { SessionListItem } from './SessionListItem';
import type { Session } from '../../db/db';

function makeSession(overrides: Partial<Session> = {}): Session {
  return {
    id: 1,
    title: 'Test Session',
    createdAt: new Date('2026-01-01'),
    durationMs: 90000,
    videoBlob: new Blob(),
    eventLog: [],
    scorecard: null,
    ...overrides,
  };
}

describe('SessionListItem', () => {
  it('renders the session title', () => {
    render(<SessionListItem session={makeSession()} onOpen={vi.fn()} onDelete={vi.fn()} />);
    expect(screen.getByText('Test Session')).toBeInTheDocument();
  });

  it('delete button is always visible (no opacity-0 class)', () => {
    render(<SessionListItem session={makeSession()} onOpen={vi.fn()} onDelete={vi.fn()} />);
    const deleteBtn = screen.getByRole('button', { name: 'Delete session' });
    expect(deleteBtn.className).not.toContain('opacity-0');
  });

  it('delete button has aria-label="Delete session"', () => {
    render(<SessionListItem session={makeSession()} onOpen={vi.fn()} onDelete={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Delete session' })).toBeInTheDocument();
  });

  it('score badge uses inline style with slate color at 15% opacity when scorecard is null', () => {
    render(<SessionListItem session={makeSession({ scorecard: null })} onOpen={vi.fn()} onDelete={vi.fn()} />);
    const badge = screen.getByText('—');
    expect(badge.style.backgroundColor).toBe('rgba(148, 163, 184, 0.15)');
    expect(badge.style.color).toBe('rgb(148, 163, 184)');
  });

  it('score badge uses emerald inline style at 15% opacity when overall score >= 70', () => {
    const session = makeSession({ scorecard: { overall: 75, dimensions: {} } });
    render(<SessionListItem session={session} onOpen={vi.fn()} onDelete={vi.fn()} />);
    const badge = screen.getByText('75');
    expect(badge.style.backgroundColor).toBe('rgba(16, 185, 129, 0.15)');
    expect(badge.style.color).toBe('rgb(16, 185, 129)');
  });

  it('score badge uses amber inline style at 15% opacity when overall score is 40–69', () => {
    const session = makeSession({ scorecard: { overall: 55, dimensions: {} } });
    render(<SessionListItem session={session} onOpen={vi.fn()} onDelete={vi.fn()} />);
    const badge = screen.getByText('55');
    expect(badge.style.backgroundColor).toBe('rgba(251, 191, 36, 0.15)');
    expect(badge.style.color).toBe('rgb(251, 191, 36)');
  });

  it('score badge uses red inline style at 15% opacity when overall score < 40', () => {
    const session = makeSession({ scorecard: { overall: 25, dimensions: {} } });
    render(<SessionListItem session={session} onOpen={vi.fn()} onDelete={vi.fn()} />);
    const badge = screen.getByText('25');
    expect(badge.style.backgroundColor).toBe('rgba(239, 68, 68, 0.15)');
    expect(badge.style.color).toBe('rgb(239, 68, 68)');
  });

  it('calls onDelete when delete button is clicked', () => {
    const onDelete = vi.fn();
    render(<SessionListItem session={makeSession()} onOpen={vi.fn()} onDelete={onDelete} />);
    const deleteBtn = screen.getByRole('button', { name: 'Delete session' });
    deleteBtn.click();
    expect(onDelete).toHaveBeenCalledTimes(1);
  });
});
