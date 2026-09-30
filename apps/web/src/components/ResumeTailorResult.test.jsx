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
    render(<ResumeTailorResult record={flagged()} providers={PROVIDERS} onMakeResume={() => {}} />);
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
    const { container } = render(<ResumeTailorResult record={flagged()} providers={PROVIDERS} onMakeResume={() => {}} />);
    expect(container.innerHTML).not.toMatch(/ember/);
  });
});

describe('ResumeTailorResult without flags', () => {
  it('says so quietly, before the coverage', () => {
    render(<ResumeTailorResult record={record()} providers={PROVIDERS} onMakeResume={() => {}} />);
    const quiet = screen.getByText('Nothing in the rewrite is missing from your original resume.');
    expect(screen.queryByText('Check these before using it')).not.toBeInTheDocument();
    expect(before(quiet, screen.getByText(/Matches 9 of 14/))).toBe(true);
  });

  it('gives coverage before and after, what was gained and what is still missing', () => {
    render(<ResumeTailorResult record={record()} providers={PROVIDERS} onMakeResume={() => {}} />);
    expect(screen.getByText('Matches 9 of 14 skills this job names, up from 6.')).toBeInTheDocument();
    expect(screen.getByText('node.js, postgresql')).toBeInTheDocument();
  });

  it('lists which entries the plan picked, per section, after the coverage', () => {
    render(<ResumeTailorResult record={record()} providers={PROVIDERS} onMakeResume={() => {}} />);
    const coverage = screen.getByText(/Matches 9 of 14/);
    const picks = screen.getByText('Leads the resume for this job');
    expect(before(coverage, picks)).toBe(true);
    expect(screen.getByText('Experience')).toBeInTheDocument();
    expect(screen.getByText(/Software Developer/)).toBeInTheDocument();
    expect(screen.getByText(/at Infobeans Technologies/)).toBeInTheDocument();
    expect(screen.getByText('Campus Marketplace')).toBeInTheDocument();
    expect(screen.queryByText('Education')).not.toBeInTheDocument();
  });

  it('makes a resume document from this plan on click', () => {
    const onMakeResume = vi.fn();
    render(<ResumeTailorResult record={record()} providers={PROVIDERS} onMakeResume={onMakeResume} />);
    fireEvent.click(screen.getByRole('button', { name: 'Make a resume from this' }));
    expect(onMakeResume).toHaveBeenCalledTimes(1);
  });

  it('says when and by which CLI', () => {
    render(<ResumeTailorResult record={record()} providers={PROVIDERS} onMakeResume={() => {}} />);
    expect(screen.getByText('Tailored today by Claude Code')).toBeInTheDocument();
  });
});
