import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import MatchReasons from './MatchReasons.jsx';

// The reasons are rendered verbatim from the server, which scores the full
// description. This suite used to run @jobdekho/core's explainScore in the
// browser; that recomputation is exactly the drift the component now avoids.
describe('MatchReasons', () => {
  it('renders the server phrases under the fit label', () => {
    render(<MatchReasons reasons={['matches react, typescript', 'suits your experience']} />);
    expect(screen.getByText('Fit')).toBeInTheDocument();
    expect(screen.getByText('matches react, typescript / suits your experience')).toBeInTheDocument();
  });

  it('passes a warning through unsoftened', () => {
    render(<MatchReasons reasons={['well outside your experience']} />);
    expect(screen.getByText(/well outside your experience/)).toBeInTheDocument();
  });

  it('renders nothing when the server had nothing to say', () => {
    const { container } = render(<MatchReasons reasons={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing for an unranked posting, which carries no reasons field', () => {
    const { container } = render(<MatchReasons />);
    expect(container).toBeEmptyDOMElement();
  });
});
