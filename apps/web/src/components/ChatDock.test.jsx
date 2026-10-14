import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import ChatDock from './ChatDock.jsx';
import { askIn, resetQuestionDock } from '../lib/questionDock.js';
import { answerText, lastAsk } from '../lib/chatQuestions.js';

const FIT = {
  header: 'Fit', multiSelect: true, question: 'It runs to 2 pages. What should go?',
  options: [{ label: 'Achievements', description: 'Saves 3 lines' }, { label: 'Compact layout', description: '' }],
};
const START = { header: 'Start', question: 'Which job first?', options: [{ label: 'Razorpay' }, { label: 'Swiggy' }] };
const turn = (id, questions) => ({ id, question: 'q', answer: 'a', questions });
const box = (over = {}) => ({ held: false, busy: false, onSend: vi.fn(), ...over });

beforeEach(() => resetQuestionDock());

describe('the questions of a chat answer', () => {
  it('are the newest answer alone, and none once set aside', () => {
    expect(lastAsk([turn('t1', [START]), turn('t2', [])])).toBeNull();
    expect(lastAsk([turn('t1', [])])).toBeNull();
    expect(lastAsk([turn('t3', [START])])).toMatchObject({ turnId: 't3', questions: [START] });
    expect(lastAsk(undefined)).toBeNull();
  });

  it('come back as a message that reads on its own', () => {
    expect(answerText([FIT, START], [['Achievements', 'Compact layout'], ['Swiggy']])).toBe(
      'It runs to 2 pages. What should go? Achievements, Compact layout\nWhich job first? Swiggy',
    );
    expect(answerText([FIT], [[]])).toBe('It runs to 2 pages. What should go? None of these');
  });
});

describe('ChatDock', () => {
  it('asks what the AI asked back, and sends the picks as the next message', () => {
    const send = box();
    render(<ChatDock chatId="c1" turns={[turn('t10', [START])]} box={send} onType={() => {}} />);
    expect(screen.getByRole('region', { name: 'The AI asks' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Swiggy/ }));
    expect(send.onSend).toHaveBeenCalledWith('Which job first? Swiggy');
    expect(screen.queryByRole('region', { name: 'The AI asks' })).not.toBeInTheDocument();
  });

  it('hands the box over for an answer in their own words, and goes when waved away', () => {
    const onType = vi.fn();
    const { unmount } = render(<ChatDock chatId="c1" turns={[turn('t11', [START])]} box={box()} onType={onType} />);
    fireEvent.click(screen.getByRole('button', { name: 'Type something else' }));
    expect(onType).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('region', { name: 'The AI asks' })).not.toBeInTheDocument();
    unmount();
    render(<ChatDock chatId="c1" turns={[turn('t12', [START])]} box={box()} onType={onType} />);
    fireEvent.click(screen.getByRole('button', { name: 'Stop asking' }));
    expect(screen.queryByRole('region', { name: 'The AI asks' })).not.toBeInTheDocument();
  });

  it('holds the picks back while an answer is running', () => {
    const send = box({ busy: true });
    render(<ChatDock chatId="c1" turns={[turn('t13', [FIT])]} box={send} onType={() => {}} />);
    expect(screen.getByText('Waiting for the answer that is running')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Done' })).toBeDisabled();
  });

  it('puts the questions of the app first, in their own chat only', async () => {
    render(<ChatDock chatId="c1" turns={[turn('t14', [START])]} box={box()} onType={() => {}} />);
    let asked;
    act(() => { asked = askIn('c1', { title: 'Your tailored resume', questions: [FIT] }); });
    expect(screen.getByRole('region', { name: 'Your tailored resume' })).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'The AI asks' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Achievements/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Done' }));
    await expect(asked).resolves.toEqual([['Achievements']]);
    expect(screen.getByRole('region', { name: 'The AI asks' })).toBeInTheDocument();
  });
});
