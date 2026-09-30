import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ApplyTextCatcher from './ApplyTextCatcher.jsx';
import ApplyPicker from './ApplyPicker.jsx';
import ApplyChecklist from './ApplyChecklist.jsx';
import ApplyBanner from './ApplyBanner.jsx';
import { ApplyChooser, ApplyPageDialog } from './ApplyPrompts.jsx';

describe('ApplyTextCatcher', () => {
  const setup = () => {
    const onSend = vi.fn();
    render(<ApplyTextCatcher onSend={onSend} onFocusChange={() => {}} />);
    return { onSend, box: screen.getByLabelText('Type into the application form') };
  };

  it('sends typed text in any script and keeps none of it', () => {
    const { onSend, box } = setup();
    box.value = 'नमस्ते';
    fireEvent.input(box);
    expect(onSend).toHaveBeenCalledWith({ t: 'text', text: 'नमस्ते' });
    expect(box.value).toBe('');
  });

  it('waits for an IME to finish composing, then sends what it made', () => {
    const { onSend, box } = setup();
    box.value = 'nam';
    fireEvent.input(box, { isComposing: true });
    expect(onSend).not.toHaveBeenCalled();
    box.value = 'नम';
    fireEvent.compositionEnd(box);
    expect(onSend).toHaveBeenCalledWith({ t: 'text', text: 'नम' });
  });

  it('sends named keys as keys and keeps them from the app behind', () => {
    const { onSend, box } = setup();
    const behind = vi.fn();
    document.addEventListener('keydown', behind);
    fireEvent.keyDown(box, { key: 'Backspace' });
    fireEvent.keyDown(box, { key: 'Escape' });
    expect(onSend).toHaveBeenCalledWith(expect.objectContaining({ t: 'key', name: 'Backspace' }));
    expect(behind).not.toHaveBeenCalled();
    document.removeEventListener('keydown', behind);
  });
});

describe('ApplyPicker', () => {
  const picker = { kind: 'select', value: '', rect: { x: 10, y: 20, w: 200, h: 30 }, options: [{ value: '', label: 'Select...' }, { value: 'f', label: 'Female' }, { value: 'x', label: 'Hidden', disabled: true }] };

  it('draws the page\'s own list and sends the person\'s pick', () => {
    const onPick = vi.fn();
    render(<ApplyPicker picker={picker} frame={{ w: 1000, h: 800, sx: 0, sy: 0 }} width={500} onPick={onPick} />);
    expect(screen.queryByText('Hidden')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('option', { name: 'Female' }));
    expect(onPick).toHaveBeenCalledWith('f');
  });

  it('cancels with Escape, leaving the page as it was', () => {
    const onPick = vi.fn();
    render(<ApplyPicker picker={picker} frame={null} width={0} onPick={onPick} />);
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(onPick).toHaveBeenCalledWith(null);
  });

  it('offers the browser\'s own date input for a date field', () => {
    const onPick = vi.fn();
    const { container } = render(<ApplyPicker picker={{ ...picker, kind: 'date', options: [] }} frame={null} width={0} onPick={onPick} />);
    fireEvent.change(container.querySelector('input[type="date"]'), { target: { value: '2026-10-01' } });
    fireEvent.click(screen.getByRole('button', { name: 'Set' }));
    expect(onPick).toHaveBeenCalledWith('2026-10-01');
  });
});

describe('ApplyChecklist', () => {
  const rows = [
    { fid: 'f1', label: 'First Name', status: 'filled', preview: 'Demo', required: true, rect: {} },
    { fid: 'f2', label: 'Gender', status: 'you', note: 'About you personally: yours to answer or skip.', preview: '', rect: {} },
    { fid: 'f3', label: 'Phone', status: 'failed', preview: '', rect: {} },
  ];

  it('says what was filled and what is left, in words as well as colour', () => {
    render(<ApplyChecklist rows={rows} />);
    expect(screen.getByText('1 filled')).toBeInTheDocument();
    expect(screen.getByText('2 left for you')).toBeInTheDocument();
    expect(screen.getByText('Needs you')).toBeInTheDocument();
    expect(screen.getByText('Try it yourself')).toBeInTheDocument();
    expect(screen.getByText('Demo')).toBeInTheDocument();
  });

  it('picks a row\'s outline out on hover', () => {
    const onHover = vi.fn();
    render(<ApplyChecklist rows={rows} onHover={onHover} />);
    fireEvent.mouseEnter(screen.getByText('Gender').closest('li'));
    expect(onHover).toHaveBeenCalledWith('f2');
  });
});

describe('ApplyBanner', () => {
  it('asks for a press after a wall, and never offers to submit', () => {
    const onFill = vi.fn();
    render(<ApplyBanner view={{ state: 'yours', reason: 'sign-in', message: 'This site wants you to sign in.' }} onFill={onFill} />);
    fireEvent.click(screen.getByRole('button', { name: 'Continue filling' }));
    expect(onFill).toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: /submit/i })).not.toBeInTheDocument();
  });

  it('ends on "Review and submit it yourself", and offers Mark as applied once the site confirms', () => {
    const onApplied = vi.fn();
    const { rerender } = render(<ApplyBanner view={{ state: 'review', reason: 'review', message: 'JobDekho has not pressed Submit and never will.' }} />);
    expect(screen.getByRole('status')).toHaveTextContent('Review and submit it yourself. JobDekho has not pressed Submit and never will.');
    rerender(<ApplyBanner view={{ state: 'review', reason: 'submitted', message: 'If it went through, mark this job as applied.' }} onApplied={onApplied} />);
    expect(screen.getByRole('status')).toHaveTextContent('Looks submitted. If it went through, mark this job as applied.');
    fireEvent.click(screen.getByRole('button', { name: 'Mark as applied' }));
    expect(onApplied).toHaveBeenCalled();
  });
});

describe('ApplyPrompts', () => {
  it('answers a file chooser with one of the person\'s files, or cancels', () => {
    const onChoose = vi.fn();
    render(<ApplyChooser files={{ resume: 'Demo Resume.pdf', cover: null }} onChoose={onChoose} />);
    fireEvent.click(screen.getByRole('button', { name: /Resume: Demo Resume.pdf/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onChoose.mock.calls).toEqual([['resume'], ['cancel']]);
  });

  it('shows the page\'s own confirm and passes the answer back', () => {
    const onAnswer = vi.fn();
    render(<ApplyPageDialog dialog={{ kind: 'confirm', message: 'Leave this page?' }} onAnswer={onAnswer} />);
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onAnswer).toHaveBeenCalledWith(false);
  });
});
