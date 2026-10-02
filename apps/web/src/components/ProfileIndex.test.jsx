import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ProfileIndex from './ProfileIndex.jsx';

const ROWS = [
  { id: 'profile-basics', label: 'Basics' },
  { id: 'profile-experience', label: 'Experience', count: 2 },
  { id: 'profile-projects', label: 'Projects', count: 0 },
];

describe('ProfileIndex', () => {
  it('renders nothing at all when there are no sections to point at', () => {
    const { container } = render(<ProfileIndex rows={[]} current={null} onJump={() => {}} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('lists every section as an in-page link, with its count where it has one', () => {
    render(<ProfileIndex rows={ROWS} current="profile-basics" onJump={() => {}} />);
    expect(screen.getByRole('navigation', { name: 'Sections' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Basics' })).toHaveAttribute('href', '#profile-basics');
    expect(screen.getByRole('link', { name: 'Experience 2' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Projects 0' })).toBeInTheDocument();
  });

  it('marks only the current section', () => {
    render(<ProfileIndex rows={ROWS} current="profile-experience" onJump={() => {}} />);
    expect(screen.getByRole('link', { name: 'Experience 2' })).toHaveAttribute('aria-current', 'location');
    expect(screen.getByRole('link', { name: 'Basics' })).not.toHaveAttribute('aria-current');
    expect(screen.getByRole('link', { name: 'Projects 0' })).not.toHaveAttribute('aria-current');
  });

  // One highlight glides between entries, as the topbar's does, instead of
  // each entry painting its own background on and off.
  it('lights the current section in the column with one gliding highlight, not a background of its own', () => {
    const { container, rerender } = render(<ProfileIndex rows={ROWS} current="profile-experience" onJump={() => {}} />);
    const pills = container.querySelectorAll('nav > span[aria-hidden="true"]');
    expect(pills).toHaveLength(1);
    const here = screen.getByRole('link', { name: 'Experience 2' });
    expect(here).toHaveAttribute('data-pill-key', 'profile-experience');
    expect(here).not.toHaveClass('bg-select');
    rerender(<ProfileIndex rows={ROWS} current="profile-projects" onJump={() => {}} />);
    expect(container.querySelectorAll('nav > span[aria-hidden="true"]')).toHaveLength(1);
    expect(screen.getByRole('link', { name: 'Projects 0' })).toHaveAttribute('aria-current', 'location');
  });

  it('keeps the ink rule, and no highlight, in the sideways strip', () => {
    const { container } = render(<ProfileIndex horizontal rows={ROWS} current="profile-experience" onJump={() => {}} />);
    expect(container.querySelector('nav > span[aria-hidden="true"]')).toBeNull();
    expect(screen.getByRole('link', { name: 'Experience 2' })).toHaveClass('border-ink');
  });

  it('jumps by hand instead of letting the hash navigate, since the record scrolls inside main', () => {
    const onJump = vi.fn();
    render(<ProfileIndex rows={ROWS} current="profile-basics" onJump={onJump} />);
    const click = fireEvent.click(screen.getByRole('link', { name: 'Projects 0' }));
    expect(onJump).toHaveBeenCalledWith('profile-projects');
    // fireEvent returns false when a handler called preventDefault.
    expect(click).toBe(false);
  });

  it('lays the strip out as one row that scrolls sideways', () => {
    render(<ProfileIndex horizontal rows={ROWS} current="profile-basics" onJump={() => {}} />);
    expect(screen.getByRole('list')).toHaveClass('overflow-x-auto');
    expect(screen.getByRole('link', { name: 'Basics' })).toHaveClass('whitespace-nowrap');
  });
});
