import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import PostingsHeader from './PostingsHeader.jsx';
import { requestSort } from '../lib/commandBus.js';

describe('PostingsHeader', () => {
  it('keeps its existing props: the count, the fresh count and the sort select', () => {
    render(<PostingsHeader shown={12} fresh={3} sort="match" setSort={() => {}} />);
    expect(screen.getByText('12 shown')).toBeInTheDocument();
    expect(screen.getByText('/ 3 new today')).toBeInTheDocument();
    expect(screen.getByLabelText(/sort/i)).toHaveValue('match');
  });

  it('renders a solid raised surface rather than a translucent, blurred one', () => {
    const { container } = render(<PostingsHeader shown={0} fresh={0} sort="match" setSort={() => {}} />);
    const bar = container.firstChild;
    expect(bar.className).toContain('bg-panel');
    expect(bar.className).not.toContain('backdrop-blur');
    expect(bar.className).not.toContain('bg-paper/95');
  });

  it('renders optional children, such as a density toggle, next to the sort control', () => {
    render(
      <PostingsHeader shown={0} fresh={0} sort="match" setSort={() => {}}>
        <button type="button">Density</button>
      </PostingsHeader>,
    );
    expect(screen.getByRole('button', { name: 'Density' })).toBeInTheDocument();
  });

  it('forwards a command-bus sort request to the setSort it already received as a prop', () => {
    const setSort = vi.fn();
    render(<PostingsHeader shown={0} fresh={0} sort="match" setSort={setSort} />);
    requestSort('newest');
    expect(setSort).toHaveBeenCalledWith('newest');
  });

  it('stops listening once unmounted', () => {
    const setSort = vi.fn();
    const { unmount } = render(<PostingsHeader shown={0} fresh={0} sort="match" setSort={setSort} />);
    unmount();
    requestSort('oldest');
    expect(setSort).not.toHaveBeenCalled();
  });
});
