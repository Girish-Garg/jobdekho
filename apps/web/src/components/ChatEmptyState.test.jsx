import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import ChatEmptyState from './ChatEmptyState.jsx';

const questions = () => within(screen.getByRole('list', { name: 'Suggested questions' })).getAllByRole('button').map((b) => b.textContent);

describe('ChatEmptyState', () => {
  it('invites a question about the feed and sends a suggestion on click', () => {
    const onSend = vi.fn();
    render(<ChatEmptyState page="postings" posting={null} busy={false} onSend={onSend} />);
    expect(screen.getByText(/Ask about the postings on screen/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Show only remote jobs' }));
    expect(onSend).toHaveBeenCalledWith('Show only remote jobs');
  });

  it('suggests questions about the job in scope, by its company', () => {
    render(<ChatEmptyState page="postings" posting={{ company: 'Initech' }} busy={false} onSend={vi.fn()} />);
    expect(questions()).toContain('What is Initech known for lately?');
  });

  it('suggests questions that fit the page it is open on', () => {
    render(<ChatEmptyState page="resume" posting={null} busy={false} onSend={vi.fn()} />);
    expect(screen.getByRole('heading', { name: 'Change your documents' })).toBeInTheDocument();
    expect(questions()).toContain('Make it fit one page');
  });

  it('says it is looking for earlier answers while a job\'s saved ones load', () => {
    render(<ChatEmptyState page="postings" posting={{ company: 'Initech' }} loading busy={false} onSend={vi.fn()} />);
    expect(screen.getByText('Looking for earlier answers about this job...')).toBeInTheDocument();
  });

  it('holds the suggestions back while a call is in flight', () => {
    render(<ChatEmptyState page="postings" posting={null} busy onSend={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Which of these fit me best?' })).toBeDisabled();
  });
});
