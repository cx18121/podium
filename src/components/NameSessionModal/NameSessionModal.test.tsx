// src/components/NameSessionModal/NameSessionModal.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { NameSessionModal } from './NameSessionModal';

const AUTO_TITLE = 'March 12, 2026 — 3:41 PM';

describe('NameSessionModal — custom name path', () => {
  it('calls onConfirm with the custom name when user edits input and clicks Save', () => {
    const onConfirm = vi.fn();
    render(
      <NameSessionModal autoTitle={AUTO_TITLE} onConfirm={onConfirm} onSkip={vi.fn()} />
    );
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'My Talk' } });
    fireEvent.click(screen.getByRole('button', { name: /save/i }));
    expect(onConfirm).toHaveBeenCalledWith('My Talk');
  });
});

describe('NameSessionModal — skip path', () => {
  it('calls onConfirm with autoTitle when user clicks Skip', () => {
    const onConfirm = vi.fn();
    render(
      <NameSessionModal autoTitle={AUTO_TITLE} onConfirm={onConfirm} onSkip={vi.fn()} />
    );
    fireEvent.click(screen.getByRole('button', { name: /skip/i }));
    expect(onConfirm).toHaveBeenCalledWith(AUTO_TITLE);
  });
});

describe('NameSessionModal — input validation', () => {
  it('disables Save button when input is empty', () => {
    render(
      <NameSessionModal autoTitle={AUTO_TITLE} onConfirm={vi.fn()} onSkip={vi.fn()} />
    );
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: '' } });
    expect(screen.getByRole('button', { name: /save/i })).toBeDisabled();
  });

  it('pre-fills input with autoTitle', () => {
    render(
      <NameSessionModal autoTitle={AUTO_TITLE} onConfirm={vi.fn()} onSkip={vi.fn()} />
    );
    expect(screen.getByRole('textbox')).toHaveValue(AUTO_TITLE);
  });
});
