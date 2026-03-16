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

  it('critical fill bar uses destructive red color when pct > 95', async () => {
    mockStorageEstimate(960 * 1024 * 1024, 1000 * 1024 * 1024);
    await act(async () => {
      render(<StorageQuotaBar />);
    });
    // Fill bar uses inline style background — find div with red inline background
    const allDivs = document.querySelectorAll('div[style]');
    const fillBar = Array.from(allDivs).find(el =>
      (el as HTMLElement).style.background.includes('244') || // #f43f5e has 244
      (el as HTMLElement).style.background === '#f43f5e'
    );
    expect(fillBar).toBeTruthy();
  });
});
