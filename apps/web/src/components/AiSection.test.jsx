import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import AiSection, { ACTIONS } from './AiSection.jsx';
import FakeCheck from './FakeCheck.jsx';

vi.mock('../api.js', () => ({
  getProviders: vi.fn(async () => [CLAUDE]),
  getPostingAiResults: vi.fn(async () => []),
  runPostingAction: vi.fn(),
}));

import { getProviders } from '../api.js';

const CLAUDE = { id: 'claude', label: 'Claude Code', install: 'https://claude.ai/code', present: true, runs: true, error: null };
const MISSING = { ...CLAUDE, present: false, runs: false };
const POSTING = { id: 'p1', title: 'Frontend Intern', company: 'Acme' };

beforeEach(() => {
  vi.clearAllMocks();
  getProviders.mockResolvedValue([CLAUDE]);
});

describe('AiSection', () => {
  it('offers the fake check under the AI label once a CLI is found', async () => {
    render(<AiSection posting={POSTING} />);
    expect(screen.getByText('AI')).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: 'Is this job real?' })).toBeInTheDocument();
  });

  it('shows one install hint for the whole section when no CLI can answer', async () => {
    getProviders.mockResolvedValue([MISSING]);
    render(<AiSection posting={POSTING} />);
    expect(await screen.findByText(/the actions here ask an ai cli/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Is this job real?' })).not.toBeInTheDocument();
  });

  it('renders nothing at all when every action it has is placed elsewhere', () => {
    const { container } = render(<AiSection posting={POSTING} skip={ACTIONS} />);
    expect(container).toBeEmptyDOMElement();
    expect(getProviders).not.toHaveBeenCalled();
  });

  it('lists the fake check as an action', () => {
    expect(ACTIONS).toContain(FakeCheck);
  });
});
