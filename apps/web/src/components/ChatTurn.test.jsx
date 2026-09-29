import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import ChatTurn from './ChatTurn.jsx';

const TURN = { question: 'Is Acme funded?', answer: 'Acme raised a Series B.', actions: [], refs: [] };
const turn = (over) => render(<ChatTurn turn={{ ...TURN, ...over }} onApply={vi.fn()} onOpenRef={vi.fn()} />);

describe('ChatTurn', () => {
  it('shows a plain answer with nothing about the web', () => {
    turn({});
    expect(screen.getByText('Acme raised a Series B.')).toBeInTheDocument();
    expect(screen.queryByText(/web/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('list', { name: 'Sources' })).not.toBeInTheDocument();
  });

  it('says an answer came from the web, what went out, and links each source by its site', () => {
    turn({ web: true, sources: ['https://www.news.example/acme/series-b', 'https://acme.example/about'] });
    expect(screen.getByText(/Searched the web with your question and the job's public details, not your profile/)).toBeInTheDocument();
    const links = within(screen.getByRole('list', { name: 'Sources' })).getAllByRole('link');
    expect(links.map((a) => a.textContent)).toEqual(['news.example', 'acme.example']);
    expect(links[0]).toHaveAttribute('href', 'https://www.news.example/acme/series-b');
    expect(links[0]).toHaveAttribute('target', '_blank');
    expect(links[0]).toHaveAttribute('rel', 'noreferrer');
  });

  it('keeps the answer from the person\'s own data and says why the search did not work', () => {
    turn({ webError: 'Claude Code did not answer within 240 seconds.' });
    expect(screen.getByText('Acme raised a Series B.')).toBeInTheDocument();
    expect(screen.getByText('Answered from your own data. The web search did not work: Claude Code did not answer within 240 seconds.')).toBeInTheDocument();
  });
});
