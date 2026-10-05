import { describe, it, expect } from 'vitest';
import { fillFraction, fillSteps, retrying } from './fillSteps.js';

const START = { event: 'start', provider: 'claude', path: 'x' };
const SEND = { event: 'progress', stage: 'send', chars: 1200 };
const WAIT = (ms) => ({ event: 'progress', stage: 'wait', elapsedMs: ms });
const REPLY = { event: 'progress', stage: 'reply', elapsedMs: 21000, chars: 900 };
const states = (steps) => steps.map((step) => step.state);

describe('fillSteps', () => {
  it('starts on handing the resume over, naming the CLI', () => {
    const steps = fillSteps([], { label: 'Claude Code' });
    expect(steps[0]).toEqual({ key: 'send', text: 'Handing to Claude Code', state: 'current' });
    expect(states(steps)).toEqual(['current', 'next', 'next', 'next']);
    expect(states(fillSteps([START], { label: 'Claude Code' }))).toEqual(['current', 'next', 'next', 'next']);
  });

  it('is finding things once the resume is handed over, through every heartbeat', () => {
    const steps = fillSteps([START, SEND, WAIT(5000), WAIT(10000)], { label: 'Claude Code' });
    expect(steps.map((step) => step.text)).toEqual(['Handed to Claude Code', 'Finding roles, projects and skills', 'Comparing with your profile', 'Ready for you to review']);
    expect(states(steps)).toEqual(['done', 'current', 'next', 'next']);
  });

  it('compares once the answer is back, and has every step done at the end', () => {
    expect(states(fillSteps([START, SEND, REPLY]))).toEqual(['done', 'done', 'current', 'next']);
    expect(states(fillSteps([START, SEND, REPLY], { finished: true }))).toEqual(['done', 'done', 'done', 'done']);
  });

  it('takes a heartbeat or a retry as proof the resume went, even with the send missed', () => {
    expect(states(fillSteps([WAIT(5000)]))).toEqual(['done', 'current', 'next', 'next']);
    expect(states(fillSteps([{ event: 'progress', stage: 'retry', attempt: 2 }]))).toEqual(['done', 'current', 'next', 'next']);
  });

  it('says a retry is happening only while it is the latest word', () => {
    expect(retrying([SEND, { event: 'progress', stage: 'retry', attempt: 2 }])).toBe(true);
    expect(retrying([SEND, { event: 'progress', stage: 'retry', attempt: 2 }, WAIT(5000)])).toBe(false);
    expect(retrying([])).toBe(false);
  });
});

describe('fillFraction', () => {
  it('eases towards nine tenths and never reaches it while waiting', () => {
    expect(fillFraction(0)).toBe(0);
    const at = (s) => fillFraction(s * 1000);
    expect(at(10)).toBeLessThan(at(20));
    expect(at(30)).toBeGreaterThan(0.7);
    expect(at(30)).toBeLessThan(0.85);
    expect(at(600)).toBeLessThanOrEqual(0.9);
    expect(fillFraction(-500)).toBe(0);
  });

  it('fills only once the answer is in', () => {
    expect(fillFraction(3000, true)).toBe(1);
  });
});
