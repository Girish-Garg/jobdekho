import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import ResumeBuilderView from './ResumeBuilderView.jsx';
import * as api from '../api.js';

const PROFILE = {
  basics: { name: 'Priya Sharma', headline: '', email: '', phone: '', location: '', links: {} },
  experience: [{ id: 'e1', title: 'Engineer', organisation: 'Acme' }, { id: 'e2', title: 'Intern', organisation: 'Globex' }],
  projects: [], education: [], certifications: [], achievements: [], skillGroups: [],
};

const EMPTY_PROFILE = {
  basics: { name: '', headline: '', email: '', phone: '', location: '', links: {} },
  experience: [], projects: [], education: [], certifications: [], achievements: [], skillGroups: [],
};

const TEMPLATES = [
  { id: 'classic', name: 'Classic', description: 'One-column serif.' },
  { id: 'compact', name: 'Compact', description: 'Tighter modern sans.' },
];

// jsdom has no object URLs; the preview pane creates one for the compiled PDF.
beforeEach(() => {
  URL.createObjectURL = vi.fn(() => 'blob:jobdekho/1');
  URL.revokeObjectURL = vi.fn();
  vi.spyOn(api, 'getResumeTemplates').mockResolvedValue(TEMPLATES);
  vi.spyOn(api, 'getResumeSelection').mockResolvedValue({ template: 'classic', sections: {} });
  vi.spyOn(api, 'putResumeSelection').mockResolvedValue({});
  vi.spyOn(api, 'getResumePdf').mockResolvedValue(new Blob(['%PDF-fake']));
  vi.spyOn(api, 'getResumeTex').mockResolvedValue('tex source');
});

afterEach(() => vi.restoreAllMocks());

describe('ResumeBuilderView', () => {
  it('tells a person with nothing in their profile what to fill in first, without asking for a PDF', async () => {
    vi.spyOn(api, 'getProfile').mockResolvedValue(EMPTY_PROFILE);
    render(<ResumeBuilderView />);
    expect(await screen.findByText('Nothing to build yet')).toBeInTheDocument();
    expect(api.getResumePdf).not.toHaveBeenCalled();
  });

  it('shows the template choices and every experience entry once the profile has content', async () => {
    vi.spyOn(api, 'getProfile').mockResolvedValue(PROFILE);
    render(<ResumeBuilderView />);
    expect(await screen.findByText('Classic')).toBeInTheDocument();
    expect(screen.getByText('Compact')).toBeInTheDocument();
    expect(screen.getByText('Engineer')).toBeInTheDocument();
    expect(screen.getByText('Intern')).toBeInTheDocument();
  });

  it('starts every section fully checked when nothing was saved before', async () => {
    vi.spyOn(api, 'getProfile').mockResolvedValue(PROFILE);
    render(<ResumeBuilderView />);
    await screen.findByText('Classic');
    expect(screen.getByText('2 of 2 included')).toBeInTheDocument();
  });

  it('saves the selection when a template is switched', async () => {
    vi.spyOn(api, 'getProfile').mockResolvedValue(PROFILE);
    render(<ResumeBuilderView />);
    await screen.findByText('Classic');
    fireEvent.click(screen.getByRole('radio', { name: /Compact/ }));
    await waitFor(() => expect(api.putResumeSelection).toHaveBeenCalledWith(expect.objectContaining({ template: 'compact' })));
  });

  // Seeded from a tailored resume result (see ResumeBuilderOverlay.jsx): the
  // plan's own picks start checked instead of everything the profile has,
  // and the general resume selection is left alone so a one-off tailoring
  // never overwrites it.
  it('starts checked to only what a plan picked, when seeded with one', async () => {
    vi.spyOn(api, 'getProfile').mockResolvedValue(PROFILE);
    const plan = { sections: { experience: [{ id: 'e2', bullets: ['x'], dropped: [] }] } };
    render(<ResumeBuilderView plan={plan} />);
    await screen.findByText('Classic');
    expect(screen.getByText('1 of 2 included')).toBeInTheDocument();
    expect(screen.getByText('Intern')).toBeInTheDocument();
  });

  it('never saves a seeded plan\'s picks as the general resume selection', async () => {
    vi.spyOn(api, 'getProfile').mockResolvedValue(PROFILE);
    const plan = { sections: { experience: [{ id: 'e2', bullets: ['x'], dropped: [] }] } };
    render(<ResumeBuilderView plan={plan} />);
    await screen.findByText('Classic');
    fireEvent.click(screen.getByRole('radio', { name: /Compact/ }));
    await screen.findByRole('radio', { name: /Compact/, checked: true });
    expect(api.putResumeSelection).not.toHaveBeenCalled();
  });
});
