import { describe, it, expect, vi } from 'vitest';
import { render, screen, within, fireEvent } from '@testing-library/react';
import FillProgress from './FillProgress.jsx';

const SENT = [{ event: 'start', provider: 'claude' }, { event: 'progress', stage: 'send', chars: 900 }];
const bar = (container) => container.querySelector('[aria-hidden="true"].h-1 > div');
const stateOf = (text) => within(screen.getByRole('list', { name: 'Progress' })).getByText(text).closest('li');

describe('FillProgress', () => {
  it('ticks the hand-over off and counts the seconds on the step it is waiting on', () => {
    render(<FillProgress events={SENT} label="Claude Code" startedAt={Date.now() - 14200} finished={false} />);
    expect(stateOf('Handed to Claude Code')).not.toHaveAttribute('aria-current');
    expect(stateOf('Finding roles, projects and skills')).toHaveAttribute('aria-current', 'step');
    expect(stateOf('Finding roles, projects and skills')).toHaveTextContent('14s');
    expect(stateOf('Comparing with your profile')).toHaveClass('text-muted');
    expect(screen.getByText('Usually 20 to 40 seconds')).toBeInTheDocument();
  });

  it('says it is handing the resume over before the CLI has it', () => {
    render(<FillProgress events={[]} label="Claude Code" startedAt={Date.now()} finished={false} />);
    expect(stateOf('Handing to Claude Code')).toHaveAttribute('aria-current', 'step');
  });

  // The list itself is not live, or the seconds would be read out each one.
  it('tells a screen reader each step as it becomes the current one', () => {
    const { container } = render(<FillProgress events={SENT} label="Claude Code" startedAt={Date.now()} finished={false} />);
    expect(container.querySelector('[aria-live="polite"]')).toHaveTextContent('Finding roles, projects and skills');
  });

  it('eases the bar along below nine tenths, and fills it only at the end', () => {
    const { container, rerender } = render(<FillProgress events={SENT} label="Claude Code" startedAt={Date.now() - 30000} finished={false} />);
    const width = () => parseInt(bar(container).style.width, 10);
    expect(width()).toBeGreaterThan(60);
    expect(width()).toBeLessThan(90);
    rerender(<FillProgress events={SENT} label="Claude Code" startedAt={Date.now() - 30000} finished />);
    expect(width()).toBe(100);
    expect(screen.queryByText('14s')).not.toBeInTheDocument();
    for (const text of ['Handed to Claude Code', 'Finding roles, projects and skills', 'Comparing with your profile', 'Ready for you to review']) {
      expect(stateOf(text)).not.toHaveAttribute('aria-current');
    }
  });

  it('says the CLI is being asked again after it was busy signing in', () => {
    render(<FillProgress events={[...SENT, { event: 'progress', stage: 'retry', attempt: 2 }]} label="Claude Code" startedAt={Date.now()} finished={false} />);
    expect(screen.getByText('Claude Code was busy signing itself in. Trying again.')).toBeInTheDocument();
  });

  it('offers a Stop while it reads, and none once the answer is in', () => {
    const onStop = vi.fn();
    const { rerender } = render(<FillProgress events={SENT} label="Claude Code" startedAt={Date.now()} finished={false} onStop={onStop} />);
    fireEvent.click(screen.getByRole('button', { name: 'Stop' }));
    expect(onStop).toHaveBeenCalledTimes(1);
    rerender(<FillProgress events={SENT} label="Claude Code" startedAt={Date.now()} finished onStop={onStop} />);
    expect(screen.queryByRole('button', { name: 'Stop' })).not.toBeInTheDocument();
  });
});
