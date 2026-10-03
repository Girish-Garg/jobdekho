import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import ChatPending from './ChatPending.jsx';

const call = (over = {}) => ({
  chatId: 'c1', kind: 'question', label: 'Answering', say: 'which fit me?', provider: 'ollama',
  events: [{ event: 'start', provider: 'ollama' }, { event: 'progress', stage: 'send' }],
  text: '', web: false, startedAt: Date.now() - 65000, remote: false, letter: null, ...over,
});

describe('ChatPending', () => {
  // A question sent as the panel opened started before the CLI list came.
  it('names the CLI by its label once the list is there, not by the id the call started with', () => {
    render(<ChatPending call={call()} providers={[{ id: 'ollama', label: 'Ollama' }]} />);
    const card = screen.getByRole('region', { name: 'Answer in progress' });
    expect(within(card).getByText('Ollama, thinking')).toBeInTheDocument();
  });

  it('shows the answer as it is written, under who is writing it', () => {
    render(<ChatPending call={call({ text: 'Two of these are **remote**.' })} providers={[{ id: 'ollama', label: 'Ollama' }]} />);
    const card = screen.getByRole('region', { name: 'Answer in progress' });
    expect(within(card).getByText('Ollama is writing')).toBeInTheDocument();
    expect(within(card).getByText('remote').tagName).toBe('STRONG');
  });

  // Worth saying only once a wait is long enough to wonder about.
  it('says the panel can be closed only once the wait runs long', () => {
    const { unmount } = render(<ChatPending call={call({ startedAt: Date.now() - 3000 })} providers={[]} />);
    expect(screen.queryByText(/You can close this panel/)).not.toBeInTheDocument();
    unmount();
    render(<ChatPending call={call()} providers={[]} />);
    expect(screen.getByText(/You can close this panel/)).toBeInTheDocument();
  });

  it('counts from when it was asked, in minutes past the first', () => {
    render(<ChatPending call={call()} providers={[]} />);
    expect(screen.getByTitle('Time since you asked')).toHaveTextContent('1:05');
  });

  it('says a call this page only watches will land on its own', () => {
    render(<ChatPending call={call({ remote: true })} providers={[]} />);
    expect(screen.getByText(/It will show here when it lands, panel open or not/)).toBeInTheDocument();
  });

  it('shows what a job action does in its own words, and a refine as the change it asks for', () => {
    render(<ChatPending call={call({ kind: 'action', action: 'cover-letter', say: 'make it shorter', changing: 'Cover letter' })} providers={[]} />);
    expect(screen.getByText('Changing: Cover letter')).toBeInTheDocument();
    expect(screen.getByText('ollama, writing')).toBeInTheDocument();
  });

  it('counts a comparison\'s letters as they are written', () => {
    render(<ChatPending call={call({ kind: 'combined', say: 'Cover letter for each', letter: { index: 2, total: 3 } })} providers={[{ id: 'ollama', label: 'Ollama' }]} />);
    expect(screen.getByText('Ollama, 2 of 3 letters')).toBeInTheDocument();
  });
});
