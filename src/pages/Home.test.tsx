import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import Home from './Home';

describe('Home', () => {
  it('renders null when hasExistingSessions is true', () => {
    const { container } = render(<Home hasExistingSessions={true} onStart={vi.fn()} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders the h1 heading when hasExistingSessions is false', () => {
    render(<Home hasExistingSessions={false} onStart={vi.fn()} />);
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
  });

  it('h1 uses text-xl and font-semibold (not text-4xl or font-bold)', () => {
    render(<Home hasExistingSessions={false} onStart={vi.fn()} />);
    const h1 = screen.getByRole('heading', { level: 1 });
    expect(h1.className).toContain('text-xl');
    expect(h1.className).toContain('font-semibold');
    expect(h1.className).not.toContain('text-4xl');
    expect(h1.className).not.toContain('font-bold');
  });

  it('footnote uses text-gray-500 (not text-gray-600)', () => {
    render(<Home hasExistingSessions={false} onStart={vi.fn()} />);
    const footnote = screen.getByText('Runs entirely in your browser. Nothing is uploaded.');
    expect(footnote.className).toContain('text-gray-500');
    expect(footnote.className).not.toContain('text-gray-600');
  });

  it('outer container has max-w-3xl class', () => {
    render(<Home hasExistingSessions={false} onStart={vi.fn()} />);
    // The outermost div is the page container
    const container = screen.getByRole('heading', { level: 1 }).closest('div[class*="max-w-3xl"]');
    expect(container).not.toBeNull();
  });

  it('renders "Start Recording" button', () => {
    render(<Home hasExistingSessions={false} onStart={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Start Recording' })).toBeInTheDocument();
  });

  it('calls onStart when button is clicked', () => {
    const onStart = vi.fn();
    render(<Home hasExistingSessions={false} onStart={onStart} />);
    screen.getByRole('button', { name: 'Start Recording' }).click();
    expect(onStart).toHaveBeenCalledTimes(1);
  });
});
