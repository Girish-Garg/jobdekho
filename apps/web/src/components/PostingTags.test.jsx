import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import PostingTags from './PostingTags.jsx';

const base = { id: 'p1', level: 'entry', workMode: 'onsite', tags: [] };

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
