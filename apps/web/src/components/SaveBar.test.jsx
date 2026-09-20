import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import SaveBar from './SaveBar.jsx';
import { onNotice } from '../lib/toast.js';

describe('SaveBar', () => {
  it('confirms a save that resolves, then returns to idle', async () => {
    let resolveSave;
    const onSave = vi.fn(() => new Promise((resolve) => { resolveSave = resolve; }));
    render(<SaveBar onSave={onSave} />);
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    expect(screen.getByRole('button', { name: 'Saving...' })).toBeDisabled();
    resolveSave();
    expect(await screen.findByRole('button', { name: 'Saved' })).toBeInTheDocument();
  });

  // The button beside it only ever says "Could not save."; the notice is
  // where the server's own reason goes, for a Settings or Profile screen a
  // person can be scrolled well past the button on.
  it('announces the real reason on failure, under the label it was given', async () => {
    const onSave = vi.fn().mockRejectedValue(new Error('disk full'));
    const notices = [];
    const stop = onNotice((n) => notices.push(n));
    render(<SaveBar onSave={onSave} label="Save profile" />);
    fireEvent.click(screen.getByRole('button', { name: 'Save profile' }));
    expect(await screen.findByText('Could not save.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
    stop();
    expect(notices).toContainEqual(expect.objectContaining({ title: 'Save profile', detail: 'disk full' }));
  });

  // A save is never an AI action, so even an error that happens to carry an
  // AI-shaped kind (a coincidence, not a signal here) must not offer the
  // recheck button - a putProviderPreference call failing this way was never
  // routed through the CLI at all.
  it('never turns a save\'s error kind into the AI CLI recheck button', async () => {
    const err = Object.assign(new Error('not signed in'), { kind: 'login' });
    const onSave = vi.fn().mockRejectedValue(err);
    const notices = [];
    const stop = onNotice((n) => notices.push(n));
    render(<SaveBar onSave={onSave} />);
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    await screen.findByRole('button', { name: 'Retry' });
    stop();
    expect(notices).toContainEqual(expect.objectContaining({ action: null }));
  });
});
