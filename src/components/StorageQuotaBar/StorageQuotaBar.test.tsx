import { render, screen, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { StorageQuotaBar } from './StorageQuotaBar';

function mockStorageEstimate(used: number, quota: number) {
  Object.defineProperty(navigator, 'storage', {
    value: {
      estimate: vi.fn().mockResolvedValue({ usage: used, quota }),
    },
    configurable: true,
    writable: true,
  });
}

describe('StorageQuotaBar', () => {
  it('renders null when navigator.storage is unavailable', () => {
    Object.defineProperty(navigator, 'storage', {
      value: undefined,
      configurable: true,
      writable: true,
    });
    const { container } = render(<StorageQuotaBar />);
    expect(container.firstChild).toBeNull();
  });

  it('renders the storage bar when estimate is available', async () => {
    mockStorageEstimate(500 * 1024 * 1024, 1000 * 1024 * 1024);
    await act(async () => {
      render(<StorageQuotaBar />);
    });
    expect(screen.getByText(/MB of/)).toBeInTheDocument();
  });

  it('shows critical copy "Storage almost full. Delete older sessions to keep recording." when pct > 95', async () => {
    mockStorageEstimate(960 * 1024 * 1024, 1000 * 1024 * 1024);
    await act(async () => {
      render(<StorageQuotaBar />);
    });
    expect(screen.getByText('Storage almost full. Delete older sessions to keep recording.')).toBeInTheDocument();
  });

  it('does not show warning copy when pct is 80–95 (warning message removed per spec)', async () => {
    mockStorageEstimate(850 * 1024 * 1024, 1000 * 1024 * 1024);
    await act(async () => {
      render(<StorageQuotaBar />);
    });
    expect(screen.queryByText('Storage getting full. Consider deleting older sessions.')).not.toBeInTheDocument();
  });

  it('critical fill bar uses bg-red-500 (not bg-red-600) when pct > 95', async () => {
    mockStorageEstimate(960 * 1024 * 1024, 1000 * 1024 * 1024);
    await act(async () => {
      render(<StorageQuotaBar />);
    });
    // Find the fill div (has h-1.5 class and a width style)
    const fillDivs = document.querySelectorAll('.h-1\\.5.rounded-full');
    const fillBar = Array.from(fillDivs).find(el => el.classList.contains('bg-red-500') || el.classList.contains('bg-red-600'));
    expect(fillBar?.className).toContain('bg-red-500');
    expect(fillBar?.className).not.toContain('bg-red-600');
  });
});
