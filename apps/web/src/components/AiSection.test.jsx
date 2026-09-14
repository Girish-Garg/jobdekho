import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import AiSection, { ACTIONS } from './AiSection.jsx';
import FakeCheck from './FakeCheck.jsx';
import CoverLetter from './CoverLetter.jsx';
import ResumeTailor from './ResumeTailor.jsx';

vi.mock('../api.js', () => ({
  getProviders: vi.fn(async () => [CLAUDE]),
  getPostingAiResults: vi.fn(async () => []),
  runPostingAction: vi.fn(),
}));

import { getProviders } from '../api.js';

const CLAUDE = { id: 'claude', label: 'Claude Code', install: 'https://claude.ai/code', policies: ['none', 'web'], present: true, runs: true, error: null };
const AGY = { id: 'agy', label: 'Antigravity', install: 'https://antigravity.google', policies: ['none'], present: true, runs: true, error: null };
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
    expect(screen.getAllByRole('button', { name: 'Check again' })).toHaveLength(1);
  });

  // The two actions that carry the resume run on Antigravity; the one with a
  // browser cannot, and its hint says so where its button would have been.
  it('offers the letter and the tailoring through Antigravity, and says the fake check needs Claude Code, when only Antigravity is installed', async () => {
    getProviders.mockResolvedValue([MISSING, AGY]);
    render(<AiSection posting={POSTING} />);
    expect(await screen.findByRole('button', { name: 'Write a cover letter' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Tailor my resume for this job' })).toBeInTheDocument();
    expect(screen.getAllByText(/to antigravity on this computer/i)).toHaveLength(2);
    expect(screen.queryByRole('button', { name: 'Is this job real?' })).not.toBeInTheDocument();
    expect(screen.getByText(/checking whether a job is real asks an ai cli/i)).toBeInTheDocument();
    expect(screen.getByText(/^Antigravity is installed, but this action needs a CLI that can browse/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'https://claude.ai/code' })).toBeInTheDocument();
  });

  it('renders nothing at all when every action it has is placed elsewhere', () => {
    const { container } = render(<AiSection posting={POSTING} skip={ACTIONS} />);
    expect(container).toBeEmptyDOMElement();
    expect(getProviders).not.toHaveBeenCalled();
  });

  it('lists the fake check as an action', () => {
    expect(ACTIONS).toContain(FakeCheck);
  });

  // The policy each action declares is what the gate resolves a CLI for, so
  // it has to match the server-side action (apps/server/src/actions).
  it('gives every action the policy and intro the gate needs, with a browser only for the fake check', () => {
    expect(FakeCheck.policy).toBe('web');
    expect(CoverLetter.policy).toBe('none');
    expect(ResumeTailor.policy).toBe('none');
    for (const Action of ACTIONS) expect(Action.intro).toMatch(/asks an AI CLI installed on this computer/);
  });
});
