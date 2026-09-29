import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import ChatTurn from './ChatTurn.jsx';

const TURN = { question: 'Is Acme funded?', answer: 'Acme raised a Series B.', actions: [], refs: [], provider: 'claude' };
const PROVIDERS = [{ id: 'claude', label: 'Claude Code' }, { id: 'agy', label: 'Antigravity' }];
const WEB = { answer: 'Acme closed a **Series B** in May.', sources: ['https://www.news.example/acme/series-b', 'https://acme.example/about'], provider: 'claude' };
const turn = (over) => render(<ChatTurn turn={{ ...TURN, ...over }} providers={PROVIDERS} onApply={vi.fn()} onOpenRef={vi.fn()} />);

describe('ChatTurn', () => {
  it('shows the question and a plain answer signed by the CLI that wrote it, with nothing about the web', () => {
    turn({});
    expect(screen.getByText('Is Acme funded?')).toBeInTheDocument();
    expect(screen.getByText('Acme raised a Series B.')).toBeInTheDocument();
    expect(screen.getByText('Claude Code')).toBeInTheDocument();
    expect(screen.queryByText(/web/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('list', { name: 'Sources' })).not.toBeInTheDocument();
  });

  it('shows what the web added as its own card after the answer from JobDekho\'s data', () => {
    turn({ answer: 'Your feed has one Acme posting.', web: WEB });
    const card = screen.getByRole('region', { name: 'From the web' });
    const main = screen.getByText('Your feed has one Acme posting.');
    expect(main.compareDocumentPosition(card) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(within(card).getByText('Searched with your question and the job\'s public details, not your profile.')).toBeInTheDocument();
    expect(within(card).getByText('Series B').tagName).toBe('STRONG');
  });

  it('links each web source by its site, in a new tab', () => {
    turn({ web: WEB });
    const links = within(screen.getByRole('list', { name: 'Sources' })).getAllByRole('link');
    expect(links.map((a) => a.textContent)).toEqual(['news.example', 'acme.example']);
    expect(links[0]).toHaveAttribute('href', 'https://www.news.example/acme/series-b');
    expect(links[0]).toHaveAttribute('target', '_blank');
    expect(links[0]).toHaveAttribute('rel', 'noreferrer');
  });

  it('reads a turn saved before the change as a web card with no main answer', () => {
    const { container } = turn({ web: true, answer: 'Acme raised a Series B.', sources: ['https://acme.example/about'] });
    const card = screen.getByRole('region', { name: 'From the web' });
    expect(within(card).getByText('Acme raised a Series B.')).toBeInTheDocument();
    expect(container).toHaveTextContent('Acme raised a Series B.');
    expect(screen.getAllByText('Acme raised a Series B.')).toHaveLength(1);
    expect(within(card).getAllByRole('link')).toHaveLength(1);
  });

  it('keeps the answer from the person\'s own data and says quietly why the search did not work', () => {
    turn({ webError: 'Claude Code did not answer within 240 seconds.' });
    expect(screen.getByText('Acme raised a Series B.')).toBeInTheDocument();
    expect(screen.getByText('Could not search the web: Claude Code did not answer within 240 seconds.')).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'From the web' })).not.toBeInTheDocument();
  });

  it('lists the jobs it named under a heading with their count', () => {
    turn({ refs: [{ id: 'p1', title: 'Frontend Intern', company: 'Acme', fit: 55 }, { id: 'p2', title: 'Data Analyst', company: 'Globex', fit: null }] });
    expect(screen.getByText('Jobs in JobDekho')).toHaveTextContent('2');
    expect(within(screen.getByRole('list', { name: 'Jobs in this answer' })).getAllByRole('button')).toHaveLength(2);
  });

  it('offers the changes an answer proposed as cards right under it, and none for a turn saved before them', () => {
    const proposal = { id: 'p1', kind: 'profile', summary: 'Add Go to your skills', status: 'pending', diff: [{ label: 'Skills', before: 'node', after: 'node, go' }] };
    turn({ answer: 'Here is Go as a change you can apply.', proposals: [proposal], refs: [{ id: 'p9', title: 'Go Engineer', company: 'Acme' }] });
    const card = screen.getByRole('region', { name: 'Profile change: Add Go to your skills' });
    const answer = screen.getByText('Here is Go as a change you can apply.');
    expect(answer.compareDocumentPosition(card) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(card.compareDocumentPosition(screen.getByRole('button', { name: /Go Engineer/ })) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});

