import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ResumeBuilderOverlay from './ResumeBuilderOverlay.jsx';
import * as api from '../api.js';

const PROFILE = {
  basics: { name: 'Priya Sharma', headline: '', email: '', phone: '', location: '', links: {} },
  experience: [{ id: 'e1', title: 'Engineer', organisation: 'Acme' }],
  projects: [], education: [], certifications: [], achievements: [], skillGroups: [],
};
const PLAN = { sections: { experience: [{ id: 'e1', bullets: ['Reworded bullet.'], dropped: [] }] } };

beforeEach(() => {
  URL.createObjectURL = vi.fn(() => 'blob:jobdekho/1');
  URL.revokeObjectURL = vi.fn();
  vi.spyOn(api, 'getProfile').mockResolvedValue(PROFILE);
  vi.spyOn(api, 'getResumeTemplates').mockResolvedValue([{ id: 'classic', name: 'Classic', description: '' }]);
  vi.spyOn(api, 'getResumeSelection').mockResolvedValue({ template: 'classic', sections: {} });
  vi.spyOn(api, 'putResumeSelection').mockResolvedValue({});
  vi.spyOn(api, 'getResumePdf').mockResolvedValue(new Blob(['%PDF-fake']));
  vi.spyOn(api, 'getResumeTex').mockResolvedValue('tex source');
});

afterEach(() => vi.restoreAllMocks());

describe('ResumeBuilderOverlay', () => {
  it('names the job it was tailored for, and seeds the builder underneath with the plan', async () => {
    render(<ResumeBuilderOverlay jobTitle="Backend Engineer" plan={PLAN} onClose={() => {}} />);
    expect(screen.getByText('Backend Engineer')).toBeInTheDocument();
    expect(await screen.findByText('Classic')).toBeInTheDocument();
    await waitFor(() => expect(api.getResumePdf).toHaveBeenCalledWith(expect.objectContaining({ plan: PLAN })));
  });

  it('closes on Escape and on the close button', async () => {
    const onClose = vi.fn();
    render(<ResumeBuilderOverlay jobTitle="Backend Engineer" plan={PLAN} onClose={onClose} />);
    await screen.findByText('Classic');
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  // It opens beside the chat, which stays usable, so it is not a modal and
  // has no backdrop covering the rest of the window.
  it('sits beside the chat rather than over the whole window', async () => {
    render(<ResumeBuilderOverlay jobTitle="Backend Engineer" plan={PLAN} onClose={() => {}} />);
    await screen.findByText('Classic');
    const frame = screen.getByRole('dialog');
    expect(frame).not.toHaveAttribute('aria-modal', 'true');
    expect(frame.className).toMatch(/\babsolute\b/);
    expect(frame.className).not.toMatch(/\bfixed\b/);
  });

  // While it is open, Escape is its own: the job pane underneath would
  // otherwise close too.
  it('keeps Escape from reaching the feed underneath', async () => {
    const feed = vi.fn();
    window.addEventListener('keydown', feed);
    render(<ResumeBuilderOverlay jobTitle="Backend Engineer" plan={PLAN} onClose={() => {}} />);
    await screen.findByText('Classic');
    fireEvent.keyDown(document.body, { key: 'Escape' });
    expect(feed).not.toHaveBeenCalled();
    window.removeEventListener('keydown', feed);
  });

  it('does not close on a click inside the builder itself', async () => {
    const onClose = vi.fn();
    render(<ResumeBuilderOverlay jobTitle="Backend Engineer" plan={PLAN} onClose={onClose} />);
    fireEvent.click(await screen.findByText('Classic'));
    expect(onClose).not.toHaveBeenCalled();
  });
});
