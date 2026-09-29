import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import ChatFrame from './ChatFrame.jsx';

const layout = (over = {}) => ({ wide: true, pinned: false, width: 400, min: 320, max: 720, setWidth: vi.fn(), ...over });
const frame = (over) => {
  render(<ChatFrame layout={layout(over)}>body</ChatFrame>);
  return screen.getByRole('complementary', { name: 'Ask AI' });
};

describe('ChatFrame', () => {
  it('keeps its name for everything that finds the panel by it', () => {
    expect(frame()).toHaveTextContent('body');
  });

  it('floats over the page by default, at its width', () => {
    const panel = frame();
    expect(panel).toHaveAttribute('data-mode', 'floating');
    expect(panel.style.width).toBe('400px');
  });

  it('sits in the page\'s row when pinned', () => {
    expect(frame({ pinned: true })).toHaveAttribute('data-mode', 'pinned');
  });

  it('covers the page on a narrow window, with no width of its own and nothing to drag', () => {
    const panel = frame({ wide: false });
    expect(panel).toHaveAttribute('data-mode', 'narrow');
    expect(panel.style.width).toBe('');
    expect(screen.queryByRole('separator')).not.toBeInTheDocument();
  });
});
