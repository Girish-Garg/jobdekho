import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import ChatPending from './ChatPending.jsx';

const call = (over = {}) => ({
  what: { say: 'which fit me?', noun: 'Question', doing: 'thinking' },
  words: { noun: 'Question', doing: 'thinking' },
  provider: 'ollama', label: 'ollama', events: [{ event: 'start', provider: 'ollama' }, { event: 'progress', stage: 'send' }],
  startedAt: Date.now() - 65000, remote: false, ...over,
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

  it('says a question from before a reload is still being answered', () => {
    render(<ChatPending call={call({ remote: true })} providers={[]} />);
    expect(screen.getByText(/Asked before this page reloaded/)).toBeInTheDocument();
  });
});
