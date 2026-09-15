import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import PostingDetailSlot from './PostingDetailSlot.jsx';

const posting = { id: 'p1', title: 'Engineer', company: 'Acme', status: null };
const noop = () => {};

describe('PostingDetailSlot below the wide breakpoint', () => {
  it('renders the dialog when something is open', () => {
    render(<PostingDetailSlot isWide={false} opened={posting} onClose={noop} onStatus={noop} />);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('renders nothing when nothing is open', () => {
    const { container } = render(<PostingDetailSlot isWide={false} opened={null} onClose={noop} onStatus={noop} />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe('PostingDetailSlot at the wide breakpoint', () => {
  // Only an empty feed gets here: a feed with rows opens on its first one,
  // so the pane is never a column telling the person to go and pick something.
  it('says there is nothing to show when the feed came back empty', () => {
    render(<PostingDetailSlot isWide opened={null} onClose={noop} onStatus={noop} />);
    expect(screen.getByText('Nothing to show yet.')).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('shows the opened posting in the pane instead of a dialog', () => {
    render(<PostingDetailSlot isWide opened={posting} onClose={noop} onStatus={noop} />);
    expect(screen.getByText('Engineer')).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
