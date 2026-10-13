import { StrictMode } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import ResumeWorkspace from './ResumeWorkspace.jsx';
import { currentOpenDocument } from '../lib/openDocumentSignal.js';
import { requestOpenReview } from '../lib/openReviewSignal.js';
import { NO_CHOICES } from '../lib/tailorReview.js';

vi.mock('../api.js', () => ({
  listDocuments: vi.fn(), getDocumentTemplates: vi.fn(), getDocument: vi.fn(), compileDocument: vi.fn(), createDocument: vi.fn(),
  saveDocument: vi.fn(), revertDocument: vi.fn(), deleteDocument: vi.fn(),
  getTailorReview: vi.fn(), getTailorFit: vi.fn(), tailorPreview: vi.fn(), putTailorChoices: vi.fn(),
}));

import { listDocuments, getDocumentTemplates, getDocument, compileDocument, createDocument, getTailorReview, getTailorFit, tailorPreview } from '../api.js';

const JOB = { id: 'p1', title: 'Backend Engineer', company: 'Acme Systems' };
const REVIEW = {
  posting: JOB, createdAt: '2026-10-13T00:00:00.000Z', choices: NO_CHOICES, factCheck: { flags: [], ok: true }, coverage: null,
  skills: [{ name: 'Kotlin', leftOut: true, asked: false }], sections: [],
};
const TEX = '\\documentclass{article}\n\\begin{document}\nHi\n\\end{document}\n';
const doc = (id, name) => ({ id, name, kind: 'resume', tex: TEX, updatedAt: new Date().toISOString(), versions: [{ at: '2026-10-13T10:00:00.000Z', by: 'template' }] });
const D1 = doc('d1', 'Classic resume');
const MADE = doc('d7', 'Resume for Backend Engineer at Acme Systems');
const summary = ({ tex, versions, ...rest }) => rest;

// The review's code is fetched the first time one opens, which takes a
// moment longer than a query waits by default.
const review = () => screen.findByRole('region', { name: 'Skills' }, { timeout: 5000 });

beforeEach(() => {
  vi.clearAllMocks();
  URL.createObjectURL = vi.fn(() => 'blob:pdf');
  URL.revokeObjectURL = vi.fn();
  getDocumentTemplates.mockResolvedValue([]);
  listDocuments.mockResolvedValue([summary(D1)]);
  getDocument.mockImplementation(async (id) => ({ d1: D1, d7: MADE })[id]);
  compileDocument.mockResolvedValue(new Blob(['%PDF']));
  getTailorReview.mockResolvedValue(REVIEW);
  getTailorFit.mockResolvedValue({ cuts: [], enough: null });
  tailorPreview.mockResolvedValue(new Blob(['%PDF']));
});

describe('a tailoring review on the Resume page', () => {
  it('takes the page over when the chat asked for it before the page was there', async () => {
    requestOpenReview(JOB);
    render(<ResumeWorkspace />);
    expect(await review()).toBeInTheDocument();
    expect(screen.getByText('Backend Engineer at Acme Systems')).toBeInTheDocument();
    expect(screen.queryByRole('navigation', { name: 'Your documents' })).not.toBeInTheDocument();
    expect(getTailorReview).toHaveBeenCalledWith('p1');
    // No document is open to the chat while the review covers the page.
    await waitFor(() => expect(currentOpenDocument()).toBeNull());
  });

  // Found by hand in the dev build, where React mounts twice: the request
  // was taken on the first pass and gone by the one that drew.
  it('opens under strict mode, and not again on a later visit', async () => {
    requestOpenReview(JOB);
    const first = render(<StrictMode><ResumeWorkspace /></StrictMode>);
    expect(await review()).toBeInTheDocument();
    first.unmount();
    render(<StrictMode><ResumeWorkspace /></StrictMode>);
    expect(await screen.findByRole('navigation', { name: 'Your documents' })).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Skills' })).not.toBeInTheDocument();
  });

  it('opens when asked for while the page is up, and gives the page back on close', async () => {
    render(<ResumeWorkspace />);
    await screen.findByRole('navigation', { name: 'Your documents' });
    act(() => requestOpenReview(JOB));
    expect(await review()).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Close the review' }));
    expect(await screen.findByRole('navigation', { name: 'Your documents' })).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Skills' })).not.toBeInTheDocument();
  });

  it('opens the resume made from it like any other document', async () => {
    createDocument.mockResolvedValue(MADE);
    requestOpenReview(JOB);
    render(<ResumeWorkspace />);
    await review();
    listDocuments.mockResolvedValue([summary(MADE), summary(D1)]);
    fireEvent.click(screen.getByRole('button', { name: 'Make the resume' }));
    expect(await screen.findByRole('navigation', { name: 'Your documents' })).toBeInTheDocument();
    expect(createDocument).toHaveBeenCalledWith({ kind: 'resume', templateId: 'classic', postingId: 'p1', fromPlan: true });
    await waitFor(() => expect(currentOpenDocument()).toMatchObject({ id: 'd7' }));
    expect(screen.queryByRole('region', { name: 'Skills' })).not.toBeInTheDocument();
  });
});
