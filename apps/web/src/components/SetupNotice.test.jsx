import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act, fireEvent, within } from '@testing-library/react';
import SetupNotice from './SetupNotice.jsx';

vi.mock('../api.js', () => ({ getSetup: vi.fn() }));

import { getSetup } from '../api.js';

const check = (id, label, state) => ({ id, label, state, detail: `${label} detail.`, fix: state === 'ok' ? null : `Fix ${label}.` });
const AI = check('ai', 'An AI to answer with', 'missing');
const LATEX = check('latex', 'PDF making', 'missing');
const PROFILE = check('profile', 'Your profile', 'ok');
const WEB = check('web', 'Web search', 'optional');
const LOCAL = check('ollama', 'Ollama on this computer', 'optional');

beforeEach(() => {
  vi.clearAllMocks();
  sessionStorage.clear();
  getSetup.mockResolvedValue([AI, LATEX, PROFILE, WEB, LOCAL]);
});

async function mount(props = {}) {
  let view;
  await act(async () => {
    view = render(<SetupNotice onOpenSettings={() => {}} {...props} />);
  });
  return view;
}

describe('SetupNotice', () => {
  it('names every required check that is missing, and nothing else', async () => {
    await mount();
    const notice = screen.getByRole('region', { name: 'Setup' });
    expect(within(notice).getByText('An AI to answer with')).toBeInTheDocument();
    expect(within(notice).getByText('PDF making')).toBeInTheDocument();
    expect(within(notice).queryByText('Your profile')).not.toBeInTheDocument();
    expect(within(notice).queryByText('Web search')).not.toBeInTheDocument();
  });

  it('shows nothing when only optional checks are left', async () => {
    getSetup.mockResolvedValue([{ ...AI, state: 'ok' }, PROFILE, WEB, LOCAL]);
    const { container } = await mount();
    expect(container).toBeEmptyDOMElement();
  });

  it('shows nothing while the check is on its way, or when it could not run', async () => {
    getSetup.mockReturnValue(new Promise(() => {}));
    const pending = render(<SetupNotice onOpenSettings={() => {}} />);
    expect(pending.container).toBeEmptyDOMElement();
    pending.unmount();
    getSetup.mockRejectedValue(new Error('server down'));
    const { container } = await mount();
    expect(container).toBeEmptyDOMElement();
  });

  it('opens Settings', async () => {
    const onOpenSettings = vi.fn();
    await mount({ onOpenSettings });
    fireEvent.click(screen.getByRole('button', { name: 'Open Settings' }));
    expect(onOpenSettings).toHaveBeenCalled();
  });

  it('stays dismissed for the session, across a remount', async () => {
    const first = await mount();
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss for now' }));
    expect(screen.queryByRole('region', { name: 'Setup' })).not.toBeInTheDocument();
    first.unmount();
    const { container } = await mount();
    expect(container).toBeEmptyDOMElement();
  });

  it('comes back when something else goes missing after it was dismissed', async () => {
    getSetup.mockResolvedValue([LATEX, { ...AI, state: 'ok' }]);
    const first = await mount();
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss for now' }));
    first.unmount();
    getSetup.mockResolvedValue([LATEX, AI]);
    await mount();
    expect(within(screen.getByRole('region', { name: 'Setup' })).getByText('An AI to answer with')).toBeInTheDocument();
  });

  it('still dismisses when the browser refuses session storage', async () => {
    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked'); });
    await mount();
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss for now' }));
    expect(screen.queryByRole('region', { name: 'Setup' })).not.toBeInTheDocument();
    setItem.mockRestore();
  });
});
