import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import ResumeBuilderPreview from './ResumeBuilderPreview.jsx';
import * as api from '../api.js';

const selection = { template: 'classic', sections: {} };

// jsdom has no object URLs and no navigation; both ends of the PDF download
// are stubbed the same way lib/downloadText.test.js stubs the text one.
beforeEach(() => {
  URL.createObjectURL = vi.fn(() => 'blob:jobdekho/1');
  URL.revokeObjectURL = vi.fn();
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
});

afterEach(() => vi.restoreAllMocks());

describe('ResumeBuilderPreview', () => {
  it('shows the compiled PDF in an iframe once it comes back', async () => {
    vi.spyOn(api, 'getResumePdf').mockResolvedValue(new Blob(['%PDF-fake']));
    render(<ResumeBuilderPreview selection={selection} fileName="resume" />);
    expect(await screen.findByTitle('Resume preview')).toHaveAttribute('src', 'blob:jobdekho/1');
    expect(screen.getByRole('button', { name: 'Download PDF' })).toBeEnabled();
  });

  // The no-LaTeX case: the server's own sentence (apps/server/src/resume/errors.js)
  // is shown as written, and the .tex download - which never touches LaTeX -
  // keeps working regardless.
  it('shows the server sentence verbatim and keeps Download .tex working when the PDF fails', async () => {
    const err = new Error('No LaTeX installation was found on this computer, so the PDF could not be built.');
    err.kind = 'not_found';
    vi.spyOn(api, 'getResumePdf').mockRejectedValue(err);
    vi.spyOn(api, 'getResumeTex').mockResolvedValue('\\documentclass{article}');
    render(<ResumeBuilderPreview selection={selection} fileName="resume" />);
    expect(await screen.findByRole('alert')).toHaveTextContent('No LaTeX installation was found');
    expect(screen.queryByTitle('Resume preview')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Download PDF' })).toBeDisabled();

    screen.getByRole('button', { name: 'Download .tex' }).click();
    await waitFor(() => expect(HTMLAnchorElement.prototype.click).toHaveBeenCalled());
    expect(api.getResumeTex).toHaveBeenCalledWith(selection);
  });

  it('re-compiles when the selection changes', async () => {
    vi.spyOn(api, 'getResumePdf').mockResolvedValue(new Blob(['%PDF-fake']));
    const { rerender } = render(<ResumeBuilderPreview selection={selection} fileName="resume" />);
    await screen.findByTitle('Resume preview');
    rerender(<ResumeBuilderPreview selection={{ ...selection, template: 'compact' }} fileName="resume" />);
    await waitFor(() => expect(api.getResumePdf).toHaveBeenCalledTimes(2));
  });

  // A seeded (tailored) builder carries its plan on every compile and every
  // .tex download, so the reworded bullets follow whichever entries the
  // person still has ticked, however they have since reordered them.
  it('sends the plan along with the selection when the builder was seeded from a tailored resume', async () => {
    const plan = { sections: { experience: [{ id: 'e1', bullets: ['Reworded.'], dropped: [] }] } };
    vi.spyOn(api, 'getResumePdf').mockResolvedValue(new Blob(['%PDF-fake']));
    vi.spyOn(api, 'getResumeTex').mockResolvedValue('tex source');
    render(<ResumeBuilderPreview selection={selection} plan={plan} fileName="resume" />);
    await screen.findByTitle('Resume preview');
    expect(api.getResumePdf).toHaveBeenCalledWith({ ...selection, plan });
    screen.getByRole('button', { name: 'Download .tex' }).click();
    await waitFor(() => expect(api.getResumeTex).toHaveBeenCalledWith({ ...selection, plan }));
  });
});
