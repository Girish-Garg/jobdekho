import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import FakeCheckResult from './FakeCheckResult.jsx';

const PROVIDERS = [{ id: 'claude', label: 'Claude Code' }];
const RESULT = {
  verdict: 'suspicious', stillOpen: false,
  summary: 'The company exists but this role is not on its careers page.',
  checks: [
    { label: 'Company exists', finding: 'Registered in Pune, active website.', ok: true, sources: ['https://acme.in/about', 'https://www.mca.gov.in/x'] },
    { label: 'Role on careers page', finding: 'Not listed.', ok: false, sources: [] },
    { label: 'Scam reports', finding: 'Could not search.', ok: null, sources: [] },
  ],
  redFlags: ['Recruiter contact on WhatsApp', 'Rs 500 registration fee'],
};
const record = (over = {}) => ({
  kind: 'fake-check', postingId: 'p1', provider: 'claude', createdAt: new Date().toISOString(), result: { ...RESULT, ...over },
});

describe('FakeCheckResult', () => {
  it('puts the verdict in words with the summary and whether the posting is still open', () => {
    render(<FakeCheckResult record={record()} providers={PROVIDERS} />);
    expect(screen.getByText('Suspicious')).toBeInTheDocument();
    expect(screen.getByText('The company exists but this role is not on its careers page.')).toBeInTheDocument();
    expect(screen.getByText('No longer open')).toBeInTheDocument();
  });

  it('spells out each verdict', () => {
    for (const [verdict, word] of [['genuine', 'Looks genuine'], ['probably_genuine', 'Probably genuine'], ['unclear', 'Could not tell'], ['likely_scam', 'Likely a scam']]) {
      const { unmount } = render(<FakeCheckResult record={record({ verdict })} providers={PROVIDERS} />);
      expect(screen.getByText(word)).toBeInTheDocument();
      unmount();
    }
  });

  it('lists the checks with their outcome as a word and their sources as links to a new tab', () => {
    render(<FakeCheckResult record={record()} providers={PROVIDERS} />);
    expect(screen.getByText('Company exists')).toBeInTheDocument();
    expect(screen.getByText('Checks out')).toBeInTheDocument();
    expect(screen.getByText('Problem')).toBeInTheDocument();
    expect(screen.getByText('Unclear')).toBeInTheDocument();
    const link = screen.getByRole('link', { name: 'acme.in/about' });
    expect(link).toHaveAttribute('href', 'https://acme.in/about');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noreferrer');
    expect(screen.getAllByRole('link')).toHaveLength(2);
  });

  it('lists the red flags, and leaves the heading out when there are none', () => {
    const { unmount } = render(<FakeCheckResult record={record()} providers={PROVIDERS} />);
    expect(screen.getByText('Red flags')).toBeInTheDocument();
    expect(screen.getByText('Rs 500 registration fee')).toBeInTheDocument();
    unmount();
    render(<FakeCheckResult record={record({ redFlags: [] })} providers={PROVIDERS} />);
    expect(screen.queryByText('Red flags')).not.toBeInTheDocument();
  });

  it('says when it was checked and by which CLI', () => {
    render(<FakeCheckResult record={record()} providers={PROVIDERS} />);
    expect(screen.getByText('Checked today by Claude Code')).toBeInTheDocument();
  });

  it('leaves the open line out when the posting could not be reached', () => {
    render(<FakeCheckResult record={record({ stillOpen: null })} providers={PROVIDERS} />);
    expect(screen.queryByText(/open/i)).not.toBeInTheDocument();
  });

  // Ember is "new today" and errors; a warning about a posting is neither.
  it('never uses the ember accent', () => {
    const { container } = render(<FakeCheckResult record={record({ verdict: 'likely_scam' })} providers={PROVIDERS} />);
    expect(container.innerHTML).not.toMatch(/ember/);
  });
});
