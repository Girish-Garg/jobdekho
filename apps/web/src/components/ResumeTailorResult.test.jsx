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

// A plan as it is saved once bullets are paired and things are left out.
const PRUNED = {
  sections: {
    experience: [{
      id: 'e1', title: 'Software Developer Intern', organisation: 'Zensar Technologies',
      bullets: ['Designed REST APIs in Express.'], was: [['Built REST APIs in Express for an internal tool.']],
      dropped: ['Migrated 15 legacy jQuery pages to ReactJS.'],
    }],
    projects: [], education: [], certifications: [], achievements: [],
  },
  leftOut: { skills: ['Kotlin', 'Firebase'], projects: [{ id: 'p8', title: 'Chess Engine' }], fill: [{ id: 'p9', title: 'Expense Tracker' }] },
};
const NONE = { skills: [], projects: [], mine: {}, back: {} };

function pruned(over = {}) {
  const onChoices = vi.fn();
  render(<ResumeTailorResult record={record({ ...PRUNED, ...over })} providers={PROVIDERS} onMakeResume={() => {}} onChoices={onChoices} />);
  return onChoices;
}

describe('ResumeTailorResult, what was left out', () => {
  it('lists the skills and projects left out, each one click from being back', () => {
    const onChoices = pruned();
    expect(screen.getByText('Left out for this job')).toBeInTheDocument();
    const kotlin = screen.getByRole('button', { name: 'Put Kotlin back' });
    expect(kotlin).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(kotlin);
    expect(onChoices).toHaveBeenLastCalledWith({ ...NONE, skills: ['Kotlin'] });
    expect(screen.getByRole('button', { name: 'Leave Kotlin out' })).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(screen.getByRole('button', { name: 'Put Chess Engine back' }));
    expect(onChoices).toHaveBeenLastCalledWith({ ...NONE, skills: ['Kotlin'], projects: ['p8'] });
  });

  it('lets a project kept only to fill the section be left out, and put back', () => {
    const onChoices = pruned();
    fireEvent.click(screen.getByRole('button', { name: 'Leave Expense Tracker out' }));
    expect(onChoices).toHaveBeenLastCalledWith({ ...NONE, projects: ['p9'] });
    fireEvent.click(screen.getByRole('button', { name: 'Put Expense Tracker back' }));
    expect(onChoices).toHaveBeenLastCalledWith(NONE);
  });

  it('starts from the choices the plan was saved with', () => {
    pruned({ choices: { skills: ['Firebase'], projects: ['p9'] } });
    expect(screen.getByRole('button', { name: 'Leave Firebase out' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Put Kotlin back' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Put Expense Tracker back' })).toBeInTheDocument();
  });

  it('says so when a plan left nothing out', () => {
    pruned({ leftOut: { skills: [], projects: [], fill: [] } });
    expect(screen.getByText('Nothing was left out: every skill and project you list is in.')).toBeInTheDocument();
  });
});

describe('ResumeTailorResult, bullet by bullet', () => {
  it('shows a rewording beside the original, and takes it back on "Use mine"', () => {
    const onChoices = pruned();
    expect(screen.getByText('1 reworded, 1 left out')).toBeInTheDocument();
    expect(screen.getByText('1 of 2')).toBeInTheDocument();
    expect(screen.getByText('Software Developer Intern at Zensar Technologies')).toBeInTheDocument();
    expect(screen.getByText('Built REST APIs in Express for an internal tool.')).toBeInTheDocument();
    expect(screen.getByText('Designed REST APIs in Express.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Keep this' })).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(screen.getByRole('button', { name: 'Use mine' }));
    expect(onChoices).toHaveBeenLastCalledWith({ ...NONE, mine: { e1: [0] } });
    // Choosing moves on to the next change: the bullet that was left out.
    expect(screen.getByText('2 of 2')).toBeInTheDocument();
    expect(screen.getByText('Migrated 15 legacy jQuery pages to ReactJS.')).toBeInTheDocument();
    expect(screen.getByText('Left out of the resume.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Put back' }));
    expect(onChoices).toHaveBeenLastCalledWith({ ...NONE, mine: { e1: [0] }, back: { e1: [0] } });
    expect(screen.getByText('Back in the resume.')).toBeInTheDocument();
  });

  it('steps back and forth, and letting a change stand saves nothing', () => {
    const onChoices = pruned();
    fireEvent.click(screen.getByRole('button', { name: 'Previous change' }));
    expect(screen.getByText('2 of 2')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Next change' }));
    expect(screen.getByText('1 of 2')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Keep this' }));
    expect(onChoices).not.toHaveBeenCalled();
    expect(screen.getByText('2 of 2')).toBeInTheDocument();
  });

  // Only the newest tailoring is what a resume is made from.
  it('offers nothing to change on an older tailoring, or on a plan from before any of this', () => {
    render(<ResumeTailorResult record={record(PRUNED)} providers={PROVIDERS} onMakeResume={() => {}} />);
    expect(screen.queryByText('Left out for this job')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Use mine' })).not.toBeInTheDocument();
    const onChoices = vi.fn();
    render(<ResumeTailorResult record={record()} providers={PROVIDERS} onMakeResume={() => {}} onChoices={onChoices} />);
    expect(screen.queryByText('Left out for this job')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Use mine' })).not.toBeInTheDocument();
  });
});
