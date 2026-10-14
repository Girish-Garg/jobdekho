import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within, act } from '@testing-library/react';
import QuestionDock from './QuestionDock.jsx';

const SKILLS = {
  header: 'Skills', multiSelect: true, submitLabel: 'Done', question: 'This job does not ask for these. Leave them out?',
  detail: 'Ticked ones stay out.', options: [{ label: 'Kotlin' }, { label: 'Firebase' }], defaults: ['Kotlin', 'Firebase'],
};
const WORDING = {
  header: 'Wording', question: 'Software Developer at Infobeans: 2 bullets reworded.',
  options: [{ label: 'Keep the new wording', value: 'new' }, { label: 'Use my original wording', value: 'mine', description: 'Both' }],
};
const FIT = { header: 'Fit', multiSelect: true, submitLabel: 'Cut these', skipLabel: 'Keep two pages', question: 'What should go?', options: [{ label: 'Achievements', value: 'section:achievements' }] };

function dock(questions, props = {}) {
  const onSubmit = vi.fn();
  const onStop = vi.fn();
  render(<QuestionDock ask={{ id: 1, title: 'Your tailored resume', step: { at: 2, of: 5 }, questions }} onSubmit={onSubmit} onStop={onStop} {...props} />);
  return { onSubmit, onStop, region: screen.getByRole('region', { name: 'Your tailored resume' }) };
}

describe('QuestionDock', () => {
  it('asks one question at a time, with where it stands', () => {
    const { region } = dock([WORDING]);
    expect(within(region).getByText('2 of 5')).toBeInTheDocument();
    expect(within(region).getByText('Software Developer at Infobeans: 2 bullets reworded.')).toBeInTheDocument();
    expect(within(region).getByText('Both')).toBeInTheDocument();
    // A one-pick question has no tabs and no Done.
    expect(within(region).queryByRole('button', { name: 'Done' })).not.toBeInTheDocument();
  });

  it('answers a one-pick question on press, sending its value', () => {
    const { onSubmit } = dock([WORDING]);
    fireEvent.click(screen.getByRole('button', { name: /Use my original wording/ }));
    expect(onSubmit).toHaveBeenCalledWith([['mine']]);
  });

  it('starts a several-pick question from its defaults, and sends the ticks on Done', () => {
    const { onSubmit } = dock([SKILLS]);
    const kotlin = screen.getByRole('button', { name: 'Kotlin' });
    expect(kotlin).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(kotlin);
    expect(kotlin).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(screen.getByRole('button', { name: 'Done' }));
    expect(onSubmit).toHaveBeenCalledWith([['Firebase']]);
  });

  // Found when a test drove the dock faster than it redrew: each click
  // started from the picks last drawn, and only the last one counted.
  it('counts every click, however quick, before the screen redraws', () => {
    const { onSubmit } = dock([SKILLS]);
    const [kotlin, firebase, done] = ['Kotlin', 'Firebase', 'Done'].map((name) => screen.getByRole('button', { name }));
    act(() => {
      kotlin.click();
      firebase.click();
      done.click();
    });
    expect(onSubmit).toHaveBeenCalledWith([[]]);
  });

  it('moves through several questions by their headers, and sends them all after the last', () => {
    const { onSubmit, region } = dock([WORDING, SKILLS, FIT]);
    expect(within(region).getByRole('button', { name: 'Wording' })).toHaveAttribute('aria-current', 'step');
    fireEvent.click(screen.getByRole('button', { name: /Keep the new wording/ }));
    expect(within(region).getByRole('button', { name: 'Skills' })).toHaveAttribute('aria-current', 'step');
    fireEvent.click(screen.getByRole('button', { name: 'Done' }));
    fireEvent.click(screen.getByRole('button', { name: 'Keep two pages' }));
    expect(onSubmit).toHaveBeenCalledWith([['new'], ['Kotlin', 'Firebase'], []]);
  });

  it('picks by number key and stops on Escape, the way Claude Code asks', () => {
    const { onSubmit, onStop, region } = dock([WORDING]);
    fireEvent.keyDown(region, { key: '2' });
    expect(onSubmit).toHaveBeenCalledWith([['mine']]);
    fireEvent.keyDown(region, { key: 'Escape' });
    expect(onStop).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: 'Stop asking' }));
    expect(onStop).toHaveBeenCalledTimes(2);
  });

  it('waits to send while something is running, and says why', () => {
    const { onSubmit } = dock([SKILLS], { held: 'Waiting for the answer that is running' });
    expect(screen.getByText('Waiting for the answer that is running')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Done' })).toBeDisabled();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('offers typing an answer instead, when asked to', () => {
    const onOther = vi.fn();
    dock([WORDING], { onOther });
    fireEvent.click(screen.getByRole('button', { name: 'Type something else' }));
    expect(onOther).toHaveBeenCalledTimes(1);
  });
});
