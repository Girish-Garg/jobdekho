import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import ChatFrame from './ChatFrame.jsx';

const layout = (over = {}) => ({ wide: true, pinned: false, width: 400, min: 320, max: 720, setWidth: vi.fn(), ...over });

function edgeOf(over) {
  render(<ChatFrame layout={layout(over)} beside={<div data-testid="builder" />}>body</ChatFrame>);
  return screen.getByTestId('builder').parentElement.style.getPropertyValue('--chat-width');
}

describe('ChatFrame', () => {
  it('keeps its name for everything that finds the panel by it', () => {
    render(<ChatFrame layout={layout()}>body</ChatFrame>);
    expect(screen.getByRole('complementary', { name: 'Ask AI' })).toHaveTextContent('body');
  });

  it('tells what opens beside it where it ends: past the inset when floating, at its width when pinned', () => {
    expect(edgeOf({})).toBe('412px');
  });

  it('puts what opens beside a pinned panel right at its edge', () => {
    expect(edgeOf({ pinned: true })).toBe('400px');
  });

  it('lets what opens beside it take the whole width on a narrow window', () => {
    expect(edgeOf({ wide: false })).toBe('0px');
  });

  it('renders nothing beside it when nothing is open there', () => {
    const { container } = render(<ChatFrame layout={layout()}>body</ChatFrame>);
    expect(container.querySelector('.contents')).toBeNull();
  });
});
