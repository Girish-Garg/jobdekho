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

  // The next question can be written while an answer is on its way; sent
  // then, it waits for that answer rather than going at once.
  it('stays open while busy, and holds a question sent meanwhile', () => {
    const onSend = vi.fn();
    const onQueue = vi.fn();
    render(<ChatInput busy onSend={onSend} onQueue={onQueue} />);
    const box = screen.getByPlaceholderText(PLACEHOLDER);
    expect(box).not.toBeDisabled();
    fireEvent.change(box, { target: { value: 'and the third?' } });
    fireEvent.keyDown(box, { key: 'Enter' });
    expect(onQueue).toHaveBeenCalledWith('and the third?');
    expect(onSend).not.toHaveBeenCalled();
    expect(box).toHaveValue('');
  });

  it('holds nothing back when there is nowhere to hold it', () => {
    const onSend = vi.fn();
    render(<ChatInput busy onSend={onSend} />);
    fireEvent.change(screen.getByPlaceholderText(PLACEHOLDER), { target: { value: 'hi' } });
    expect(screen.getByRole('button', { name: 'Ask' })).toBeDisabled();
    expect(onSend).not.toHaveBeenCalled();
  });

  it('turns the send button into Stop while an answer is written, and Escape stops it too', () => {
    const onStop = vi.fn();
    render(<ChatInput busy onSend={() => {}} onStop={onStop} />);
    fireEvent.click(screen.getByRole('button', { name: 'Stop' }));
    fireEvent.keyDown(screen.getByPlaceholderText(PLACEHOLDER), { key: 'Escape' });
    expect(onStop).toHaveBeenCalledTimes(2);
    expect(screen.getByText('Esc stops the answer.')).toBeInTheDocument();
  });

  it('shows a held question above the box, with a way to take it back', () => {
    const onUnqueue = vi.fn();
    render(<ChatInput busy onSend={() => {}} queued="and the third?" onUnqueue={onUnqueue} />);
    expect(screen.getByText('and the third?')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Do not send it' }));
    expect(onUnqueue).toHaveBeenCalled();
  });

  it('says how to send, and how to write a second line', () => {
    render(<ChatInput busy={false} onSend={() => {}} />);
    expect(screen.getByText('Enter sends, Shift+Enter for a new line.')).toBeInTheDocument();
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
