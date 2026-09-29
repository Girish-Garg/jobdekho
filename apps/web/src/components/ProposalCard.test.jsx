import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within, waitFor } from '@testing-library/react';
import ProposalCard from './ProposalCard.jsx';
import { proposalsOf } from '../lib/proposalShape.js';
import { onApplied } from '../lib/proposalAppliedSignal.js';

vi.mock('../api.js', () => ({ applyProposal: vi.fn(), discardProposal: vi.fn(), getDocument: vi.fn() }));

import { applyProposal, discardProposal, getDocument } from '../api.js';

const PROFILE = {
  id: 'p1', kind: 'profile', summary: 'Add the Go CLI project', status: 'pending',
  diff: [
    { label: 'Projects: add', before: '', after: 'CLI tool (2024): Go\n- Built a command line tool' },
    { label: 'Headline', before: 'Backend engineer', after: 'Backend engineer, Go' },
  ],
};
const TEX = '\\documentclass{article}\n\\begin{document}\nOld line\nSame line\n\\end{document}\n';
const NEW_TEX = '\\documentclass{article}\n\\begin{document}\nNew line\nSame line\n\\end{document}\n';
const DOCUMENT = {
  id: 'p2', kind: 'document', summary: 'Fit it to one page', status: 'pending', documentId: 'd1', documentKind: 'resume',
  name: 'Classic resume', tex: NEW_TEX, baseAt: '2026-09-30T09:00:00.000Z', factFlags: [], problems: [],
};
const card = (raw) => render(<ProposalCard proposal={proposalsOf({ proposals: [raw] })[0]} />);
const refused = (message, extra = {}) => Object.assign(new Error(message), extra);

beforeEach(() => vi.clearAllMocks());

