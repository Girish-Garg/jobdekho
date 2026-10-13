import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ResumeTailorResult from './ResumeTailorResult.jsx';

const PROVIDERS = [{ id: 'claude', label: 'Claude Code' }];
const SECTIONS = {
  experience: [{ id: 'e1', title: 'Software Developer', organisation: 'Infobeans Technologies' }],
  projects: [{ id: 'p1', title: 'Campus Marketplace', organisation: '' }],
  education: [], certifications: [], achievements: [],
};
const FLAGS = [
  { type: 'number', value: '40%', context: 'Cut API response time by 40% with Redis caching.' },
  { type: 'skill', value: 'kafka', context: 'Backend: Node.js, Kafka, Express' },
  { type: 'name', value: 'Tata Consultancy Services', context: 'Intern, Tata Consultancy Services, Pune' },
];
const RESULT = {
  sections: SECTIONS,
  keywords: { used: ['node.js'], missing: ['kafka'] },
  factCheck: { flags: [], ok: true },
  coverage: { before: 6, after: 9, total: 14, gained: ['node.js', 'postgresql'], missing: ['kafka', 'kubernetes'] },
};
const record = (over = {}) => ({
  kind: 'resume-tailor', postingId: 'p1', provider: 'claude', createdAt: new Date().toISOString(), result: { ...RESULT, ...over },
});
const flagged = () => record({ factCheck: { flags: FLAGS, ok: false } });

const before = (a, b) => Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);

describe('ResumeTailorResult with flags', () => {
  it('leads with the notice, each flag with what it is and the line it sits in', () => {
    render(<ResumeTailorResult record={flagged()} providers={PROVIDERS} onReview={() => {}} />);
    const notice = screen.getByText('Check these before using it');
    expect(screen.getByText(/3 things in the rewrite that your original resume does not have/)).toBeInTheDocument();
    expect(screen.getByText('40%')).toBeInTheDocument();
    expect(screen.getByText('a number your original does not have')).toBeInTheDocument();
    expect(screen.getByText('kafka')).toBeInTheDocument();
    expect(screen.getByText('Tata Consultancy Services')).toBeInTheDocument();
    expect(before(notice, screen.getByText(/Matches 9 of 14/))).toBe(true);
    expect(before(notice, screen.getByText('Leads the resume for this job'))).toBe(true);
    expect(screen.queryByText(/Nothing in the rewrite is missing/)).not.toBeInTheDocument();
  });

  // Ember is "new today" and errors; a rewrite to check is neither.
  it('never uses the ember accent for the notice', () => {
    const { container } = render(<ResumeTailorResult record={flagged()} providers={PROVIDERS} onReview={() => {}} />);
    expect(container.innerHTML).not.toMatch(/ember/);
  });
});

describe('ResumeTailorResult without flags', () => {
  it('says so quietly, before the coverage', () => {
    render(<ResumeTailorResult record={record()} providers={PROVIDERS} onReview={() => {}} />);
    const quiet = screen.getByText('Nothing in the rewrite is missing from your original resume.');
    expect(screen.queryByText('Check these before using it')).not.toBeInTheDocument();
    expect(before(quiet, screen.getByText(/Matches 9 of 14/))).toBe(true);
  });

  it('gives coverage before and after, what was gained and what is still missing', () => {
    render(<ResumeTailorResult record={record()} providers={PROVIDERS} onReview={() => {}} />);
    expect(screen.getByText('Matches 9 of 14 skills this job names, up from 6.')).toBeInTheDocument();
    expect(screen.getByText('node.js, postgresql')).toBeInTheDocument();
  });

  it('lists which entries the plan picked, per section, after the coverage', () => {
    render(<ResumeTailorResult record={record()} providers={PROVIDERS} onReview={() => {}} />);
    const coverage = screen.getByText(/Matches 9 of 14/);
    const picks = screen.getByText('Leads the resume for this job');
    expect(before(coverage, picks)).toBe(true);
    expect(screen.getByText('Experience')).toBeInTheDocument();
    expect(screen.getByText(/Software Developer/)).toBeInTheDocument();
    expect(screen.getByText(/at Infobeans Technologies/)).toBeInTheDocument();
    expect(screen.getByText('Campus Marketplace')).toBeInTheDocument();
    expect(screen.queryByText('Education')).not.toBeInTheDocument();
  });

  it('opens the review on click, where the resume is made', () => {
    const onReview = vi.fn();
    render(<ResumeTailorResult record={record()} providers={PROVIDERS} onReview={onReview} />);
    fireEvent.click(screen.getByRole('button', { name: 'Review and make the resume' }));
    expect(onReview).toHaveBeenCalledTimes(1);
  });

  // Only the newest tailoring is what a resume is made from.
  it('offers nothing to open on an older tailoring', () => {
    render(<ResumeTailorResult record={record()} providers={PROVIDERS} />);
    expect(screen.queryByRole('button', { name: 'Review and make the resume' })).not.toBeInTheDocument();
  });

  it('says when and by which CLI', () => {
    render(<ResumeTailorResult record={record()} providers={PROVIDERS} onReview={() => {}} />);
    expect(screen.getByText('Tailored today by Claude Code')).toBeInTheDocument();
  });
});

describe('ResumeTailorResult, what there is to review', () => {
  const PRUNED = {
    sections: {
      experience: [{
        id: 'e1', title: 'Software Developer Intern', organisation: 'Zensar Technologies',
        bullets: ['Designed REST APIs in Express.', 'Kept as written.'], was: [['Built REST APIs in Express for an internal tool.'], []],
        dropped: ['Migrated 15 legacy jQuery pages to ReactJS.'],
      }],
      projects: [], education: [], certifications: [], achievements: [],
    },
    leftOut: { skills: ['Kotlin', 'Firebase'], projects: [{ id: 'p8', title: 'Chess Engine' }], fill: [] },
  };

  it('counts what the tailoring left out and reworded in one line, and leaves the reading to the review', () => {
    render(<ResumeTailorResult record={record(PRUNED)} providers={PROVIDERS} onReview={() => {}} />);
    expect(screen.getByText('For this job: 2 skills left out, 1 project left out, 1 bullet reworded, 1 bullet dropped.')).toBeInTheDocument();
    expect(screen.queryByText('Built REST APIs in Express for an internal tool.')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Kotlin/ })).not.toBeInTheDocument();
  });

  it('says nothing of it for a plan that left nothing out and reworded nothing it can pair', () => {
    render(<ResumeTailorResult record={record()} providers={PROVIDERS} onReview={() => {}} />);
    expect(screen.queryByText(/^For this job:/)).not.toBeInTheDocument();
  });
});
