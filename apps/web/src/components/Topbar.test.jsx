import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import Topbar from './Topbar.jsx';

vi.mock('../api.js', () => ({
  logout: vi.fn(async () => {}),
}));

import { logout } from '../api.js';

beforeEach(() => vi.clearAllMocks());

describe('Topbar', () => {
  it('renders user initial and Log out button', () => {
    render(<Topbar user={{ email: 'alice@example.com' }} onLogout={() => {}} />);
    expect(screen.getByText('A')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /log out/i })).toBeInTheDocument();
  });

  it('calls logout() and onLogout when the button is clicked', async () => {
    const onLogout = vi.fn();
    render(<Topbar user={{ email: 'bob@example.com' }} onLogout={onLogout} />);
    fireEvent.click(screen.getByRole('button', { name: /log out/i }));
    await new Promise((r) => setTimeout(r, 0));
    expect(logout).toHaveBeenCalled();
    expect(onLogout).toHaveBeenCalled();
  });
});

// The keyword box is the primary action on the feed, so it sits here rather
// than taking a slot in the filter bar.
describe('Topbar search', () => {
  it('shows the current keyword and reports every edit', () => {
    const onSearch = vi.fn();
    render(<Topbar user={{}} q="react" onSearch={onSearch} onLogout={() => {}} />);

    const box = screen.getByLabelText('Keyword');
    expect(box).toHaveValue('react');
    fireEvent.change(box, { target: { value: 'rust' } });
    expect(onSearch).toHaveBeenCalledWith('rust');
  });

  it('is left out on views that have no feed to search', () => {
    render(<Topbar user={{}} view="settings" onLogout={() => {}} />);
    expect(screen.queryByLabelText('Keyword')).not.toBeInTheDocument();
  });

  // A wrapped topbar pushes the feed down on every narrow window, so the row
  // shrinks the search instead.
  it('never wraps: the search flexes and the end groups do not', () => {
    const { container } = render(<Topbar user={{}} q="" onSearch={() => {}} onLogout={() => {}} />);
    const header = container.querySelector('header');
    expect(header.className).not.toContain('flex-wrap');
    expect(screen.getByLabelText('Keyword').closest('.flex-1')).not.toBeNull();
  });
});

// The box is easy to miss until someone knows to look for it, so a small
// hint names the shortcut right on the control it triggers.
describe('Topbar search hint', () => {
  it('shows the / hint until the box is used', () => {
    render(<Topbar user={{}} q="" onSearch={() => {}} onLogout={() => {}} />);
    expect(screen.getByText('/')).toBeInTheDocument();
  });

  it('hides the hint once the box has focus', () => {
    render(<Topbar user={{}} q="" onSearch={() => {}} onLogout={() => {}} />);
    fireEvent.focus(screen.getByLabelText('Keyword'));
    expect(screen.queryByText('/')).not.toBeInTheDocument();
  });

  it('hides the hint once a keyword is typed, even after the box blurs', () => {
    render(<Topbar user={{}} q="react" onSearch={() => {}} onLogout={() => {}} />);
    expect(screen.queryByText('/')).not.toBeInTheDocument();
  });

  it('blurs the box on Escape', () => {
    render(<Topbar user={{}} q="" onSearch={() => {}} onLogout={() => {}} />);
    const box = screen.getByLabelText('Keyword');
    box.focus();
    expect(box).toHaveFocus();
    // The Escape handler calls the DOM .blur() imperatively rather than
    // through fireEvent, so React's own act wrapping does not see it.
    act(() => fireEvent.keyDown(box, { key: 'Escape' }));
    expect(box).not.toHaveFocus();
  });
});

// The left rail is gone, so the section nav moved up here.
describe('Topbar navigation', () => {
  it('marks the current section', () => {
    render(<Topbar user={{}} view="postings" setView={() => {}} onLogout={() => {}} />);
    expect(screen.getByRole('button', { name: 'Postings' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('button', { name: 'Settings' })).not.toHaveAttribute('aria-current');
  });

  it('switches sections on click', () => {
    const setView = vi.fn();
    render(<Topbar user={{}} view="postings" setView={setView} onLogout={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: 'Settings' }));
    expect(setView).toHaveBeenCalledWith('settings');
  });

  // Profile is its own section, not part of Settings: Settings is delivery,
  // the profile drives ranking.
  it('reaches the profile section and marks it current', () => {
    const setView = vi.fn();
    const { rerender } = render(<Topbar user={{}} view="postings" setView={setView} onLogout={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: 'Profile' }));
    expect(setView).toHaveBeenCalledWith('profile');

    rerender(<Topbar user={{}} view="profile" setView={setView} onLogout={() => {}} />);
    expect(screen.getByRole('button', { name: 'Profile' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('button', { name: 'Postings' })).not.toHaveAttribute('aria-current');
  });
});
