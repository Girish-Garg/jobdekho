import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import PostingDetailSlot from './PostingDetailSlot.jsx';
import { OVERLAY_HOST_ID } from '../lib/overlayHost.js';

const posting = { id: 'p1', title: 'Engineer', company: 'Acme', status: null };
const noop = () => {};

describe('PostingDetailSlot below the wide breakpoint', () => {
  // The dialog would cover the company's jobs, so it gets out of the way.
  it('closes on the way to a company\'s jobs', () => {
    const onCompany = vi.fn();
    const onClose = vi.fn();
    render(<PostingDetailSlot isWide={false} opened={posting} onClose={onClose} onStatus={noop} onCompany={onCompany} />);
    fireEvent.click(screen.getByRole('button', { name: 'All jobs at Acme' }));
    expect(onCompany).toHaveBeenCalledWith('Acme');
    expect(onClose).toHaveBeenCalled();
  });

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
  // A pane nobody opened is a column of the screen spent on nothing, so
  // there is no pane at all until a posting is opened into it.
  it('takes no width at all until something is opened', () => {
    const { container } = render(<PostingDetailSlot isWide opened={null} onClose={noop} onStatus={noop} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('shows the opened posting in the pane instead of a dialog', () => {
    render(<PostingDetailSlot isWide opened={posting} onClose={noop} onStatus={noop} />);
    expect(screen.getByText('Engineer')).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});

// The pane floats over the feed: rendered into the area under the chrome,
// never into the feed's own row, where it used to take a column and reflow
// every card beside it.
describe('PostingDetailSlot floating over the feed', () => {
  it('renders into the overlay host when the shell provides one', () => {
    const host = document.createElement('div');
    host.id = OVERLAY_HOST_ID;
    document.body.appendChild(host);
    const { container } = render(<PostingDetailSlot isWide opened={posting} onClose={noop} onStatus={noop} />);
    expect(container).toBeEmptyDOMElement();
    expect(host.querySelector('[aria-label="Posting"]')).not.toBeNull();
    host.remove();
  });
});

// A floating card goes away when the person presses anywhere else, except
// on what works with the open job: another row (it opens that job instead),
// the chat and its toggle, and anything sitting above the page.
describe('PostingDetailSlot closing on a press outside', () => {
  function setup({ isWide = true } = {}) {
    const onClose = vi.fn();
    const onDismiss = vi.fn();
    render(
      <div>
        <button type="button">Filters</button>
        <div data-row-id="p2"><button type="button">Other job</button></div>
        <aside data-keeps-pane><input aria-label="Question" /></aside>
        <div role="dialog" aria-label="Palette"><button type="button">Run</button></div>
        <PostingDetailSlot isWide={isWide} opened={posting} onClose={onClose} onDismiss={onDismiss} onStatus={noop} />
      </div>,
    );
    return { onClose, onDismiss };
  }

  it('dismisses without the close that pulls focus back to the row', () => {
    const { onClose, onDismiss } = setup();
    fireEvent.mouseDown(screen.getByRole('button', { name: 'Filters' }));
    expect(onDismiss).toHaveBeenCalledTimes(1);
    expect(onClose).not.toHaveBeenCalled();
  });

  it('stays open for a press inside the pane', () => {
    const { onDismiss } = setup();
    fireEvent.mouseDown(screen.getByText('Engineer'));
    expect(onDismiss).not.toHaveBeenCalled();
  });

  it('stays open for another row, the chat and a dialog above the page', () => {
    const { onDismiss } = setup();
    fireEvent.mouseDown(screen.getByRole('button', { name: 'Other job' }));
    fireEvent.mouseDown(screen.getByRole('textbox', { name: 'Question' }));
    fireEvent.mouseDown(screen.getByRole('button', { name: 'Run' }));
    expect(onDismiss).not.toHaveBeenCalled();
  });

  // The dialog has its own backdrop to close it; a second listener would
  // close it for a press inside its own card.
  it('leaves the narrow dialog to its backdrop', () => {
    const { onDismiss } = setup({ isWide: false });
    fireEvent.mouseDown(screen.getByRole('button', { name: 'Filters' }));
    expect(onDismiss).not.toHaveBeenCalled();
  });

  it('closes through onClose when no quiet dismiss is given', () => {
    const onClose = vi.fn();
    render(<div><button type="button">Elsewhere</button><PostingDetailSlot isWide opened={posting} onClose={onClose} onStatus={noop} /></div>);
    fireEvent.mouseDown(screen.getByRole('button', { name: 'Elsewhere' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
