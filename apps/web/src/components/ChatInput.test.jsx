import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { useListKeys } from '../lib/useListKeys.js';
import ChatInput from './ChatInput.jsx';

const PLACEHOLDER = 'Ask about what is on screen';

// Mounts the real feed key handler (not a stand-in) beside the chat box, so
// this proves j/k/s/a/d/u stay out of the input's way against the actual
// hook rather than an assumption about how it works.
function ListAndInput({ onSelect }) {
  useListKeys({
    rows: [{ id: 'a' }, { id: 'b' }], selectedId: 'a', onSelect,
    onOpen: () => {}, onStatus: () => {}, onUndo: () => {}, onClear: () => {},
  });
  return <ChatInput busy={false} onSend={() => {}} />;
}

describe('ChatInput', () => {
  it('does not let the feed\'s letter shortcuts fire while typing in the box', () => {
    const onSelect = vi.fn();
    render(<ListAndInput onSelect={onSelect} />);
    const box = screen.getByPlaceholderText(PLACEHOLDER);
    for (const key of ['j', 'k', 's', 'a', 'd', 'u']) fireEvent.keyDown(box, { key });
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('submits on Enter and clears the box', () => {
    const onSend = vi.fn();
    render(<ChatInput busy={false} onSend={onSend} />);
    const box = screen.getByPlaceholderText(PLACEHOLDER);
    fireEvent.change(box, { target: { value: 'hello' } });
    fireEvent.keyDown(box, { key: 'Enter' });
    expect(onSend).toHaveBeenCalledWith('hello');
    expect(box.value).toBe('');
  });

  it('shift+Enter writes a new line instead of sending', () => {
    const onSend = vi.fn();
    render(<ChatInput busy={false} onSend={onSend} />);
    const box = screen.getByPlaceholderText(PLACEHOLDER);
    fireEvent.change(box, { target: { value: 'hello' } });
    fireEvent.keyDown(box, { key: 'Enter', shiftKey: true });
    expect(onSend).not.toHaveBeenCalled();
  });

  it('does not send a blank question', () => {
    const onSend = vi.fn();
    render(<ChatInput busy={false} onSend={onSend} />);
    const box = screen.getByPlaceholderText(PLACEHOLDER);
    fireEvent.change(box, { target: { value: '   ' } });
    fireEvent.keyDown(box, { key: 'Enter' });
    expect(onSend).not.toHaveBeenCalled();
  });

  it('disables the box and the button while busy', () => {
    render(<ChatInput busy onSend={() => {}} />);
    expect(screen.getByPlaceholderText(PLACEHOLDER)).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Ask' })).toBeDisabled();
  });

  it('says plainly that a question spends the person\'s own subscription', () => {
    render(<ChatInput busy={false} onSend={() => {}} />);
    expect(screen.getByText(/on your own subscription/)).toBeInTheDocument();
  });

  it('sends from the round button, which is held back until there is something to send', () => {
    const onSend = vi.fn();
    render(<ChatInput busy={false} onSend={onSend} />);
    const send = screen.getByRole('button', { name: 'Ask' });
    expect(send).toHaveAttribute('title', 'Ask');
    expect(send).toBeDisabled();
    fireEvent.change(screen.getByPlaceholderText(PLACEHOLDER), { target: { value: 'hi' } });
    fireEvent.click(send);
    expect(onSend).toHaveBeenCalledWith('hi');
  });

  it('names the button for what it does while a card is the reply target', () => {
    render(<ChatInput busy={false} onSend={() => {}} placeholder="What should change in the letter?" submitLabel="Change" />);
    expect(screen.getByRole('button', { name: 'Change' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'What should change in the letter?' })).toBeInTheDocument();
  });

  it('starts one line tall and grows to fit what is typed', () => {
    render(<ChatInput busy={false} onSend={() => {}} />);
    const box = screen.getByPlaceholderText(PLACEHOLDER);
    expect(box).toHaveAttribute('rows', '1');
    Object.defineProperty(box, 'scrollHeight', { configurable: true, value: 88 });
    fireEvent.change(box, { target: { value: 'one\ntwo\nthree\nfour' } });
    expect(box.style.height).toBe('88px');
  });

  it('takes a draft once, with the caret at its end, and leaves the box alone after that', () => {
    const draft = { id: 9001, text: 'Add a project: ' };
    const { rerender } = render(<ChatInput busy={false} onSend={() => {}} draft={draft} />);
    const box = screen.getByPlaceholderText(PLACEHOLDER);
    expect(box).toHaveValue('Add a project: ');
    expect(box).toHaveFocus();
    expect(box.selectionStart).toBe('Add a project: '.length);
    fireEvent.change(box, { target: { value: '' } });
    rerender(<ChatInput busy={false} onSend={() => {}} draft={draft} />);
    expect(box).toHaveValue('');
  });
});
