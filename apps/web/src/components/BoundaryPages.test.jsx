import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';

// Pages that cannot be drawn. Each is swapped for one that throws, the way a
// page broke on data it did not expect, and the app has to keep a way out.
vi.mock('./Shell.jsx', () => ({ default: () => { throw new TypeError('the shell broke'); } }));
vi.mock('./ProfileView.jsx', () => ({ default: () => { throw new TypeError('the profile broke'); } }));
vi.mock('./SettingsView.jsx', () => ({ default: () => <p>Settings page</p> }));

import App from '../App.jsx';
import ShellMain from './ShellMain.jsx';

let quiet;
beforeEach(() => { quiet = vi.spyOn(console, 'error').mockImplementation(() => {}); });
afterEach(() => { quiet.mockRestore(); });

describe('a screen that cannot be drawn', () => {
  it('leaves the whole app a way out instead of a blank page', () => {
    render(<App />);
    expect(screen.getByRole('alert', { name: 'JobDekho could not show this screen' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reload JobDekho' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Copy error details' })).toBeInTheDocument();
    expect(screen.getByText('TypeError: the shell broke')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'GitHub' })).toHaveAttribute('href', 'https://github.com/Girish-Garg/jobdekho/issues/new');
  });

  // The top bar and the chat sit outside the page, so the person can still
  // go to another page, which draws afresh.
  it('keeps a broken page to itself, and the next page draws as ever', () => {
    const { rerender } = render(<ShellMain view="profile" setView={() => {}} feed={{}} />);
    expect(screen.getByRole('alert', { name: 'This page could not be shown' })).toBeInTheDocument();
    rerender(<ShellMain view="settings" setView={() => {}} feed={{}} />);
    expect(screen.getByText('Settings page')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
