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

  it('closes on Escape, on the close button, and on a click on the backdrop itself', async () => {
    const onClose = vi.fn();
    const { rerender } = render(<ResumeBuilderOverlay jobTitle="Backend Engineer" plan={PLAN} onClose={onClose} />);
    await screen.findByText('Classic');
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);

    rerender(<ResumeBuilderOverlay jobTitle="Backend Engineer" plan={PLAN} onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(onClose).toHaveBeenCalledTimes(2);

    fireEvent.click(screen.getByTestId('resume-builder-overlay'));
    expect(onClose).toHaveBeenCalledTimes(3);
  });

  it('does not close on a click inside the builder itself', async () => {
    const onClose = vi.fn();
    render(<ResumeBuilderOverlay jobTitle="Backend Engineer" plan={PLAN} onClose={onClose} />);
    fireEvent.click(await screen.findByText('Classic'));
    expect(onClose).not.toHaveBeenCalled();
  });
});
