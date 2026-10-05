import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import ResumeReview from './ResumeReview.jsx';
import { buildReview } from '../lib/resumeReview.js';
import { withDefaults } from '../lib/emptyProfile.js';
import { MAX_SKILLS } from '../lib/groupSkills.js';

const role = (id, title, organisation, more = {}) => ({ id, title, organisation, location: '', startDate: '', endDate: '', bullets: [], tech: [], pinned: false, weight: 0, ...more });

const PROFILE = withDefaults({
  experience: [role('oss', 'Open Source Contributor', 'stdlib', { startDate: 'Mar 2024', endDate: 'Apr 2024', bullets: ['Fixed 12 numerical edge cases'] })],
  projects: [role('maap', 'Maap, Quotation Management PWA', ''), role('weather', 'Weather CLI', ''), role('chess', 'Chess Engine', '')],
  skills: ['react', 'grpc'],
});

const FOUND = {
  ranking: { skills: ['react', 'Kubernetes', 'Go'] },
  proposed: {
    experience: [
      { title: 'Software Engineer Intern', organisation: 'Acme Labs', startDate: 'Jan 2026', endDate: 'Present' },
      { title: 'Open Source Contributor', organisation: 'stdlib', startDate: 'Mar 2024', endDate: 'Present', bullets: ['Fixed 12 numerical edge cases', 'Added 4 statistics functions with tests', 'Reviewed 30 pull requests'] },
    ],
    projects: [
      { title: 'Build Your Own Docker', startDate: 'Jun 2026' },
      { title: 'Maap, Quotation Management PWA', link: 'https://maap.vercel.app', bullets: ['Quotes offline'] },
      { title: 'Chess Engine' },
    ],
  },
};

function shown(mode = 'smart', profile = PROFILE, found = FOUND) {
  const onApply = vi.fn();
  const onDiscard = vi.fn();
  const review = buildReview(profile, found, mode);
  render(<ResumeReview review={review} onApply={onApply} onDiscard={onDiscard} />);
  return { review, onApply, onDiscard };
}

const group = (name) => within(screen.getByRole('region', { name: new RegExp(`^${name}`) }));
const box = (name) => screen.getByRole('checkbox', { name: new RegExp(name) });

