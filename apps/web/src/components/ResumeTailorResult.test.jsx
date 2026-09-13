import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ResumeTailorResult from './ResumeTailorResult.jsx';

const PROVIDERS = [{ id: 'claude', label: 'Claude Code' }];
const RESUME = 'Priya Sharma\n\nSummary\nBackend developer.\n\nSkills\nNode.js, PostgreSQL';
const FLAGS = [
  { type: 'number', value: '40%', context: 'Cut API response time by 40% with Redis caching.' },
  { type: 'skill', value: 'kafka', context: 'Backend: Node.js, Kafka, Express' },
  { type: 'name', value: 'Tata Consultancy Services', context: 'Intern, Tata Consultancy Services, Pune' },
];
const RESULT = {
  resume: RESUME,
  keywords: { used: ['node.js'], missing: ['kafka'] },
  changes: [{ section: 'Skills', what: 'Led with the backend stack.' }, { section: '', what: 'Dropped the Android project.' }],
  factCheck: { flags: [], ok: true },
  coverage: { before: 6, after: 9, total: 14, gained: ['node.js', 'postgresql'], missing: ['kafka', 'kubernetes'] },
};
const record = (over = {}) => ({
  kind: 'resume-tailor', postingId: 'p1', provider: 'claude', createdAt: new Date().toISOString(), result: { ...RESULT, ...over },
});
const flagged = () => record({ factCheck: { flags: FLAGS, ok: false } });

const before = (a, b) => Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);

// jsdom's Blob has no text(); FileReader is how its content is read back.
const readBlob = (blob) => new Promise((resolve) => {
  const reader = new FileReader();
  reader.onload = () => resolve(reader.result);
  reader.readAsText(blob);
});

beforeEach(() => {
  Object.assign(navigator, { clipboard: { writeText: vi.fn(async () => {}) } });
  URL.createObjectURL = vi.fn(() => 'blob:jobdekho/1');
  URL.revokeObjectURL = vi.fn();
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
});

afterEach(() => vi.restoreAllMocks());

describe('ResumeTailorResult with flags', () => {
  it('leads with the notice, each flag with what it is and the line it sits in', () => {
    render(<ResumeTailorResult record={flagged()} providers={PROVIDERS} fileName="resume-acme.txt" />);
    const notice = screen.getByText('Check these before using it');
    expect(screen.getByText(/3 things in the rewrite that your original resume does not have/)).toBeInTheDocument();
    expect(screen.getByText('40%')).toBeInTheDocument();
    expect(screen.getByText('a number your original does not have')).toBeInTheDocument();
    expect(screen.getByText('Cut API response time by 40% with Redis caching.')).toBeInTheDocument();
    expect(screen.getByText('kafka')).toBeInTheDocument();
    expect(screen.getByText('a skill your resume does not show')).toBeInTheDocument();
    expect(screen.getByText('Tata Consultancy Services')).toBeInTheDocument();
    expect(screen.getByText('a name your original does not have')).toBeInTheDocument();
    expect(before(notice, screen.getByText(/Matches 9 of 14/))).toBe(true);
    expect(before(notice, screen.getByLabelText('Tailored resume'))).toBe(true);
    expect(screen.queryByText(/Nothing in the rewrite is missing/)).not.toBeInTheDocument();
  });

  // Ember is "new today" and errors; a rewrite to check is neither.
  it('never uses the ember accent for the notice', () => {
    const { container } = render(<ResumeTailorResult record={flagged()} providers={PROVIDERS} fileName="r.txt" />);
    expect(container.innerHTML).not.toMatch(/ember/);
  });

  it('counts one thing in the singular', () => {
    render(<ResumeTailorResult record={record({ factCheck: { flags: FLAGS.slice(0, 1), ok: false } })} providers={PROVIDERS} fileName="r.txt" />);
    expect(screen.getByText(/One thing in the rewrite/)).toBeInTheDocument();
  });
});

