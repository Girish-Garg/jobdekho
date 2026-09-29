import { describe, it, expect } from 'vitest';
import { chatSuggestions } from './chatSuggestions.js';

describe('chatSuggestions', () => {
  it('asks about the feed when no job is in scope', () => {
    const { title, questions } = chatSuggestions();
    expect(title).toBe('Ask about your feed');
    expect(questions).toContain('Which of these fit me best?');
    expect(questions).toContain('Show only remote jobs');
    expect(questions.length).toBeGreaterThanOrEqual(3);
  });

  it('asks about the job and its company when one is in scope', () => {
    const { title, questions } = chatSuggestions({ page: 'postings', posting: { company: 'Initech' } });
    expect(title).toBe('Ask about this job');
    expect(questions).toEqual(['How well do I fit this job?', 'Is Initech hiring for other roles here?', 'What is Initech known for lately?']);
  });

  it('does not name a company the posting does not have', () => {
    const { questions } = chatSuggestions({ posting: { company: '  ' } });
    expect(questions.join(' ')).not.toMatch(/Is\s+hiring/);
  });

  it('fits the questions to the page it is open on', () => {
    expect(chatSuggestions({ page: 'profile' }).questions).toContain('Add a project I built');
    expect(chatSuggestions({ page: 'profile' }).questions).toContain('What skills am I missing for backend roles?');
    expect(chatSuggestions({ page: 'resume' }).questions).toEqual(['Make it fit one page', 'Tailor it for a job I saved', 'Write a cover letter']);
    expect(chatSuggestions({ page: 'settings' }).title).toBe('Ask about JobDekho');
  });

  it('falls back to the feed for a page it does not know', () => {
    expect(chatSuggestions({ page: 'somewhere' }).title).toBe('Ask about your feed');
  });
});
