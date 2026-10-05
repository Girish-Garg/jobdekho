import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import AboutCard from './AboutCard.jsx';

// The one ask JobDekho makes of a person who likes it, in its own tab so
// Settings stays open.
describe('AboutCard', () => {
  it('links to the GitHub repo in a new tab, asking for a star', () => {
    render(<AboutCard />);
    const star = screen.getByRole('link', { name: 'Star on GitHub' });
    expect(star).toHaveAttribute('href', 'https://github.com/Girish-Garg/jobdekho');
    expect(star).toHaveAttribute('target', '_blank');
    expect(star).toHaveAttribute('rel', 'noopener noreferrer');
    expect(screen.getByText(/a star on GitHub helps other people find it/)).toBeInTheDocument();
  });
});
