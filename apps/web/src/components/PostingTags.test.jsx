import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import PostingTags from './PostingTags.jsx';

const tag = (value, evidence, from = 'title') => ({ value, from, evidence, version: 2 });
const base = { id: 'p1', level: 'entry', workMode: null, tags: [], caution: [] };

describe('PostingTags', () => {
  // The batch comes from the config entry's tag; the chip stays short.
  it('shows YC for a Y Combinator company, with its batch on hover', () => {
    render(<PostingTags posting={{ ...base, tags: ['Engineering', 'YC W21'] }} />);
    expect(screen.getByText('YC')).toHaveAttribute('title', 'Y Combinator, batch W21');
  });

  it('shows no YC chip for a tag that only mentions YC', () => {
    render(<PostingTags posting={{ ...base, tags: ['YC alumni welcome'] }} />);
    expect(screen.queryByText('YC')).not.toBeInTheDocument();
  });

  // A closed posting is only still shown in the person's own lists.
  it('marks a closed posting as closed', () => {
    render(<PostingTags posting={{ ...base, status: 'saved', closedAt: '2026-10-01T00:00:00.000Z' }} />);
    expect(screen.getByText('Saved')).toBeInTheDocument();
    expect(screen.getByText('Closed')).toBeInTheDocument();
  });

  it('says nothing about closing for an open posting', () => {
    render(<PostingTags posting={base} />);
    expect(screen.queryByText('Closed')).not.toBeInTheDocument();
  });
});

describe('PostingTags evidence', () => {
  it('says what the level and the work mode were read from, on hover and focus', () => {
    render(<PostingTags posting={{
      ...base,
      level: 'senior', levelTag: tag('senior', 'Title says Senior'),
      workMode: 'hybrid', workModeTag: tag('hybrid', 'Location says Bangalore (Hybrid)'),
    }} />);
    expect(screen.getByText('Senior')).toHaveAccessibleDescription('Title says Senior');
    expect(screen.getByText('Hybrid')).toHaveAccessibleDescription('Location says Bangalore (Hybrid)');
  });

  it('shows no level chip for a posting that does not say its level', () => {
    render(<PostingTags posting={{ ...base, level: null, levelTag: null }} />);
    for (const word of ['Mid', 'Entry', 'Senior']) expect(screen.queryByText(word)).not.toBeInTheDocument();
  });

  // An unknown mode is no mode at all, so a stated Onsite is a fact.
  it('names a stated onsite job, and nothing for an unknown mode', () => {
    const { rerender } = render(<PostingTags posting={{ ...base, workMode: 'onsite', workModeTag: tag('onsite', 'Board tag: onsite', 'board') }} />);
    expect(screen.getByText('Onsite')).toHaveAccessibleDescription('Board tag: onsite');
    rerender(<PostingTags posting={{ ...base, workMode: null }} />);
    expect(screen.queryByText('Onsite')).not.toBeInTheDocument();
  });
});

describe('PostingTags caution', () => {
  it('shows Caution only when the posting states a red flag', () => {
    const { rerender } = render(<PostingTags posting={{ ...base, legitimacy: 'low', caution: [] }} />);
    expect(screen.queryByText('Caution')).not.toBeInTheDocument();
    rerender(<PostingTags posting={{ ...base, caution: [{ code: 'fee', reason: 'Asks applicants to pay a ₹1,500 registration fee', evidence: 'Pay Rs 1500.' }] }} />);
    expect(screen.getByRole('button', { name: 'Caution' })).toHaveClass('text-ember');
  });

  // A thin text or a missing pay is never a caution.
  it('carries no warning colour on a posting with few details and no pay', () => {
    const { container } = render(<PostingTags posting={{ ...base, fewDetails: true, stipend: null }} />);
    expect(container.querySelectorAll('[class*="ember"]')).toHaveLength(0);
  });
});
