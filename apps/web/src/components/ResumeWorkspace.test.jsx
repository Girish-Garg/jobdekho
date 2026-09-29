import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within, act } from '@testing-library/react';
import ResumeWorkspace from './ResumeWorkspace.jsx';
import { currentOpenDocument } from '../lib/openDocumentSignal.js';
import { announceApplied } from '../lib/proposalAppliedSignal.js';

vi.mock('../api.js', () => ({
  listDocuments: vi.fn(),
  getDocumentTemplates: vi.fn(),
  getDocument: vi.fn(),
  compileDocument: vi.fn(),
  createDocument: vi.fn(),
  saveDocument: vi.fn(),
  revertDocument: vi.fn(),
  deleteDocument: vi.fn(),
}));
vi.mock('../lib/downloadText.js', () => ({ downloadText: vi.fn() }));

import {
  listDocuments, getDocumentTemplates, getDocument, compileDocument, createDocument, saveDocument, revertDocument, deleteDocument,
} from '../api.js';
import { downloadText } from '../lib/downloadText.js';

const TEMPLATES = [
  { id: 'classic', name: 'Classic', description: 'One-column serif.', kind: 'resume' },
  { id: 'compact', name: 'Compact', description: 'Tighter sans.', kind: 'resume' },
  { id: 'academic', name: 'Academic', description: 'Formal serif.', kind: 'resume' },
  { id: 'letter', name: 'Letter', description: 'A plain letter.', kind: 'cover-letter' },
];
const TEX = '\\documentclass{article}\n\\begin{document}\nHi\n\\end{document}\n';
const doc = (id, name, kind = 'resume', over = {}) => ({
  id, name, kind, tex: TEX, updatedAt: new Date().toISOString(),
  versions: [{ at: '2026-09-29T10:00:00.000Z', by: 'template' }, { at: '2026-09-30T10:00:00.000Z', by: 'ai' }], ...over,
});
const D1 = doc('d1', 'Classic resume');
const D2 = doc('d2', 'Cover letter for Acme', 'cover-letter');
const summary = ({ tex, versions, ...rest }) => rest;
const refusal = (message, kind, problems) => Object.assign(new Error(message), { kind, problems });

beforeEach(() => {
  vi.clearAllMocks();
  URL.createObjectURL = vi.fn(() => 'blob:pdf');
  URL.revokeObjectURL = vi.fn();
  getDocumentTemplates.mockResolvedValue(TEMPLATES);
  listDocuments.mockResolvedValue([summary(D1), summary(D2)]);
  getDocument.mockImplementation(async (id) => ({ d1: D1, d2: D2 })[id]);
  compileDocument.mockResolvedValue(new Blob(['%PDF']));
});

const preview = () => screen.findByTitle('PDF preview');

