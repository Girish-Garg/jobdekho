import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import StaleNote from './StaleNote.jsx';

describe('StaleNote', () => {
  it('says a long-unlisted posting has most likely closed', () => {
    render(<StaleNote posting={{ lastSeenAt: '2020-01-05T00:00:00.000Z' }} />);
    expect(screen.getByText('Last seen on its board on 5 Jan. It has most likely closed.')).toBeInTheDocument();
  });

  it('says nothing for a posting still listed', () => {
    const { container } = render(<StaleNote posting={{ lastSeenAt: new Date().toISOString() }} />);
    expect(container).toBeEmptyDOMElement();
  });
});
