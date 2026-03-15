import { describe, it } from 'vitest';

describe('HistoryView', () => {
  it.todo('renders loading state while useLiveQuery resolves (sessions === undefined)');
  it.todo('renders empty state heading "No sessions yet" when sessions array is empty');
  it.todo('renders session title, date, duration, and overall score for each session');
  it.todo('renders "—" for score when session.scorecard is null');
  it.todo('clicking a session row calls onOpenSession with the session id');
  it.todo('clicking delete button opens DeleteConfirmModal for that session');
  it.todo('confirming delete calls db.sessions.delete with the session id');
});