describe('ResumeTailorResult without flags', () => {
  it('says so quietly, before the coverage', () => {
    render(<ResumeTailorResult record={record()} providers={PROVIDERS} fileName="r.txt" />);
    const quiet = screen.getByText('Nothing in the rewrite is missing from your original resume.');
    expect(screen.queryByText('Check these before using it')).not.toBeInTheDocument();
    expect(before(quiet, screen.getByText(/Matches 9 of 14/))).toBe(true);
  });

  it('gives coverage before and after, what was gained and what is still missing', () => {
    render(<ResumeTailorResult record={record()} providers={PROVIDERS} fileName="r.txt" />);
    expect(screen.getByText('Matches 9 of 14 skills this job names, up from 6.')).toBeInTheDocument();
    expect(screen.getByText('43% to 64%')).toBeInTheDocument();
    expect(screen.getByText('node.js, postgresql')).toBeInTheDocument();
    expect(screen.getByText('kafka, kubernetes')).toBeInTheDocument();
    expect(screen.getByText('(not added because your resume does not show them)')).toBeInTheDocument();
  });

  it('words a drop and no change honestly, and says when the posting names nothing', () => {
    const { unmount } = render(<ResumeTailorResult record={record({ coverage: { before: 6, after: 5, total: 14, gained: [], missing: ['x'] } })} providers={PROVIDERS} fileName="r.txt" />);
    expect(screen.getByText('Matches 5 of 14 skills this job names, down from 6.')).toBeInTheDocument();
    expect(screen.queryByText(/Gained/)).not.toBeInTheDocument();
    unmount();
    render(<ResumeTailorResult record={record({ coverage: { before: 6, after: 6, total: 14, gained: [], missing: [] } })} providers={PROVIDERS} fileName="r.txt" />);
    expect(screen.getByText('Matches 6 of 14 skills this job names, as before.')).toBeInTheDocument();
    render(<ResumeTailorResult record={record({ coverage: { before: 0, after: 0, total: 0, gained: [], missing: [] } })} providers={PROVIDERS} fileName="r.txt" />);
    expect(screen.getByText(/names no skills the matcher knows/)).toBeInTheDocument();
  });

  it('puts the rewrite in an editable box whose edits stay local', () => {
    render(<ResumeTailorResult record={record()} providers={PROVIDERS} fileName="r.txt" />);
    const box = screen.getByLabelText('Tailored resume');
    expect(box).toHaveValue(RESUME);
    fireEvent.change(box, { target: { value: 'edited' } });
    expect(box).toHaveValue('edited');
    expect(screen.getByText('Edits here stay on this page and are not saved.')).toBeInTheDocument();
  });

  it('copies what is in the box, edits included', async () => {
    render(<ResumeTailorResult record={record()} providers={PROVIDERS} fileName="r.txt" />);
    fireEvent.change(screen.getByLabelText('Tailored resume'), { target: { value: 'edited resume' } });
    fireEvent.click(screen.getByRole('button', { name: 'Copy' }));
    expect(await screen.findByRole('button', { name: 'Copied' })).toBeInTheDocument();
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('edited resume');
  });

  it('says so in error text when the clipboard refuses', async () => {
    navigator.clipboard.writeText.mockRejectedValueOnce(new Error('denied'));
    render(<ResumeTailorResult record={record()} providers={PROVIDERS} fileName="r.txt" />);
    fireEvent.click(screen.getByRole('button', { name: 'Copy' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/Could not copy/);
    expect(screen.getByRole('button', { name: 'Copy' })).toBeInTheDocument();
  });

  it('downloads what is in the box as a .txt under the given name', async () => {
    render(<ResumeTailorResult record={record()} providers={PROVIDERS} fileName="resume-acme.txt" />);
    fireEvent.change(screen.getByLabelText('Tailored resume'), { target: { value: 'edited resume' } });
    fireEvent.click(screen.getByRole('button', { name: 'Download as .txt' }));
    const blob = URL.createObjectURL.mock.calls[0][0];
    expect(await readBlob(blob)).toBe('edited resume');
    const click = HTMLAnchorElement.prototype.click;
    expect(click).toHaveBeenCalledTimes(1);
    expect(click.mock.instances[0].download).toBe('resume-acme.txt');
  });

  it('replaces the draft when a fresh rewrite arrives', async () => {
    const { rerender } = render(<ResumeTailorResult record={record()} providers={PROVIDERS} fileName="r.txt" />);
    fireEvent.change(screen.getByLabelText('Tailored resume'), { target: { value: 'edited' } });
    rerender(<ResumeTailorResult record={{ ...record({ resume: 'fresh' }), createdAt: '2026-09-14T00:00:00.000Z' }} providers={PROVIDERS} fileName="r.txt" />);
    await waitFor(() => expect(screen.getByLabelText('Tailored resume')).toHaveValue('fresh'));
  });

  it('lists what changed, and says when and by which CLI', () => {
    render(<ResumeTailorResult record={record()} providers={PROVIDERS} fileName="r.txt" />);
    expect(screen.getByText('What changed')).toBeInTheDocument();
    expect(screen.getByText('Skills: Led with the backend stack.')).toBeInTheDocument();
    expect(screen.getByText('Dropped the Android project.')).toBeInTheDocument();
    expect(screen.getByText('Tailored today by Claude Code')).toBeInTheDocument();
  });
});
