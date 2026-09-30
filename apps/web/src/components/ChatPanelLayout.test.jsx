import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import AiChatPanel from './AiChatPanel.jsx';
import { announceOpenPosting } from '../lib/openPostingSignal.js';
import { readLayout } from '../lib/chatLayout.js';

vi.mock('../api.js', () => ({
  getProviders: vi.fn(async () => []),
  getProviderPreference: vi.fn(async () => ({ provider: 'auto' })),
  getChatPending: vi.fn(async () => ({ pending: null, failed: null })),
  getChatHistory: vi.fn(async () => ({ turns: [] })),
  sendChatMessage: vi.fn(),
  startNewConversation: vi.fn(async () => ({ id: 'c-new', turns: [], filed: null })),
  getPostingAiResults: vi.fn(async () => []),
  runPostingAction: vi.fn(),
}));

function windowOf({ wide, width = 1440 }) {
  window.matchMedia = vi.fn(() => ({ matches: wide, addEventListener() {}, removeEventListener() {} }));
  window.innerWidth = width;
}

function setup() {
  render(<AiChatPanel open onClose={() => {}} context={{ filters: {}, sort: 'match', page: 'postings' }} apply={{}} />);
  return screen.getByRole('complementary', { name: 'Ask AI' });
}

beforeEach(() => {
  localStorage.clear();
  announceOpenPosting(null);
});

afterEach(() => {
  delete window.matchMedia;
  window.innerWidth = 1024;
});

describe('the chat panel\'s place on a wide window', () => {
  // The chat is about what is on the page, so by default the page makes
  // room for it rather than hiding under it.
  it('is pinned beside the page by default, at the default width', () => {
    windowOf({ wide: true });
    const panel = setup();
    expect(panel).toHaveAttribute('data-mode', 'pinned');
    expect(panel.className).not.toMatch(/\babsolute\b/);
    expect(panel.className).toMatch(/\bshrink-0\b/);
    expect(panel.style.width).toBe('380px');
  });

  it('floats over the page as an inset card, and pins again, remembering each', () => {
    windowOf({ wide: true });
    const panel = setup();
    fireEvent.click(screen.getByRole('button', { name: 'Float over the page' }));
    expect(panel).toHaveAttribute('data-mode', 'floating');
    expect(panel.className).toMatch(/\babsolute\b/);
    // An inset card, the mirror of the job pane on the right.
    expect(panel.className.split(' ')).toEqual(expect.arrayContaining(['left-3', 'top-3', 'bottom-3', 'rounded-2xl']));
    expect(readLayout().pinned).toBe(false);
    fireEvent.click(screen.getByRole('button', { name: 'Pin to the side' }));
    expect(panel).toHaveAttribute('data-mode', 'pinned');
    expect(readLayout().pinned).toBe(true);
  });

  it('opens pinned when it was pinned before', () => {
    localStorage.setItem('jobdekho-chat-layout', JSON.stringify({ pinned: true, width: 450 }));
    windowOf({ wide: true });
    const panel = setup();
    expect(panel).toHaveAttribute('data-mode', 'pinned');
    expect(panel.style.width).toBe('450px');
  });

  it('widens from its edge with the keyboard, and keeps the width', () => {
    windowOf({ wide: true });
    const panel = setup();
    const edge = screen.getByRole('separator', { name: 'Resize the chat' });
    fireEvent.keyDown(edge, { key: 'ArrowRight' });
    fireEvent.keyDown(edge, { key: 'ArrowRight' });
    expect(panel.style.width).toBe('412px');
    expect(edge).toHaveAttribute('aria-valuenow', '412');
    expect(readLayout().width).toBe(412);
    fireEvent.keyDown(edge, { key: 'End' });
    expect(panel.style.width).toBe('720px');
  });
});

describe('the chat panel on a narrow window', () => {
  it('covers the page at full width, with nothing to pin or drag, whatever was saved', () => {
    localStorage.setItem('jobdekho-chat-layout', JSON.stringify({ pinned: true, width: 600 }));
    windowOf({ wide: false, width: 900 });
    const panel = setup();
    expect(panel).toHaveAttribute('data-mode', 'narrow');
    expect(panel.className).toMatch(/\bw-full\b/);
    expect(panel.style.width).toBe('');
    expect(screen.queryByRole('separator')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Pin to the side' })).not.toBeInTheDocument();
  });
});
