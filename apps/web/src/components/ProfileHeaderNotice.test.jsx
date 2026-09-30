import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import ResumeWorkspace from './ResumeWorkspace.jsx';

vi.mock('../api.js', () => ({
  listDocuments: vi.fn(),
  getDocumentTemplates: vi.fn(),
  getDocument: vi.fn(),
  compileDocument: vi.fn(),
  createDocument: vi.fn(),
  saveDocument: vi.fn(),
  revertDocument: vi.fn(),
  deleteDocument: vi.fn(),
  documentProfileHeader: vi.fn(),
}));
vi.mock('../lib/toast.js', () => ({ notifyError: vi.fn() }));

import { listDocuments, getDocumentTemplates, getDocument, compileDocument, documentProfileHeader } from '../api.js';
import { notifyError } from '../lib/toast.js';

const OLD_HEADER = '\\resHeader{Asha Rao}{Backend Engineer}{Pune | demo@example.com}';
const NEW_HEADER = '\\resHeader{Asha Menon}{Backend Engineer}{Pune | asha@example.com}';
const TEX = `\\documentclass{article}\n\\begin{document}\n${OLD_HEADER}\nHi\n\\end{document}\n`;
const NEW_TEX = TEX.replace(OLD_HEADER, NEW_HEADER);
const VERSIONS = [{ at: '2026-09-29T10:00:00.000Z', by: 'template' }];
const D1 = {
  id: 'd1', name: 'Classic resume', kind: 'resume', tex: TEX, updatedAt: '2026-09-29T10:00:00.000Z', versions: VERSIONS,
  profileHeader: { fields: ['Name', 'Contact line'] },
};
const summary = ({ tex, versions, profileHeader, ...rest }) => rest;

beforeEach(() => {
  vi.clearAllMocks();
  URL.createObjectURL = vi.fn(() => 'blob:pdf');
  URL.revokeObjectURL = vi.fn();
  getDocumentTemplates.mockResolvedValue([]);
  listDocuments.mockResolvedValue([summary(D1)]);
  getDocument.mockResolvedValue(D1);
  compileDocument.mockResolvedValue(new Blob(['%PDF']));
});

const notice = () => screen.findByRole('region', { name: 'Header from your profile' });

describe('the header from the profile', () => {
  it('names what changed in the profile since the document was made', async () => {
    render(<ResumeWorkspace />);
    expect(await notice()).toHaveTextContent('Your profile has a different name and contact line from this document.');
    expect(screen.getByRole('button', { name: 'Update from profile' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Keep this one' })).toBeInTheDocument();
  });

  it('shows nothing when the header matches the profile', async () => {
    getDocument.mockResolvedValue({ ...D1, profileHeader: null });
    render(<ResumeWorkspace />);
    expect(await screen.findByTitle('PDF preview')).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Header from your profile' })).not.toBeInTheDocument();
  });

  it('keeps the document\'s header when asked, and the notice goes', async () => {
    render(<ResumeWorkspace />);
    await notice();
    documentProfileHeader.mockResolvedValue({ ...D1, profileHeader: null });
    fireEvent.click(screen.getByRole('button', { name: 'Keep this one' }));
    await waitFor(() => expect(documentProfileHeader).toHaveBeenCalledWith('d1', 'keep'));
    await waitFor(() => expect(screen.queryByRole('region', { name: 'Header from your profile' })).not.toBeInTheDocument());
    expect(compileDocument).toHaveBeenCalledTimes(1);
  });

  it('shows the change as a diff first, and saves it only on Apply, recompiling what was saved', async () => {
    render(<ResumeWorkspace />);
    await notice();
    documentProfileHeader.mockResolvedValueOnce({ fields: ['Name', 'Contact line'], tex: NEW_TEX });
    fireEvent.click(screen.getByRole('button', { name: 'Update from profile' }));
    const diff = await screen.findByRole('group', { name: 'Changes to the source' });
    expect(documentProfileHeader).toHaveBeenCalledWith('d1', 'preview');
    expect(within(diff).getByText(OLD_HEADER).closest('[data-op]')).toHaveAttribute('data-op', 'del');
    expect(within(diff).getByText(NEW_HEADER).closest('[data-op]')).toHaveAttribute('data-op', 'add');
    expect(screen.queryByRole('button', { name: 'Keep this one' })).not.toBeInTheDocument();

    const versions = [...VERSIONS, { at: '2026-09-30T10:00:00.000Z', by: 'profile' }];
    documentProfileHeader.mockResolvedValueOnce({ ...D1, tex: NEW_TEX, versions, profileHeader: null });
    fireEvent.click(screen.getByRole('button', { name: 'Apply' }));
    await waitFor(() => expect(documentProfileHeader).toHaveBeenLastCalledWith('d1', 'apply'));
    await waitFor(() => expect(screen.queryByRole('region', { name: 'Header from your profile' })).not.toBeInTheDocument());
    await waitFor(() => expect(compileDocument).toHaveBeenCalledTimes(2));
    fireEvent.click(screen.getByRole('button', { name: /Versions/ }));
    expect(within(screen.getByRole('dialog', { name: 'Versions' })).getByText('Header from your profile')).toBeInTheDocument();
  });

  it('never drops unsaved edits in the source: they turn stale, as after a chat change', async () => {
    render(<ResumeWorkspace />);
    await notice();
    fireEvent.click(screen.getByRole('button', { name: 'Source' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'LaTeX source' }), { target: { value: `${TEX}% mine\n` } });
    documentProfileHeader.mockResolvedValueOnce({ fields: ['Name'], tex: NEW_TEX });
    fireEvent.click(screen.getByRole('button', { name: 'Update from profile' }));
    await screen.findByRole('group', { name: 'Changes to the source' });
    documentProfileHeader.mockResolvedValueOnce({ ...D1, tex: NEW_TEX, profileHeader: null });
    fireEvent.click(screen.getByRole('button', { name: 'Apply' }));
    expect(await screen.findByText('This document changed while you were editing')).toBeInTheDocument();
    expect(screen.getByText(/the header from your profile was applied/)).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'LaTeX source' })).toHaveValue(`${TEX}% mine\n`);
  });

  it('closes the diff on Cancel without saving anything', async () => {
    render(<ResumeWorkspace />);
    await notice();
    documentProfileHeader.mockResolvedValueOnce({ fields: ['Name'], tex: NEW_TEX });
    fireEvent.click(screen.getByRole('button', { name: 'Update from profile' }));
    await screen.findByRole('group', { name: 'Changes to the source' });
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('group', { name: 'Changes to the source' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Update from profile' })).toBeInTheDocument();
    expect(documentProfileHeader).toHaveBeenCalledTimes(1);
  });

  it('says why a call failed, and leaves the notice up', async () => {
    render(<ResumeWorkspace />);
    await notice();
    const refusal = new Error('Nothing to update: the header already matches your profile.');
    documentProfileHeader.mockRejectedValueOnce(refusal);
    fireEvent.click(screen.getByRole('button', { name: 'Update from profile' }));
    await waitFor(() => expect(notifyError).toHaveBeenCalledWith(refusal, 'Could not read the header from your profile'));
    expect(await notice()).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Update from profile' })).toBeEnabled();
  });
});
