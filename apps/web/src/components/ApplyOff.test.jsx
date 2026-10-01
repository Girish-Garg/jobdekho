import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import PostingFooter from './PostingFooter.jsx';
import YourDataCard from './YourDataCard.jsx';
import * as api from '../api/apply.js';

vi.mock('../api/apply.js', () => ({ getApplyBrowser: vi.fn(), clearApplySignIns: vi.fn() }));

const POSTING = { id: 'p1', source: 'lever:cred', title: 'SRE', company: 'CRED', url: 'https://jobs.lever.co/cred/abc', status: null };

// Apply assist is switched off (see lib/features.js): nothing of it shows,
// and nothing asks the server about it, whose routes are gone too.
describe('Apply assist, switched off', () => {
  it('leaves Open posting alone in the footer', () => {
    render(<PostingFooter posting={POSTING} onStatus={vi.fn()} />);
    expect(screen.getByRole('link', { name: /Open posting/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Apply assist' })).not.toBeInTheDocument();
    expect(api.getApplyBrowser).not.toHaveBeenCalled();
  });

  it('says nothing in Settings about its sign-ins', () => {
    render(<YourDataCard />);
    expect(screen.getByText('Kept on this computer')).toBeInTheDocument();
    expect(screen.queryByText(/Apply assist/)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Sign out of every site' })).not.toBeInTheDocument();
  });
});
