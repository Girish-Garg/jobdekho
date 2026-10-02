import { describe, it, expect, vi } from 'vitest';
import { useState } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import EntryCard from './EntryCard.jsx';
import { makeEntry } from '../lib/newEntry.js';
import { ENTRY_SECTIONS } from '../lib/profileSections.js';

const section = (key) => ENTRY_SECTIONS.find((meta) => meta.key === key);
const EXPERIENCE = section('experience');
const BASE = { ...makeEntry(), title: 'Backend Engineer', organisation: 'Acme', startDate: 'Jan 2025', endDate: '' };
const link = (kind, url, label = '') => ({ kind, url, label });

function renderCard(overrides = {}, props = {}) {
  const handlers = { onChange: vi.fn(), onRemove: vi.fn(), onMove: vi.fn(), onDuplicate: vi.fn() };
  render(<EntryCard entry={{ ...BASE, ...overrides }} meta={EXPERIENCE} startOpen={false} isFirst={false} isLast={false} {...handlers} {...props} />);
  return handlers;
}

// The entry kept in state, as the page keeps it, so an edit that moves the
// focus or flips the switch has a render to land in.
function Kept({ initial, meta = EXPERIENCE, onEntry = () => {} }) {
  const [entry, setEntry] = useState(initial);
  const change = (next) => { setEntry(next); onEntry(next); };
  return <EntryCard entry={entry} meta={meta} startOpen isFirst isLast onChange={change} onRemove={() => {}} onMove={() => {}} onDuplicate={() => {}} />;
}

describe('EntryCard, closed', () => {
  it('is one line: the title, then the organisation and since when, with the fields hidden', () => {
    renderCard();
    expect(screen.getByText('Backend Engineer')).toBeInTheDocument();
    expect(screen.getByText('Acme · Jan 2025 to now')).toBeInTheDocument();
    // <details> keeps its content in the DOM even when closed; jest-dom's
    // visibility check is the one that understands a closed <details>.
    expect(screen.getByLabelText('Role')).not.toBeVisible();
  });

  it('says when an entry ended, and falls back to a placeholder title for a blank one', () => {
    renderCard({ title: '', endDate: 'Mar 2026' });
    expect(screen.getByText('Untitled role')).toBeInTheDocument();
    expect(screen.getByText('Acme · Jan 2025 to Mar 2026')).toBeInTheDocument();
  });

  it('shows a chip per link, by label or kind, three at most and then how many more', () => {
    renderCard({ links: [link('code', 'https://github.com/demo/x'), link('video', 'https://youtu.be/x', 'Demo video'), link('live', 'https://x.vercel.app'), link('figma', 'https://figma.com/file/x'), link('other', 'https://x.dev')] });
    for (const name of ['Code', 'Demo video', 'Live']) expect(screen.getByText(name, { selector: 'summary span' })).toBeInTheDocument();
    expect(screen.queryByText('Figma', { selector: 'summary span' })).not.toBeInTheDocument();
    expect(screen.getByText('+2')).toBeInTheDocument();
    expect(screen.getByText('and 2 more')).toBeInTheDocument();
  });

  it('reads an entry with the old single link as one link', () => {
    renderCard({ link: 'github.com/demo/cli' });
    expect(screen.getByText('Code', { selector: 'summary span' })).toBeInTheDocument();
  });

  it('marks a pinned entry on its line', () => {
    renderCard({ pinned: true });
    expect(screen.getByText('Pinned', { selector: 'summary span' })).toBeInTheDocument();
  });
});

