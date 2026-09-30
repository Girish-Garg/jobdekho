import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ChatHeader from './ChatHeader.jsx';

const CLAUDE = { id: 'claude', label: 'Claude Code', policies: ['none'], present: true, runs: true };
const layout = (over = {}) => ({ wide: true, pinned: false, togglePinned: vi.fn(), ...over });

function setup(props = {}) {
  const handlers = { onNew: vi.fn(), onClose: vi.fn() };
  render(<ChatHeader providers={[CLAUDE]} answerer={CLAUDE} layout={layout()} {...handlers} {...props} />);
  return handlers;
}

describe('ChatHeader', () => {
  it('names the panel and the CLI that will answer', () => {
    setup();
    expect(screen.getByRole('heading', { name: 'Ask AI' })).toBeInTheDocument();
    expect(screen.getByText('Claude Code on this PC')).toBeInTheDocument();
  });

  it('says when it is still looking for a CLI, and when there is none', () => {
    const { unmount } = render(<ChatHeader providers={undefined} answerer={null} layout={layout()} onNew={vi.fn()} onClose={vi.fn()} />);
    expect(screen.getByText('Looking for an AI CLI on this computer...')).toBeInTheDocument();
    unmount();
    render(<ChatHeader providers={[]} answerer={null} layout={layout()} onNew={vi.fn()} onClose={vi.fn()} />);
    expect(screen.getByText('No AI CLI found on this computer')).toBeInTheDocument();
  });

  it('starts a new chat and closes from labelled icon buttons with tooltips', () => {
    const { onNew, onClose } = setup();
    const fresh = screen.getByRole('button', { name: 'New chat' });
    expect(fresh).toHaveAttribute('title', 'New chat');
    fireEvent.click(fresh);
    fireEvent.click(screen.getByRole('button', { name: 'Close the chat' }));
    expect(onNew).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it('opens History, and says it closes it once open', () => {
    const onHistory = vi.fn();
    const { unmount } = render(<ChatHeader providers={[CLAUDE]} answerer={CLAUDE} layout={layout()} onHistory={onHistory} onNew={vi.fn()} onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'History' }));
    expect(onHistory).toHaveBeenCalled();
    unmount();
    render(<ChatHeader providers={[CLAUDE]} answerer={CLAUDE} layout={layout()} history onHistory={onHistory} onNew={vi.fn()} onClose={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Close history' })).toHaveClass('text-primary');
  });

  it('offers to pin a floating panel and to float a pinned one', () => {
    const floating = layout();
    const { unmount } = render(<ChatHeader providers={[]} answerer={null} layout={floating} onNew={vi.fn()} onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Pin to the side' }));
    expect(floating.togglePinned).toHaveBeenCalled();
    unmount();
    render(<ChatHeader providers={[]} answerer={null} layout={layout({ pinned: true })} onNew={vi.fn()} onClose={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Float over the page' })).toBeInTheDocument();
  });

  it('has nothing to pin on a narrow window', () => {
    setup({ layout: layout({ wide: false }) });
    expect(screen.queryByRole('button', { name: /Pin to the side|Float over/ })).not.toBeInTheDocument();
  });

  it('has nothing to pin on a page that docks the panel', () => {
    setup({ layout: layout({ pinned: true, docked: true }) });
    expect(screen.queryByRole('button', { name: /Pin to the side|Float over/ })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Close the chat' })).toBeInTheDocument();
  });
});
