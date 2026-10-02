import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import ContactChips from './ContactChips.jsx';

describe('ContactChips', () => {
  it('follows the named links with the other profiles, by label or by short address', () => {
    const basics = {
      email: 'demo@example.com', links: { github: 'https://github.com/demo', linkedin: '', portfolio: '' },
      moreLinks: [{ kind: 'kaggle', url: 'https://www.kaggle.com/demo', label: '' }, { kind: 'other', url: 'https://leetcode.com/u/demo/', label: 'LeetCode' }],
    };
    render(<ContactChips basics={basics} />);
    const chips = within(screen.getByRole('list', { name: 'Contact' })).getAllByRole('listitem').map((li) => li.textContent);
    expect(chips).toEqual(['demo@example.com', 'github.com/demo', 'kaggle.com/demo', 'LeetCode']);
  });

  it('shows nothing for basics with nothing filled in, more links or not', () => {
    const { container } = render(<ContactChips basics={{ links: {}, moreLinks: [] }} />);
    expect(container).toBeEmptyDOMElement();
  });
});
