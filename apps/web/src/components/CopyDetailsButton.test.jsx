import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import CopyDetailsButton from './CopyDetailsButton.jsx';

const clipboard = (writeText) => Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });

afterEach(() => {
  delete navigator.clipboard;
  delete document.execCommand;
});

describe('CopyDetailsButton', () => {
  it('copies the report and says so', async () => {
    const writeText = vi.fn(async () => {});
    clipboard(writeText);
    render(<CopyDetailsButton text="the report" />);
    fireEvent.click(screen.getByRole('button', { name: 'Copy details' }));
    expect(await screen.findByRole('button', { name: 'Copied' })).toBeInTheDocument();
    expect(writeText).toHaveBeenCalledWith('the report');
  });

  // An embedded browser can refuse the clipboard API outright.
  it('copies the older way when the clipboard API refuses', async () => {
    clipboard(vi.fn(async () => { throw new Error('denied'); }));
    document.execCommand = vi.fn(() => true);
    render(<CopyDetailsButton text="the report" />);
    fireEvent.click(screen.getByRole('button', { name: 'Copy details' }));
    expect(await screen.findByRole('button', { name: 'Copied' })).toBeInTheDocument();
    expect(document.execCommand).toHaveBeenCalledWith('copy');
    expect(document.querySelector('textarea')).toBeNull();
  });

  it('says it could not copy rather than claiming it did', async () => {
    clipboard(vi.fn(async () => { throw new Error('denied'); }));
    document.execCommand = vi.fn(() => false);
    render(<CopyDetailsButton text="the report" />);
    fireEvent.click(screen.getByRole('button', { name: 'Copy details' }));
    expect(await screen.findByRole('button', { name: 'Could not copy' })).toBeInTheDocument();
  });
});
