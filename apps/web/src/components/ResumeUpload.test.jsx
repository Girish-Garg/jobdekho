import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ResumeUpload from './ResumeUpload.jsx';

vi.mock('../api.js', () => ({
  uploadResume: vi.fn(async () => ({ resumeName: 'cv.pdf' })),
}));

import { uploadResume } from '../api.js';

const pdf = () => new File(['%PDF'], 'cv.pdf', { type: 'application/pdf' });
const pick = (file) =>
  fireEvent.change(screen.getByLabelText(/resume \(pdf\)/i), { target: { files: [file] } });

beforeEach(() => vi.clearAllMocks());

describe('ResumeUpload', () => {
  it('is a real labelled file input, not a bare drop target', () => {
    render(<ResumeUpload resumeName={null} onUploaded={() => {}} />);
    expect(screen.getByLabelText(/resume \(pdf\)/i)).toHaveAttribute('type', 'file');
  });

  it('shows progress while the upload is in flight', async () => {
    let resolve;
    uploadResume.mockReturnValueOnce(new Promise((r) => { resolve = r; }));
    render(<ResumeUpload resumeName={null} onUploaded={() => {}} />);

    pick(pdf());
    expect(await screen.findByText('Reading your resume...')).toBeInTheDocument();

    resolve({ resumeName: 'cv.pdf' });
    await waitFor(() =>
      expect(screen.queryByText('Reading your resume...')).not.toBeInTheDocument(),
    );
  });

  it('hands the saved profile up on success', async () => {
    const onUploaded = vi.fn();
    render(<ResumeUpload resumeName={null} onUploaded={onUploaded} />);
    const file = pdf();
    pick(file);
    await waitFor(() => expect(uploadResume).toHaveBeenCalledWith(file));
    expect(onUploaded).toHaveBeenCalledWith({ resumeName: 'cv.pdf' });
  });

  it('shows the 422 message verbatim rather than a generic failure', async () => {
    uploadResume.mockRejectedValueOnce(
      new Error('This PDF looks scanned. Export a text copy and retry.'),
    );
    render(<ResumeUpload resumeName={null} onUploaded={() => {}} />);
    pick(pdf());
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'This PDF looks scanned. Export a text copy and retry.',
    );
  });

  it('names the resume already on file', () => {
    render(<ResumeUpload resumeName="girish.pdf" onUploaded={() => {}} />);
    expect(screen.getByText('girish.pdf')).toBeInTheDocument();
  });

  it('offers Replace as a second label for the same input once a file is on file', () => {
    render(<ResumeUpload resumeName="girish.pdf" onUploaded={() => {}} />);
    const input = screen.getByLabelText(/resume \(pdf\)/i);
    expect(screen.getByText('Replace').closest('label')).toHaveAttribute('for', input.id);
    expect(screen.queryByText(/drop a pdf/i)).not.toBeInTheDocument();
  });

  it('is not a dashed dropzone: a bordered panel card with the fill-in control inside it', () => {
    render(
      <ResumeUpload resumeName="girish.pdf" onUploaded={() => {}}>
        <button type="button">Fill in from resume</button>
      </ResumeUpload>,
    );
    const card = screen.getByText('girish.pdf').closest('.card-panel');
    expect(card).not.toHaveClass('border-dashed');
    expect(card).toContainElement(screen.getByRole('button', { name: 'Fill in from resume' }));
  });

  it('uploads a file dropped onto the control', async () => {
    render(<ResumeUpload resumeName={null} onUploaded={() => {}} />);
    const zone = screen.getByText(/drop a pdf/i).closest('label');
    fireEvent.drop(zone, { dataTransfer: { files: [pdf()] } });
    await waitFor(() => expect(uploadResume).toHaveBeenCalled());
  });
});
