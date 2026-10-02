import { describe, it, expect, vi } from 'vitest';
import { useState } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import EntrySection from './EntrySection.jsx';
import { onChatDraft } from '../lib/chatDraftSignal.js';

const META = { key: 'experience', label: 'Experience', add: 'Add role', ask: 'Add a job: ', titleLabel: 'Role', orgLabel: 'Company', hint: 'Jobs and internships.' };

const ENTRY = (id, title) => ({ id, title, organisation: '', location: '', startDate: '', endDate: '', bullets: [], tech: [], links: [], link: '', pinned: false, weight: 0 });

function KeptSection({ initial, onEntries = () => {} }) {
  const [entries, setEntries] = useState(initial);
  return <EntrySection meta={META} entries={entries} onChange={(next) => { setEntries(next); onEntries(next); }} />;
}

describe('EntrySection', () => {
  it('shows the one-line hint and a zero count when there are no entries', () => {
    render(<EntrySection meta={META} entries={[]} onChange={() => {}} />);
    expect(screen.getByText('Jobs and internships.')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Experience 0' })).toBeInTheDocument();
  });

  it('adds a blank entry and reports the count', () => {
    const onChange = vi.fn();
    render(<EntrySection meta={META} entries={[]} onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: 'Add role' }));
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange.mock.calls[0][0]).toHaveLength(1);
  });

  it('lists an existing entry instead of the hint', () => {
    render(<EntrySection meta={META} entries={[ENTRY('1', 'Engineer')]} onChange={() => {}} />);
    expect(screen.queryByText('Jobs and internships.')).not.toBeInTheDocument();
    expect(screen.getByText('Engineer')).toBeInTheDocument();
  });

  it('removes the entry a card reports removed', () => {
    const onChange = vi.fn();
    render(<EntrySection meta={META} entries={[ENTRY('1', 'Engineer')]} onChange={onChange} />);
    fireEvent.click(screen.getByText('Engineer')); // opens the card
    fireEvent.click(screen.getByRole('button', { name: 'Remove' }));
    expect(onChange).toHaveBeenCalledWith([]);
  });

  it('swaps two entries on Move down', () => {
    const onChange = vi.fn();
    const entries = [ENTRY('1', 'First'), ENTRY('2', 'Second')];
    render(<EntrySection meta={META} entries={entries} onChange={onChange} />);
    fireEvent.click(screen.getByText('First')); // opens the first card
    fireEvent.click(screen.getAllByRole('button', { name: 'Move down' })[0]);
    expect(onChange).toHaveBeenCalledWith([entries[1], entries[0]]);
  });

  it('puts a copy of an entry right under it, under a new id, and opens the copy', () => {
    const onEntries = vi.fn();
    const entries = [{ ...ENTRY('1', 'First'), bullets: ['Built X'] }, ENTRY('2', 'Second')];
    render(<KeptSection initial={entries} onEntries={onEntries} />);
    fireEvent.click(screen.getByText('First')); // opens the first card
    fireEvent.click(screen.getAllByRole('button', { name: 'Duplicate' })[0]);
    const [sent] = onEntries.mock.calls[0];
    expect(sent.map((e) => e.title)).toEqual(['First', 'First', 'Second']);
    expect(sent[1]).toEqual({ ...entries[0], id: sent[1].id });
    expect(sent[1].id).not.toBe('1');
    const roles = screen.getAllByLabelText('Role');
    expect(roles).toHaveLength(3);
    expect(roles[1]).toBeVisible();
    expect(roles[2]).not.toBeVisible();
  });

  // The quick way in: the chat opens with the start of the request in its
  // box, and nothing is added here until a card there is applied.
  it('opens the chat with this section\'s request started, adding nothing itself', () => {
    const heard = vi.fn();
    const stop = onChatDraft(heard);
    const onChange = vi.fn();
    render(<EntrySection meta={META} entries={[]} onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: 'Add with AI: Experience' }));
    stop();
    expect(heard).toHaveBeenCalledWith(expect.objectContaining({ text: 'Add a job: ' }));
    expect(onChange).not.toHaveBeenCalled();
  });
});
