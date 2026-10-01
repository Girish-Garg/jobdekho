import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ApplyTextCatcher from './ApplyTextCatcher.jsx';
import ApplyPicker from './ApplyPicker.jsx';
import ApplyTimeline from './ApplyTimeline.jsx';
import ApplyControlStrip from './ApplyControlStrip.jsx';
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

describe('ApplyTimeline', () => {
  const view = {
    url: 'https://jobs.lever.co/acme/1/apply', title: 'Acme - Engineer',
    rows: [
      { fid: 'f1', label: 'First Name', status: 'filled', preview: 'Demo', required: true, rect: {} },
      { fid: 'f2', label: 'Why Acme?', status: 'you', note: 'Needs your answer.', askable: true, rect: {} },
      { fid: 'f3', label: 'Phone', status: 'failed', preview: '', rect: {} },
      { fid: 'f4', label: 'Password', status: 'you', note: 'Passwords are yours to type.', askable: false, rect: {} },
    ],
  };

  it('says what was filled, what did not take, and what needs the person', () => {
    render(<ApplyTimeline view={view} onHover={() => {}} onPick={() => {}} />);
    expect(screen.getByText(/Opened/)).toHaveTextContent('Opened jobs.lever.co');
    expect(screen.getByText('Filled 1 from your profile')).toBeInTheDocument();
    expect(screen.getByText('One did not take: try it yourself')).toBeInTheDocument();
    expect(screen.getByText('2 need you')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Why Acme\? I can draft/ })).not.toHaveAttribute('aria-disabled');
  });

  // A password is the person's alone: said, never offered to the AI.
  it('starts a reply for a question the AI can help with, and only picks out the rest', () => {
    const onPick = vi.fn();
    const onHover = vi.fn();
    render(<ApplyTimeline view={view} onHover={onHover} onPick={onPick} />);
    fireEvent.click(screen.getByRole('button', { name: /Why Acme\?/ }));
    expect(onPick).toHaveBeenCalledWith(expect.objectContaining({ fid: 'f2' }));
    const password = screen.getByRole('button', { name: /Password yours to do/ });
    expect(password).toHaveAttribute('aria-disabled', 'true');
    fireEvent.click(password);
    expect(onPick).toHaveBeenCalledTimes(1);
    fireEvent.mouseEnter(password);
    expect(onHover).toHaveBeenCalledWith('f4');
  });
});

describe('ApplyControlStrip', () => {
  const strip = (view, onAction = vi.fn()) => {
    render(<ApplyControlStrip view={{ url: 'https://internshala.com/job/1', rows: [], ...view }} onAction={onAction} />);
    return onAction;
  };

  it('offers the normal window and Continue filling at a sign-in, and never a submit', () => {
    const onAction = strip({ state: 'yours', reason: 'sign-in', message: 'This site wants you to sign in.' });
    expect(screen.getByRole('status')).toHaveTextContent('internshala.com wants you to sign in');
    fireEvent.click(screen.getByRole('button', { name: 'Continue filling' }));
    fireEvent.click(screen.getByRole('button', { name: /Sign in in a normal window/ }));
    expect(onAction.mock.calls.map(([id]) => id)).toEqual(['fill', 'window']);
    expect(screen.queryByRole('button', { name: /submit/i })).not.toBeInTheDocument();
  });

  it('sends Google\'s refusal to the normal window', () => {
    const onAction = strip({ state: 'yours', reason: 'google-blocked', message: 'Google does not sign anyone in...' });
    fireEvent.click(screen.getByRole('button', { name: /Sign in in a normal window/ }));
    expect(onAction).toHaveBeenCalledWith('window');
  });

  it('shows how far the fill has got, with Take control', () => {
    const rows = [{ status: 'filled' }, { status: 'you' }, { status: 'kept' }, { status: 'skipped' }];
    const onAction = strip({ state: 'filling', reason: null, message: '', rows });
    expect(screen.getByRole('status')).toHaveTextContent('JobDekho is filling · 2 of 3');
    fireEvent.click(screen.getByRole('button', { name: 'Take control' }));
    expect(onAction).toHaveBeenCalledWith('takeover');
  });

  it('ends on "Review and submit it yourself", and offers Mark as applied once the site confirms', () => {
    strip({ state: 'review', reason: 'review', message: 'JobDekho has not pressed Submit and never will.' });
    expect(screen.getByRole('status')).toHaveTextContent('Review and submit it yourselfJobDekho has not pressed Submit and never will.');
    const onAction = vi.fn();
    render(<ApplyControlStrip view={{ url: '', rows: [], state: 'review', reason: 'submitted', message: 'If it went through, mark this job as applied.' }} onAction={onAction} />);
    fireEvent.click(screen.getByRole('button', { name: 'Mark as applied' }));
    expect(onAction).toHaveBeenCalledWith('applied');
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
