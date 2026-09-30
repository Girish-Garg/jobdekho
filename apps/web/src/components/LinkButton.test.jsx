import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import LinkButton from './LinkButton.jsx';

describe('LinkButton', () => {
  it('stays a real link that opens in a new tab without a referrer', () => {
    render(<LinkButton href="https://example.com/job">Open posting</LinkButton>);
    const link = screen.getByRole('link', { name: 'Open posting' });
    expect(link).toHaveAttribute('href', 'https://example.com/job');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noreferrer');
  });

  // The paint worklet never runs on a link or inside one, so the button's
  // surface, and its dithered hover, belong to the span around it.
  it('puts the button surface on a wrapper outside the link', () => {
    render(<LinkButton href="https://example.com" tone="quiet">Docs</LinkButton>);
    const wrapper = screen.getByRole('link', { name: 'Docs' }).parentElement;
    expect(wrapper.tagName).toBe('SPAN');
    expect(wrapper.className).toContain('btn btn-quiet');
    expect(screen.getByRole('link', { name: 'Docs' }).className).not.toContain('btn');
  });
});
