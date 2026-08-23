import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import MatchReasons from './MatchReasons.jsx';

// Deliberately unmocked: this component exists to put @jobdekho/core's
// explainScore in front of the user, so the test exercises the real one.
const posting = (over) => ({
  title: 'React Developer',
  descriptionSnippet: 'TypeScript everywhere.',
  level: 'entry',
  degreeMin: 'none',
  ...over,
});

const profile = (over) => ({
  skills: ['react'], titles: [], locations: [], years: 1, degree: 'none', ...over,
});

describe('MatchReasons', () => {
  it('says what matched, in words rather than a score', () => {
    render(<MatchReasons posting={posting()} profile={profile()} />);
    expect(screen.getByText(/matches react/)).toBeInTheDocument();
    expect(screen.getByText(/suits your experience/)).toBeInTheDocument();
  });

  it('warns when the posting is out of reach instead of flattering it', () => {
    render(
      <MatchReasons
        posting={posting({ title: 'Chief Architect', level: 'executive', degreeMin: 'phd' })}
        profile={profile({ skills: [], years: 0 })}
      />,
    );
    expect(screen.getByText(/well outside your experience/)).toBeInTheDocument();
    expect(screen.getByText(/needs a higher degree than you listed/)).toBeInTheDocument();
  });

  // A mid role one rung off a null-years profile: core normalizes JSON null
  // years to 0, so entry roles would still "suit". One rung is close enough
  // to draw no comment either way, so this holds even if core changes that.
  it('renders nothing when there is nothing to say', () => {
    const { container } = render(
      <MatchReasons
        posting={posting({ title: 'Accountant', descriptionSnippet: '', level: 'mid' })}
        profile={profile({ skills: [], years: null })}
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});
