import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import GhostSignals from './GhostSignals.jsx';

// The signals are the server's phrases, verbatim, and they only ever appear
// when there is something to show: this data can flag a posting but cannot
// clear one, so there is no "looks fine" rendering to test for.
describe('GhostSignals', () => {
  it('lists each signal under the caution label', () => {
    render(<GhostSignals signals={['no pay stated', 'posted 4 months ago', 'listed on 6 job boards']} />);
    expect(screen.getByText('Caution')).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(3);
    expect(screen.getByText('no pay stated')).toBeInTheDocument();
    expect(screen.getByText('listed on 6 job boards')).toBeInTheDocument();
  });

  it('renders nothing at all when the list is empty', () => {
    const { container } = render(<GhostSignals signals={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing when the field is missing entirely', () => {
    const { container } = render(<GhostSignals />);
    expect(container).toBeEmptyDOMElement();
  });
});
