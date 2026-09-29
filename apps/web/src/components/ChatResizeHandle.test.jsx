import { describe, it, expect, vi, beforeAll } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ChatResizeHandle from './ChatResizeHandle.jsx';

// jsdom has no PointerEvent, and the plain Event testing-library falls back
// to drops clientX and button, which are the whole point of a drag.
beforeAll(() => {
  if (window.PointerEvent) return;
  window.PointerEvent = class PointerEvent extends MouseEvent {
    constructor(type, init = {}) {
      super(type, init);
      this.pointerId = init.pointerId ?? 1;
    }
  };
});

function setup(width = 400) {
  const onResize = vi.fn();
  render(<ChatResizeHandle width={width} min={320} max={720} onResize={onResize} />);
  return { onResize, handle: screen.getByRole('separator', { name: 'Resize the chat' }) };
}

describe('ChatResizeHandle', () => {
  it('is a vertical separator that says its width and bounds, and can be focused', () => {
    const { handle } = setup();
    expect(handle).toHaveAttribute('aria-orientation', 'vertical');
    expect(handle).toHaveAttribute('aria-valuenow', '400');
    expect(handle).toHaveAttribute('aria-valuemin', '320');
    expect(handle).toHaveAttribute('aria-valuemax', '720');
    expect(handle).toHaveAttribute('tabindex', '0');
  });

  it('moves 16px per arrow key, and to either limit on Home and End', () => {
    const { handle, onResize } = setup();
    fireEvent.keyDown(handle, { key: 'ArrowRight' });
    fireEvent.keyDown(handle, { key: 'ArrowLeft' });
    fireEvent.keyDown(handle, { key: 'Home' });
    fireEvent.keyDown(handle, { key: 'End' });
    expect(onResize.mock.calls.map(([w]) => w)).toEqual([416, 384, 320, 720]);
  });

  it('ignores other keys', () => {
    const { handle, onResize } = setup();
    fireEvent.keyDown(handle, { key: 'a' });
    expect(onResize).not.toHaveBeenCalled();
  });

  it('follows a drag from where it started, and stops when released', () => {
    const { handle, onResize } = setup(400);
    fireEvent.pointerDown(handle, { button: 0, clientX: 400, pointerId: 1 });
    fireEvent.pointerMove(handle, { clientX: 460, pointerId: 1 });
    expect(onResize).toHaveBeenLastCalledWith(460);
    fireEvent.pointerUp(handle, { pointerId: 1 });
    onResize.mockClear();
    fireEvent.pointerMove(handle, { clientX: 500, pointerId: 1 });
    expect(onResize).not.toHaveBeenCalled();
  });

  it('does not start a drag from a right click', () => {
    const { handle, onResize } = setup(400);
    fireEvent.pointerDown(handle, { button: 2, clientX: 400 });
    fireEvent.pointerMove(handle, { clientX: 460 });
    expect(onResize).not.toHaveBeenCalled();
  });
});