describe('ResumeWorkspace', () => {
  it('lists resumes and letters, opens the newest compiled, and tells the chat which is open', async () => {
    render(<ResumeWorkspace />);
    const list = await screen.findByRole('navigation', { name: 'Your documents' });
    expect(within(list).getByText('Resumes')).toBeInTheDocument();
    expect(within(list).getByText('Cover letters')).toBeInTheDocument();
    expect(await preview()).toHaveAttribute('src', expect.stringMatching(/^blob:pdf#/));
    expect(within(list).getByRole('button', { name: /Classic resume/ })).toHaveAttribute('aria-current', 'true');
    expect(currentOpenDocument()).toEqual({ id: 'd1', name: 'Classic resume', kind: 'resume' });
    fireEvent.click(within(list).getByRole('button', { name: /Cover letter for Acme/ }));
    await waitFor(() => expect(compileDocument).toHaveBeenCalledWith('d2'));
    expect(currentOpenDocument().id).toBe('d2');
  });

  it('has no template radios, include boxes or move arrows anywhere', async () => {
    render(<ResumeWorkspace />);
    await preview();
    expect(screen.queryAllByRole('radio')).toHaveLength(0);
    expect(screen.queryAllByRole('checkbox')).toHaveLength(0);
    expect(screen.queryByRole('button', { name: /Move (up|down)/ })).not.toBeInTheDocument();
  });

  it('offers every template when there is nothing yet, and opens what it made', async () => {
    listDocuments.mockResolvedValueOnce([]);
    render(<ResumeWorkspace />);
    expect(await screen.findByRole('heading', { name: 'Your resumes and cover letters' })).toBeInTheDocument();
    const letter = await screen.findByRole('button', { name: /Letter/ });
    expect(screen.getByRole('button', { name: /Academic/ })).toBeInTheDocument();
    createDocument.mockResolvedValue({ id: 'd2' });
    listDocuments.mockResolvedValue([summary(D2)]);
    fireEvent.click(letter);
    await waitFor(() => expect(createDocument).toHaveBeenCalledWith({ kind: 'cover-letter', templateId: 'letter' }));
    expect(await preview()).toBeInTheDocument();
    expect(compileDocument).toHaveBeenCalledWith('d2');
  });

  it('starts a new document from the New menu', async () => {
    render(<ResumeWorkspace />);
    await preview();
    fireEvent.click(screen.getByRole('button', { name: 'New' }));
    const menu = screen.getByRole('dialog', { name: 'Start a new document' });
    createDocument.mockResolvedValue({ id: 'd3' });
    listDocuments.mockResolvedValue([{ ...summary(D1), id: 'd3', name: 'Compact resume' }, summary(D1), summary(D2)]);
    getDocument.mockImplementation(async (id) => (id === 'd3' ? doc('d3', 'Compact resume') : D1));
    fireEvent.click(within(menu).getByRole('button', { name: /Compact/ }));
    await waitFor(() => expect(createDocument).toHaveBeenCalledWith({ kind: 'resume', templateId: 'compact' }));
    await waitFor(() => expect(currentOpenDocument()?.id).toBe('d3'));
  });

  it('shows the guard\'s refusal with its lines, and takes the person to the source', async () => {
    compileDocument.mockRejectedValue(refusal('This document uses LaTeX that JobDekho does not allow.', 'unsafe', ['\\input is not allowed']));
    render(<ResumeWorkspace />);
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('The LaTeX guard refused this source');
    expect(alert).toHaveTextContent('\\input is not allowed');
    fireEvent.click(screen.getByRole('button', { name: 'Open the source' }));
    expect(screen.getByRole('textbox', { name: 'LaTeX source' })).toHaveValue(TEX);
  });

  it('explains installing MiKTeX when there is no LaTeX, and tries again on request', async () => {
    compileDocument.mockRejectedValueOnce(refusal('No LaTeX installation was found on this computer.', 'not_found'));
    render(<ResumeWorkspace />);
    const card = await screen.findByRole('alert', { name: 'LaTeX is not installed on this computer' });
    expect(within(card).getByRole('link', { name: 'Get MiKTeX' })).toHaveAttribute('href', 'https://miktex.org/download');
    fireEvent.click(within(card).getByRole('button', { name: 'Try again' }));
    expect(await preview()).toBeInTheDocument();
  });

  it('says why a compile failed, in the server\'s words', async () => {
    compileDocument.mockRejectedValue(refusal('The document did not compile: line 12, Undefined control sequence.', 'compile_failed'));
    render(<ResumeWorkspace />);
    expect(await screen.findByRole('alert', { name: 'The document did not compile' })).toHaveTextContent('line 12, Undefined control sequence.');
  });

  it('saves a hand edit as a new version, recompiles, and shows what the guard refused in the source view', async () => {
    render(<ResumeWorkspace />);
    await preview();
    fireEvent.click(screen.getByRole('button', { name: 'Source' }));
    const box = screen.getByRole('textbox', { name: 'LaTeX source' });
    const edited = TEX.replace('Hi', 'Hi\\input{x}');
    fireEvent.change(box, { target: { value: edited } });
    saveDocument.mockResolvedValue({ ...D1, tex: edited });
    compileDocument.mockRejectedValueOnce(refusal('This document uses LaTeX that JobDekho does not allow.', 'unsafe', ['\\input is not allowed']));
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(saveDocument).toHaveBeenCalledWith('d1', { tex: edited }));
    expect(await screen.findByRole('alert')).toHaveTextContent('\\input is not allowed');
    expect(screen.getByRole('textbox', { name: 'LaTeX source' })).toHaveValue(edited);
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
  });

  it('lists versions with who wrote them, and restores an older one', async () => {
    render(<ResumeWorkspace />);
    await preview();
    fireEvent.click(screen.getByRole('button', { name: /Versions/ }));
    const panel = screen.getByRole('dialog', { name: 'Versions' });
    expect(within(panel).getByText('Chat change you applied')).toBeInTheDocument();
    expect(within(panel).getByText('Current')).toBeInTheDocument();
    revertDocument.mockResolvedValue({ ...D1, tex: 'old', versions: [...D1.versions, { at: '2026-09-30T11:00:00.000Z', by: 'you', restoredFrom: D1.versions[0].at }] });
    fireEvent.click(within(panel).getByRole('button', { name: 'Restore' }));
    await waitFor(() => expect(revertDocument).toHaveBeenCalledWith('d1', '2026-09-29T10:00:00.000Z'));
    expect(await within(panel).findByText(/^Restored from/)).toBeInTheDocument();
  });

  it('renames in place and downloads the saved source', async () => {
    render(<ResumeWorkspace />);
    await preview();
    fireEvent.click(screen.getByRole('button', { name: 'Rename Classic resume' }));
    const name = screen.getByRole('textbox', { name: 'Document name' });
    saveDocument.mockResolvedValue({ ...D1, name: 'Backend resume' });
    fireEvent.change(name, { target: { value: 'Backend resume' } });
    fireEvent.keyDown(name, { key: 'Enter' });
    fireEvent.blur(name);
    await waitFor(() => expect(saveDocument).toHaveBeenCalledWith('d1', { tex: TEX, name: 'Backend resume' }));
    expect(saveDocument).toHaveBeenCalledTimes(1);
    fireEvent.click(await screen.findByRole('button', { name: 'Download .tex' }));
    expect(downloadText).toHaveBeenCalledWith('Backend-resume.tex', TEX);
  });

  it('deletes only after asking, then opens the next document', async () => {
    render(<ResumeWorkspace />);
    await preview();
    fireEvent.click(screen.getByRole('button', { name: 'Delete this document' }));
    const ask = screen.getByRole('dialog', { name: 'Delete this document?' });
    expect(deleteDocument).not.toHaveBeenCalled();
    deleteDocument.mockResolvedValue(null);
    listDocuments.mockResolvedValue([summary(D2)]);
    fireEvent.click(within(ask).getByRole('button', { name: 'Delete it' }));
    await waitFor(() => expect(deleteDocument).toHaveBeenCalledWith('d1'));
    await waitFor(() => expect(currentOpenDocument()?.id).toBe('d2'));
  });

  it('recompiles when a chat change is applied to the open document', async () => {
    render(<ResumeWorkspace />);
    await preview();
    expect(compileDocument).toHaveBeenCalledTimes(1);
    act(() => announceApplied({ kind: 'document', document: { ...D1, tex: `${TEX}% shorter\n` } }));
    await waitFor(() => expect(compileDocument).toHaveBeenCalledTimes(2));
  });
});
