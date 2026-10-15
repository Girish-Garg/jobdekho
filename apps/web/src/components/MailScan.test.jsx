import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import MailScanLine from './MailScanLine.jsx';
import GmailScanPanel from './GmailScanPanel.jsx';
import { getMailScan, startMailScan, undoMailScan } from '../api.js';
import { onTrackerChanged } from '../lib/trackerSignal.js';
import { ago, resultLine, scanLine } from '../lib/mailScanWords.js';

vi.mock('../api.js', () => ({ getMailScan: vi.fn(), startMailScan: vi.fn(), undoMailScan: vi.fn() }));

const NOW = Date.parse('2026-10-15T12:00:00Z');
const NEVER = { connected: true, firstAt: null, lastAt: null, running: false, progress: null, last: null, unsure: 0, canUndo: false };
const RUNNING = { ...NEVER, running: true, progress: { step: 'reading', total: 412, read: 120 } };
const DONE = { ...NEVER, firstAt: '2026-10-15T11:56:00Z', lastAt: new Date(Date.now() - 4 * 60000).toISOString(), last: { ok: true, added: 38, updated: 6, found: 44, unsure: 12 }, canUndo: true };

beforeEach(() => {
  vi.clearAllMocks();
  getMailScan.mockResolvedValue(NEVER);
});

const mount = async (ui) => {
  await act(async () => {
    render(ui);
  });
};

describe('the mail scan in words', () => {
  it('says what it is doing, what went wrong, or when it last looked', () => {
    expect(scanLine(RUNNING)).toBe('Reading 120 of 412 mails...');
    expect(scanLine({ ...NEVER, last: { ok: false, error: 'JobDekho could not reach Gmail.' } })).toBe('JobDekho could not reach Gmail.');
    expect(scanLine({ ...DONE, lastAt: '2026-10-15T11:56:00Z' }, NOW)).toBe('Gmail checked 4 minutes ago');
    expect(ago('2026-10-15T11:59:40Z', NOW)).toBe('just now');
    expect(ago('2026-10-15T09:00:00Z', NOW)).toBe('3 hours ago');
    expect(resultLine(DONE.last)).toBe('Added 38 applications and updated 6. 12 mails it was not sure of were left out.');
    expect(resultLine({ ok: true, added: 0, updated: 0, unsure: 0 })).toBe('Nothing new in your mail.');
  });
});

describe('MailScanLine', () => {
  it('offers the first scan, then shows it running', async () => {
    startMailScan.mockResolvedValue(RUNNING);
    await mount(<MailScanLine />);
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Scan my mail' })));
    expect(startMailScan).toHaveBeenCalledWith(undefined);
    expect(screen.getByText('Reading 120 of 412 mails...')).toBeInTheDocument();
  });

  it('says when Gmail was checked and undoes the last scan, telling the Tracker', async () => {
    getMailScan.mockResolvedValue(DONE);
    undoMailScan.mockResolvedValue({ undone: true, status: { ...DONE, canUndo: false } });
    const heard = vi.fn();
    const stop = onTrackerChanged(heard);
    await mount(<MailScanLine />);
    expect(screen.getByText('Gmail checked 4 minutes ago')).toBeInTheDocument();
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Undo last scan' })));
    stop();
    expect(heard).toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: 'Undo last scan' })).not.toBeInTheDocument();
  });

  it('reads again quickly once a scan starts, and tells the Tracker when it ends', async () => {
    vi.useFakeTimers();
    try {
      startMailScan.mockResolvedValue(RUNNING);
      const heard = vi.fn();
      const stop = onTrackerChanged(heard);
      await mount(<MailScanLine />);
      await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Scan my mail' })));
      getMailScan.mockResolvedValue(DONE);
      await act(async () => vi.advanceTimersByTimeAsync(1600));
      stop();
      expect(screen.getByText(/^Gmail checked/)).toBeInTheDocument();
      expect(heard).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it('shows nothing without Gmail connected', async () => {
    getMailScan.mockResolvedValue({ connected: false });
    const { container } = render(<MailScanLine />);
    await act(async () => {});
    expect(container).toBeEmptyDOMElement();
  });
});

describe('GmailScanPanel', () => {
  it('explains the first scan, then offers a scan now, the whole mailbox again, and Undo', async () => {
    await mount(<GmailScanPanel />);
    expect(screen.getByText(/It only reads; nothing is marked read, moved or deleted/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Scan my mail' })).toBeInTheDocument();
    getMailScan.mockResolvedValue(DONE);
    startMailScan.mockResolvedValue(RUNNING);
    await mount(<GmailScanPanel />);
    expect(screen.getByText(/Added 38 applications and updated 6/)).toBeInTheDocument();
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Scan all my mail again' })));
    expect(startMailScan).toHaveBeenCalledWith({ full: true });
  });
});