describe('ResumeReview', () => {
  it('heads the review with the mode, what it found and that nothing is saved yet', () => {
    shown('overwrite');
    expect(screen.getByRole('heading', { name: 'From your resume' })).toBeInTheDocument();
    expect(screen.getByText('Overwrite found 8 changes. Nothing is saved until you apply them and save your profile.')).toBeInTheDocument();
    expect(screen.getByText('4 new')).toHaveClass('chip-primary');
    expect(screen.getByText('2 newer')).toHaveClass('chip-quiet');
    expect(screen.getByText('2 to remove')).toBeInTheDocument();
  });

  it('groups the rows by section, each with its count, entries as rows with what they do', () => {
    shown('overwrite');
    expect(group('Experience').getByText('2')).toHaveClass('count');
    expect(box('Software Engineer Intern')).toBeChecked();
    expect(box('Software Engineer Intern').closest('label')).toHaveTextContent('NewSoftware Engineer Intern at Acme Labs · Jan 2026 to now');
    expect(box('Open Source Contributor').closest('label')).toHaveTextContent('NewerOpen Source Contributor at stdlibEnd date and 2 points');
    expect(box('Maap').closest('label')).toHaveTextContent('Live link and 1 point');
    expect(box('Weather CLI')).not.toBeChecked();
    expect(box('Weather CLI').closest('label')).toHaveTextContent('RemoveWeather CLI · not on this resumeKept unless you tick it');
    expect(box('Weather CLI').closest('li')).toHaveClass('opacity-70');
  });

  it('counts what is kept on Apply and hands up exactly those rows', () => {
    const { review, onApply } = shown('overwrite');
    expect(screen.getByRole('button', { name: 'Apply 6 changes' })).toHaveClass('btn', 'btn-primary');
    fireEvent.click(box('Weather CLI'));
    expect(box('Weather CLI').closest('label')).toHaveTextContent('Removed when you apply');
    expect(screen.getByRole('button', { name: 'Apply 7 changes' })).toBeInTheDocument();
    fireEvent.click(box('Software Engineer Intern'));
    fireEvent.click(screen.getByRole('button', { name: 'Apply 6 changes' }));
    const kept = review.rows.filter((row) => (row.ticked || row.id === 'projects:remove:weather') && row.id !== 'experience:new:0');
    expect(onApply.mock.calls[0][0]).toEqual(kept);
  });

  it('ticks or unticks a whole section at once', () => {
    shown();
    fireEvent.click(group('Experience').getByRole('button', { name: 'Select none' }));
    expect(box('Software Engineer Intern')).not.toBeChecked();
    expect(box('Open Source Contributor')).not.toBeChecked();
    fireEvent.click(group('Experience').getByRole('button', { name: 'Select all' }));
    expect(box('Open Source Contributor')).toBeChecked();
  });

  it('opens a Newer row to the profile beside the resume, struck where it goes and lit where it adds', () => {
    shown();
    fireEvent.click(screen.getByRole('button', { name: 'Details for Open Source Contributor' }));
    expect(screen.getByRole('button', { name: 'Details for Open Source Contributor' })).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('On your profile')).toBeInTheDocument();
    expect(screen.getByText('On the resume')).toBeInTheDocument();
    expect(screen.getByText('Apr 2024')).toHaveClass('text-ember', 'line-through');
    expect(screen.getByText('now')).toHaveClass('text-applied');
    expect(screen.getByText('Reviewed 30 pull requests')).toHaveClass('text-applied');
  });

  it('shows skills as chips to toggle, and stops at the room Best fit has', () => {
    const full = withDefaults({ ...PROFILE, skills: Array.from({ length: MAX_SKILLS - 1 }, (_, i) => `s${i}`).concat('grpc') });
    shown('overwrite', full);
    const fit = group('Best fit');
    const kube = fit.getByRole('button', { name: 'Add Kubernetes' });
    expect(kube).toHaveAttribute('aria-pressed', 'false');
    expect(kube).toBeDisabled();
    expect(fit.getByText('Best fit keeps 40 skills')).toBeInTheDocument();
    expect(fit.getByText('Skills, not on the resume')).toBeInTheDocument();
    // Ticking a removal makes room for one more.
    fireEvent.click(fit.getByRole('button', { name: 'Remove grpc' }));
    expect(fit.getByRole('button', { name: 'Remove grpc' })).toHaveClass('line-through');
    fireEvent.click(kube);
    expect(kube).toHaveAttribute('aria-pressed', 'true');
    expect(fit.getByRole('button', { name: 'Add Go' })).toBeDisabled();
  });

  it('folds what is already on the profile into one line that opens to the names', () => {
    shown();
    const line = screen.getByRole('button', { name: /Already on your profile: 1 project and 1 skill, nothing to change/ });
    fireEvent.click(line);
    expect(within(screen.getByRole('list', { name: 'Already on your profile' })).getAllByRole('listitem').map((li) => li.textContent)).toEqual(['Chess Engine', 'react']);
  });

  it('offers an entry the resume says differently as Changed under Overwrite, ticked, opening to both versions', () => {
    const ended = withDefaults({ experience: [role('se', 'Software Engineer Intern', 'Acme', { startDate: 'May 2024', endDate: 'Present' })] });
    const resume = { proposed: { experience: [{ title: 'Software Engineer Intern', organisation: 'Acme', startDate: 'May 2024', endDate: 'Aug 2024' }] } };
    shown('overwrite', ended, resume);
    expect(screen.getByText('1 changed')).toHaveClass('chip-quiet');
    expect(screen.getByText(/^Overwrite found 1 change, 1 of them where the resume says it differently\./)).toBeInTheDocument();
    expect(box('Software Engineer Intern')).toBeChecked();
    expect(box('Software Engineer Intern').closest('label')).toHaveTextContent('ChangedSoftware Engineer Intern at AcmeEnd date');
    expect(screen.getByText('Changed')).toHaveClass('chip-line');
    fireEvent.click(screen.getByRole('button', { name: 'Details for Software Engineer Intern' }));
    expect(screen.getByText('now')).toHaveClass('text-ember', 'line-through');
    expect(screen.getByText('Aug 2024')).toHaveClass('text-applied');
  });

  it('discards without applying, and cannot apply nothing', () => {
    const { onApply, onDiscard } = shown();
    fireEvent.click(screen.getByRole('button', { name: 'Discard' }));
    expect(onDiscard).toHaveBeenCalled();
    for (const name of ['Experience', 'Projects', 'Best fit']) fireEvent.click(group(name).getByRole('button', { name: 'Select none' }));
    expect(screen.getByRole('button', { name: 'Apply 0 changes' })).toBeDisabled();
    expect(onApply).not.toHaveBeenCalled();
    expect(screen.getByText('Then press Save profile to keep them')).toBeInTheDocument();
  });
});
