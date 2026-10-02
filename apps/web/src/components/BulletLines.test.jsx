import { describe, it, expect, vi } from 'vitest';
import { useState } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import BulletLines from './BulletLines.jsx';

// The lines kept in state, as an entry keeps them, so each edit renders and
// the focus it asks for can land.
function Lines({ initial, onLines = () => {} }) {
  const [lines, setLines] = useState(initial);
  return <BulletLines lines={lines} onChange={(next) => { setLines(next); onLines(next); }} />;
}

const line = (n) => screen.getByLabelText(`Line ${n}`);
const values = () => screen.queryAllByLabelText(/^Line \d+$/).map((box) => box.value);
const caretAt = (box, at) => box.setSelectionRange(at, at);

describe('BulletLines', () => {
  it('shows each line as its own labelled input under "What you did", with a way to remove it', () => {
    render(<Lines initial={['Built X', 'Led Y']} />);
    expect(screen.getByRole('group', { name: 'What you did' })).toBeInTheDocument();
    expect(values()).toEqual(['Built X', 'Led Y']);
    expect(line(2)).toHaveAccessibleDescription(/Alt with an up or down arrow moves the line/);
    expect(screen.getByRole('button', { name: 'Remove line 2' })).toBeInTheDocument();
  });

  it('splits the line at the caret on Enter and starts the new line with the cursor', () => {
    const onLines = vi.fn();
    render(<Lines initial={['Built X and Y', 'Z']} onLines={onLines} />);
    caretAt(line(1), 7);
    fireEvent.keyDown(line(1), { key: 'Enter' });
    expect(onLines).toHaveBeenLastCalledWith(['Built X', ' and Y', 'Z']);
    expect(line(2)).toHaveFocus();
    expect(line(2).selectionStart).toBe(0);
  });

  it('removes an empty line on Backspace and goes to the end of the line above', () => {
    render(<Lines initial={['Built X', '', 'Z']} />);
    fireEvent.keyDown(line(2), { key: 'Backspace' });
    expect(values()).toEqual(['Built X', 'Z']);
    expect(line(1)).toHaveFocus();
    expect(line(1).selectionStart).toBe(7);
  });

  it('leaves Backspace alone in a line with text, and in the first line', () => {
    const onLines = vi.fn();
    render(<Lines initial={['', 'Built X']} onLines={onLines} />);
    fireEvent.keyDown(line(2), { key: 'Backspace' });
    fireEvent.keyDown(line(1), { key: 'Backspace' });
    expect(onLines).not.toHaveBeenCalled();
  });

  it('lands several pasted lines as lines, without their bullet marks', () => {
    render(<Lines initial={['', 'Z']} />);
    fireEvent.paste(line(1), { clipboardData: { getData: () => '• Built X\n• Led Y\n\n- Cut Z' } });
    expect(values()).toEqual(['Built X', 'Led Y', 'Cut Z', 'Z']);
    expect(line(3)).toHaveFocus();
  });

  it('moves the line the cursor is in with Alt and an arrow, keeping the cursor in it', () => {
    render(<Lines initial={['a', 'b', 'c']} />);
    fireEvent.keyDown(line(1), { key: 'ArrowDown', altKey: true });
    expect(values()).toEqual(['b', 'a', 'c']);
    expect(line(2)).toHaveFocus();
    fireEvent.keyDown(line(2), { key: 'ArrowUp', altKey: true });
    fireEvent.keyDown(line(1), { key: 'ArrowUp', altKey: true });
    expect(values()).toEqual(['a', 'b', 'c']);
    expect(line(1)).toHaveFocus();
  });

  it('adds an empty line at the end with the cursor in it', () => {
    render(<Lines initial={['a']} />);
    fireEvent.click(screen.getByRole('button', { name: 'Add a line' }));
    expect(values()).toEqual(['a', '']);
    expect(line(2)).toHaveFocus();
  });

  it('removes a line, handing the focus to the line before, or to Add a line when none is left', () => {
    render(<Lines initial={['a', 'b']} />);
    fireEvent.click(screen.getByRole('button', { name: 'Remove line 2' }));
    expect(values()).toEqual(['a']);
    expect(line(1)).toHaveFocus();
    fireEvent.click(screen.getByRole('button', { name: 'Remove line 1' }));
    expect(values()).toEqual([]);
    expect(screen.getByRole('button', { name: 'Add a line' })).toHaveFocus();
  });

  it('moves a line dragged by its grip onto another', () => {
    const { container } = render(<Lines initial={['a', 'b', 'c']} />);
    const dataTransfer = { setData: vi.fn(), setDragImage: vi.fn(), effectAllowed: '' };
    const [grip] = container.querySelectorAll('[draggable="true"]');
    fireEvent.dragStart(grip, { dataTransfer });
    fireEvent.dragOver(line(3).parentElement, { dataTransfer });
    fireEvent.drop(line(3).parentElement, { dataTransfer });
    expect(values()).toEqual(['b', 'c', 'a']);
    expect(dataTransfer.setData).toHaveBeenCalledWith('text/plain', '0');
  });
});
