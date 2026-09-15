import { describe, it, expect } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { useFocusTrap } from './useFocusTrap.js';

function Dialog({ open }) {
  const ref = useFocusTrap(open);
  if (!open) return null;
  return (
    <div ref={ref}>
      <button type="button">First</button>
      <button type="button">Last</button>
    </div>
  );
}

describe('useFocusTrap', () => {
  it('focuses the first focusable element on open', () => {
    render(<Dialog open />);
    expect(document.activeElement).toHaveTextContent('First');
  });

  it('wraps Tab from the last element back to the first', () => {
    render(<Dialog open />);
    const last = document.activeElement.parentElement.querySelectorAll('button')[1];
    last.focus();
    fireEvent.keyDown(document, { key: 'Tab' });
    expect(document.activeElement).toHaveTextContent('First');
  });

  it('wraps Shift+Tab from the first element to the last', () => {
    render(<Dialog open />);
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toHaveTextContent('Last');
  });

  it('returns focus to the opener on close', () => {
    const opener = document.createElement('button');
    opener.textContent = 'Opener';
    document.body.appendChild(opener);
    opener.focus();

    const { rerender } = render(<Dialog open={false} />);
    rerender(<Dialog open />);
    rerender(<Dialog open={false} />);

    expect(document.activeElement).toBe(opener);
    opener.remove();
  });
});