describe('EntryCard, open', () => {
  it('starts open when told to, the title beside its organisation and the small fields in one row', () => {
    renderCard({}, { startOpen: true });
    for (const name of ['Role', 'Company', 'Location', 'Start', 'End']) expect(screen.getByLabelText(name)).toBeVisible();
    expect(screen.getByRole('switch', { name: 'Still going' })).toBeVisible();
    expect(screen.getByRole('group', { name: 'What you did' })).toBeInTheDocument();
    expect(screen.getByLabelText('Tech')).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Links' })).toBeInTheDocument();
  });

  it('edits a field and reports the whole updated entry', () => {
    const { onChange } = renderCard({}, { startOpen: true });
    fireEvent.change(screen.getByLabelText('Role'), { target: { value: 'Staff Engineer' } });
    expect(onChange).toHaveBeenCalledWith({ ...BASE, title: 'Staff Engineer' });
  });

  it('holds End at Present while still going, opens it for a date when switched off, and stores Present when on', () => {
    const onEntry = vi.fn();
    render(<Kept initial={BASE} onEntry={onEntry} />);
    const still = screen.getByRole('switch', { name: 'Still going' });
    expect(still).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByLabelText('End')).toHaveValue('Present');
    expect(screen.getByLabelText('End')).toHaveAttribute('readonly');

    fireEvent.click(still);
    expect(still).toHaveAttribute('aria-checked', 'false');
    expect(screen.getByLabelText('End')).toHaveValue('');
    expect(screen.getByLabelText('End')).not.toHaveAttribute('readonly');
    expect(screen.getByLabelText('End')).toHaveFocus();
    fireEvent.change(screen.getByLabelText('End'), { target: { value: 'Mar 2026' } });
    expect(onEntry).toHaveBeenLastCalledWith(expect.objectContaining({ endDate: 'Mar 2026' }));

    fireEvent.click(still);
    expect(onEntry).toHaveBeenLastCalledWith(expect.objectContaining({ endDate: 'Present' }));
    expect(screen.getByLabelText('End')).toHaveValue('Present');
  });

  it('gives each section its own small fields, and still shows one that holds something', () => {
    const { unmount } = render(<Kept initial={BASE} meta={section('certifications')} />);
    expect(screen.getByLabelText('Issued')).toBeInTheDocument();
    expect(screen.getByLabelText('Expires')).toHaveAttribute('placeholder', 'No expiry');
    expect(screen.queryByRole('switch')).not.toBeInTheDocument();
    unmount();
    render(<Kept initial={{ ...BASE, endDate: '2024' }} meta={section('achievements')} />);
    for (const name of ['Location', 'Date', 'End']) expect(screen.getByLabelText(name)).toBeInTheDocument();
    expect(screen.queryByRole('switch')).not.toBeInTheDocument();
  });

  it('leaves Tech out of a section without it, unless the entry already has some', () => {
    const { unmount } = render(<Kept initial={BASE} meta={section('education')} />);
    expect(screen.queryByLabelText('Tech')).not.toBeInTheDocument();
    unmount();
    render(<Kept initial={{ ...BASE, tech: ['Python'] }} meta={section('education')} />);
    expect(screen.getByLabelText('Tech')).toBeInTheDocument();
  });

  it('edits an old single link as a row, and writes the list with the old field beside it', () => {
    const onEntry = vi.fn();
    render(<Kept initial={{ ...BASE, link: 'github.com/demo/cli' }} onEntry={onEntry} />);
    expect(screen.getByLabelText('Link 1 address')).toHaveValue('github.com/demo/cli');
    expect(screen.getByLabelText('Link 1 kind')).toHaveValue('code');
    fireEvent.click(screen.getByRole('button', { name: 'Add Video link' }));
    expect(screen.getByLabelText('Link 2 address')).toHaveFocus();
    fireEvent.change(screen.getByLabelText('Link 2 address'), { target: { value: 'https://youtu.be/abc' } });
    expect(onEntry).toHaveBeenLastCalledWith(expect.objectContaining({
      links: [link('code', 'github.com/demo/cli'), link('video', 'https://youtu.be/abc')],
      link: 'github.com/demo/cli',
    }));
  });
});

describe('EntryCard footer', () => {
  it('pins, moves, duplicates and removes the entry', () => {
    const { onChange, onRemove, onMove, onDuplicate } = renderCard({}, { startOpen: true });
    fireEvent.click(screen.getByRole('button', { name: 'Pin' }));
    expect(onChange).toHaveBeenCalledWith({ ...BASE, pinned: true });
    fireEvent.click(screen.getByRole('button', { name: 'Move down' }));
    expect(onMove).toHaveBeenCalledWith(1);
    fireEvent.click(screen.getByRole('button', { name: 'Duplicate' }));
    expect(onDuplicate).toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Remove' }));
    expect(onRemove).toHaveBeenCalled();
  });

  it('disables Move up on the first entry and Move down on the last', () => {
    renderCard({}, { startOpen: true, isFirst: true, isLast: true });
    expect(screen.getByRole('button', { name: 'Move up' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Move down' })).toBeDisabled();
  });
});

// A project with no organisation used to show its field label, "Org
// (optional)", as though that were the organisation.
describe('EntryCard with no organisation', () => {
  it('leaves the second line out rather than showing the field label', () => {
    render(<EntryCard entry={{ ...BASE, organisation: '', startDate: '' }} meta={section('projects')} onChange={() => {}} onRemove={() => {}} onMove={() => {}} onDuplicate={() => {}} />);
    expect(screen.queryByText('Org (optional)', { selector: 'summary span' })).not.toBeInTheDocument();
    expect(screen.getByText('Backend Engineer').nextSibling).toBeNull();
  });
});