describe('a profile proposal card', () => {
  it('names the change and shows each row as removed and added lines, with Apply and Discard', () => {
    card(PROFILE);
    const region = screen.getByRole('region', { name: 'Profile change: Add the Go CLI project' });
    expect(within(region).getByText('Waiting for you')).toBeInTheDocument();
    expect(within(region).getByText('Built a command line tool')).toBeInTheDocument();
    const headline = within(region).getByText('Headline').parentElement;
    expect(headline.querySelector('[data-change="remove"]')).toHaveTextContent('Removed: Backend engineer');
    expect(headline.querySelector('[data-change="add"]')).toHaveTextContent('Added: Backend engineer, Go');
    expect(within(region).getByRole('button', { name: 'Apply' })).toBeEnabled();
    expect(within(region).getByText('Nothing changes until you apply.')).toBeInTheDocument();
  });

  it('turns to Applied, with the time, and hands the saved record to the page', async () => {
    const heard = vi.fn();
    const stop = onApplied(heard);
    applyProposal.mockResolvedValue({ proposal: { id: 'p1', status: 'applied', appliedAt: new Date(2026, 8, 30, 14, 5).toISOString() }, profile: { skills: ['go'] } });
    card(PROFILE);
    fireEvent.click(screen.getByRole('button', { name: 'Apply' }));
    expect(await screen.findByText('Applied 30 Sep, 2:05 pm')).toBeInTheDocument();
    stop();
    expect(screen.queryByRole('button', { name: 'Apply' })).not.toBeInTheDocument();
    expect(heard).toHaveBeenCalledWith({ kind: 'profile', profile: { skills: ['go'] } });
  });

  it('reads as applied after a reload, from the saved status', () => {
    card({ ...PROFILE, status: 'applied', appliedAt: new Date(2026, 8, 29, 9, 30).toISOString() });
    expect(screen.getByText('Applied 29 Sep, 9:30 am')).toBeInTheDocument();
    expect(screen.getByRole('region')).toHaveAttribute('data-status', 'applied');
  });

  it('greys out once discarded, and says nothing changed', async () => {
    discardProposal.mockResolvedValue(null);
    card(PROFILE);
    fireEvent.click(screen.getByRole('button', { name: 'Discard' }));
    expect(await screen.findByText('Discarded. Nothing was changed.')).toBeInTheDocument();
    expect(screen.getByRole('region')).toHaveAttribute('data-status', 'discarded');
  });

  it('says why the server refused, verbatim, and keeps the buttons', async () => {
    applyProposal.mockRejectedValue(refused('The headline was edited after this was proposed. Nothing was applied.', { status: 409 }));
    card(PROFILE);
    fireEvent.click(screen.getByRole('button', { name: 'Apply' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('The headline was edited after this was proposed. Nothing was applied.');
    expect(screen.getByRole('button', { name: 'Apply' })).toBeEnabled();
  });
});

describe('a document proposal card', () => {
  it('names the document and lists what the profile does not say, quietly', () => {
    card({ ...DOCUMENT, factFlags: ['40%', 'Kubernetes'] });
    const region = screen.getByRole('region', { name: 'Resume change: Fit it to one page' });
    expect(within(region).getByText('Classic resume')).toBeInTheDocument();
    expect(within(region).getByText('Not in your profile:')).toBeInTheDocument();
    expect(within(region).getByText('Kubernetes')).toBeInTheDocument();
    expect(within(region).queryByRole('alert')).not.toBeInTheDocument();
    expect(within(region).getByRole('button', { name: 'Apply' })).toBeEnabled();
  });

  it('blocks Apply while the guard refuses the source, and lists why', () => {
    card({ ...DOCUMENT, problems: ['\\input is not allowed: it reads another file into the document.'] });
    expect(screen.getByRole('alert')).toHaveTextContent('\\input is not allowed');
    expect(screen.getByRole('button', { name: 'Apply' })).toBeDisabled();
    expect(screen.getByText('Fix the lines above first.')).toBeInTheDocument();
  });

  it('shows the source changes against the version it was written from, on demand', async () => {
    getDocument.mockResolvedValue({ id: 'd1', tex: NEW_TEX, versions: [{ at: DOCUMENT.baseAt, by: 'template', tex: TEX }, { at: 'later', by: 'ai', tex: NEW_TEX }] });
    const { container } = card(DOCUMENT);
    expect(getDocument).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'View changes' }));
    await waitFor(() => expect(container.querySelector('[data-op="del"]')).toHaveTextContent('Old line'));
    expect(getDocument).toHaveBeenCalledWith('d1', { bodies: true });
    expect(container.querySelector('[data-op="add"]')).toHaveTextContent('New line');
    expect(screen.getByText('+1')).toBeInTheDocument();
    expect(screen.getByText('-1')).toBeInTheDocument();
  });

  it('says so when the document it changes was deleted since', async () => {
    getDocument.mockRejectedValue(new Error('That document is not there any more.'));
    card(DOCUMENT);
    fireEvent.click(screen.getByRole('button', { name: 'View changes' }));
    expect(await screen.findByText(/The document it changes was deleted since/)).toBeInTheDocument();
  });

  it('shows every line as added for a new document, without reading any', async () => {
    const { container } = card({ ...DOCUMENT, documentId: null, documentKind: 'cover-letter', name: 'Letter for Acme', baseAt: null });
    expect(screen.getByRole('region', { name: 'Cover letter change: Fit it to one page' })).toBeInTheDocument();
    expect(screen.getByText('New cover letter: Letter for Acme')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'View changes' }));
    expect(container.querySelectorAll('[data-op="add"]')).toHaveLength(5);
    expect(getDocument).not.toHaveBeenCalled();
  });

  it('broadcasts the saved document once applied', async () => {
    const heard = vi.fn();
    const stop = onApplied(heard);
    applyProposal.mockResolvedValue({ proposal: { status: 'applied', appliedAt: '2026-09-30T10:00:00.000Z' }, document: { id: 'd1', tex: NEW_TEX } });
    card(DOCUMENT);
    fireEvent.click(screen.getByRole('button', { name: 'Apply' }));
    await screen.findByText(/^Applied \d/);
    stop();
    expect(heard).toHaveBeenCalledWith({ kind: 'document', document: { id: 'd1', tex: NEW_TEX } });
  });

  it('lists the guard\'s problems when the server refuses on apply', async () => {
    applyProposal.mockRejectedValue(refused('This version uses LaTeX that JobDekho does not allow, so it cannot be applied.', { status: 422, problems: ['\\write is not allowed'] }));
    card(DOCUMENT);
    fireEvent.click(screen.getByRole('button', { name: 'Apply' }));
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('so it cannot be applied');
    expect(alert).toHaveTextContent('\\write is not allowed');
  });
});
